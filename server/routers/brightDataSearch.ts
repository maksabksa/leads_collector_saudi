import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import puppeteer from "puppeteer-core";
import { invokeLLM } from "../_core/llm";
import { searchInstagramSERP, searchTikTokSERP, searchSnapchatSERP, searchLinkedInSERP, serpRequest, parseGoogleResultsPublic } from "./serpSearch";

// ─── Bright Data Browser API Helper ───────────────────────────────────────────
const BRIGHT_DATA_WS_ENDPOINT = process.env.BRIGHT_DATA_WS_ENDPOINT || "";

function getBrightDataEndpoint(): string {
  if (BRIGHT_DATA_WS_ENDPOINT) return BRIGHT_DATA_WS_ENDPOINT;
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: "Bright Data غير مضبوط. يرجى إضافة BRIGHT_DATA_WS_ENDPOINT في الإعدادات.",
  });
}

// فتح متصفح Bright Data
async function openBrightDataBrowser() {
  const endpoint = getBrightDataEndpoint();
  const browser = await puppeteer.connect({
    browserWSEndpoint: endpoint,
  });
  return browser;
}

// helper: sleep بدلاً من waitForTimeout (deprecated في puppeteer v24)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── تحليل النتائج بالذكاء الاصطناعي ─────────────────────────────────────────
async function analyzeResultsWithAI(
  results: any[],
  query: string,
  platform: string
): Promise<any[]> {
  if (!results.length) return results;
  try {
    const prompt = `أنت محلل بيانات للسوق السعودي. قيّم هذه النتائج من ${platform} للبحث عن "${query}".
لكل نتيجة، أضف:
1. relevanceScore: درجة الملاءمة من 1-10
2. businessType: نوع النشاط التجاري بالعربية
3. priority: "عالية" أو "متوسطة" أو "منخفضة"
4. contactSuggestion: اقتراح طريقة التواصل المثلى

البيانات:
${JSON.stringify(results.slice(0, 10), null, 2)}

أرجع JSON object بالشكل: {"results": [...]} مع نفس العناصر مضافاً إليها الحقول المطلوبة.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "أنت محلل بيانات متخصص في السوق السعودي. أرجع JSON فقط." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" } as any,
    });

    const content = response?.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");
      if (Array.isArray(parsed)) return parsed;
      if (parsed.results && Array.isArray(parsed.results)) return parsed.results;
    }
  } catch {
    // إذا فشل التحليل، نرجع النتائج الأصلية
  }
  return results;
}

// ─── بحث Instagram (SERP API) ─────────────────────────────────────────────────
async function scrapeInstagram(query: string, location: string): Promise<any[]> {
  // استخدام SERP API بدلاً من Puppeteer المباشر (محظور على Instagram)
  try {
    const serpResults = await searchInstagramSERP(query, location);
    return serpResults.map(r => ({
      platform: "instagram",
      username: r.username,
      name: r.displayName,
      profileUrl: r.profileUrl,
      bio: r.description,
      website: "",
      phone: r.phone || "",
      dataSource: "serp",
    }));
  } catch (err) {
    console.warn("[Instagram SERP] failed:", err);
    return [];
  }
}

// ─── بحث TikTok (SERP API) ─────────────────────────────────────────────────────
async function scrapeTikTok(query: string, location: string): Promise<any[]> {
  // استخدام SERP API بدلاً من Puppeteer المباشر (محظور على TikTok)
  try {
    const serpResults = await searchTikTokSERP(query, location);
    return serpResults.map(r => ({
      platform: "tiktok",
      username: r.username,
      displayName: r.displayName,
      profileUrl: r.profileUrl,
      bio: r.description,
      followers: r.followers,
      phone: r.phone || "",
      dataSource: "serp",
    }));
  } catch (err) {
    console.warn("[TikTok SERP] failed:", err);
    return [];
  }
}

// ─── بحث Twitter/X (عبر SERP API - بدلاً من Puppeteer المحظور) ─────────────────
async function scrapeTwitter(query: string, location: string): Promise<any[]> {
  // Twitter يحظر Puppeteer بشكل صارم - نستخدم SERP API للبحث في Google عن حسابات Twitter
  const queries = [
    `${query} ${location} site:twitter.com OR site:x.com`,
    `${query} ${location} twitter`,
    `${query} site:x.com`,
  ];

  const results: any[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa`;
      const html = await serpRequest(googleUrl);
      const googleResults = parseGoogleResultsPublic(html, "twitter.com");

      for (const item of googleResults) {
        // استخراج username من URL
        const usernameMatch = item.link.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)(?:\/|$)/);
        if (!usernameMatch) continue;
        const username = usernameMatch[1];
        // تجاهل صفحات عامة
        if (["search", "explore", "home", "i", "hashtag", "intent"].includes(username)) continue;
        if (seen.has(username)) continue;
        seen.add(username);

        const phones = (item.snippet + " " + item.title).match(/(?:\+966|00966|0)(?:5[0-9]{8}|[1-9][0-9]{7})/g) || [];

        results.push({
          platform: "twitter",
          username,
          displayName: item.title
            .replace(/ on X$/, "")
            .replace(/ \(@[^)]+\)/, "")
            .replace(/ \| Twitter$/, "")
            .trim(),
          profileUrl: `https://x.com/${username}`,
          bio: item.snippet?.substring(0, 200) || "",
          phone: phones[0] || "",
          dataSource: "serp",
        });
      }
    } catch (err) {
      console.warn(`[Twitter SERP] query failed: ${q}`, err);
    }
    if (results.length >= 15) break;
  }

  return results.slice(0, 20);
}

// ─── بحث LinkedIn (عبر SERP API) ───────────────────────────────────
async function scrapeLinkedIn(query: string, location: string): Promise<any[]> {
  // استخدام SERP API بدلاً من Puppeteer (لينكدإن يحتاج تسجيل دخول)
  try {
    const serpResults = await searchLinkedInSERP(query, location);
    return serpResults.map(r => ({
      platform: "linkedin",
      name: r.name,
      displayName: r.name,
      profileUrl: r.profileUrl,
      bio: r.description?.substring(0, 200),
      description: r.description?.substring(0, 200),
      subtitle: r.industry || r.type,
      phone: r.phone || "",
      id: r.id,
      type: r.type,
      dataSource: "serp",
    }));
  } catch (e) {
    console.error("[LinkedIn SERP] Error:", e);
    return [];
  }
}

// ─── بحث Snapchat ──────────────────────────────────────────────────────────────
async function scrapeSnapchat(query: string, location: string): Promise<any[]> {
  // استخدام SERP API بدلاً من Puppeteer المباشر (محظور على Snapchat)
  try {
    const serpResults = await searchSnapchatSERP(query, location);
    return serpResults.map(r => ({
      platform: "snapchat",
      username: r.username,
      displayName: r.displayName,
      profileUrl: r.profileUrl,
      bio: r.description,
      followers: r.subscribers,
      phone: r.phone || "",
      dataSource: "serp",
    }));
  } catch (err) {
    console.warn("[Snapchat SERP] failed:", err);
    return [];
  }
}
// ─── بحث Google Search (عبر SERP API - بدلاً من Puppeteer البطيء) ──────────────
async function scrapeGoogleSearch(query: string, location: string): Promise<any[]> {
  // استخدام SERP API مباشرة بدلاً من Puppeteer لتجنب timeout
  const searchQuery = location ? `${query} ${location}` : query;
  // استعلامات متعددة لتوسيع النتائج
  const queries = [
    searchQuery,
    `${query} ${location} أعمال`,
    `${query} ${location} للتواصل`,
  ];

  const results: any[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    try {
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa`;
      const html = await serpRequest(googleUrl);
      const googleResults = parseGoogleResultsPublic(html, ""); // بدون تصفية domain

      for (const item of googleResults) {
        if (seen.has(item.link)) continue;
        seen.add(item.link);

        const phones = (item.snippet + " " + item.title).match(/(?:\+966|00966|0)(?:5[0-9]{8}|[1-9][0-9]{7})/g) || [];

        results.push({
          platform: "google",
          displayName: item.title,
          profileUrl: item.link,
          bio: item.snippet?.substring(0, 300) || "",
          phone: phones[0] || "",
          website: item.link,
          dataSource: "serp",
        });
      }
    } catch (err) {
      console.warn(`[Google SERP] query failed: ${q}`, err);
    }
    if (results.length >= 30) break;
  }

  return results.slice(0, 30);
}

// ─── tRPC Router ───────────────────────────────────────────────────────────────
export const brightDataSearchRouter = router({
  // فحص حالة الربط
  checkConnection: protectedProcedure.query(async () => {
    const hasKey = !!BRIGHT_DATA_WS_ENDPOINT;
    return {
      connected: hasKey,
      message: hasKey
        ? "Bright Data متصل وجاهز للاستخدام"
        : "يرجى إضافة BRIGHT_DATA_WS_ENDPOINT في الإعدادات",
    };
  }),

  // بحث في منصة واحدة
  searchPlatform: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["instagram", "tiktok", "twitter", "linkedin", "snapchat", "google"]),
        query: z.string().min(1),
        location: z.string().default(""),
        analyzeWithAI: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      let results: any[] = [];

      try {
        switch (input.platform) {
          case "instagram":
            results = await scrapeInstagram(input.query, input.location);
            break;
          case "tiktok":
            results = await scrapeTikTok(input.query, input.location);
            break;
          case "twitter":
            results = await scrapeTwitter(input.query, input.location);
            break;
          case "linkedin":
            results = await scrapeLinkedIn(input.query, input.location);
            break;
          case "snapchat":
            results = await scrapeSnapchat(input.query, input.location);
            break;
          case "google":
            results = await scrapeGoogleSearch(input.query, input.location);
            break;
        }
      } catch (e: any) {
        const msg = e?.message || "";
        // كشف أخطاء رصيد Bright Data
        if (
          msg.includes("402") ||
          msg.includes("payment") ||
          msg.includes("quota") ||
          msg.includes("insufficient") ||
          msg.includes("balance") ||
          msg.includes("credit") ||
          msg.includes("ERR_TUNNEL_CONNECTION_FAILED") ||
          msg.includes("407") ||
          msg.includes("Proxy Authentication Required") ||
          msg.includes("net::ERR_PROXY")
        ) {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: "رصيد Bright Data غير كافٍ. يرجى شحن حسابك على brightdata.com لمتابعة البحث.",
          });
        }
        if (
          msg.includes("403") ||
          msg.includes("blocked") ||
          msg.includes("captcha") ||
          msg.includes("CAPTCHA")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `المنصة حجبت الوصول مؤقتًا. حاول مرة أخرى بعد دقيقة.`,
          });
        }
        if (msg.includes("timeout") || msg.includes("Timeout")) {
          throw new TRPCError({
            code: "TIMEOUT",
            message: `انتهت مهلة البحث. تأكد من اتصال Bright Data وحاول مرة أخرى.`,
          });
        }
        // خطأ عام
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `خطأ في البحث: ${msg}`,
        });
      }

      if (input.analyzeWithAI && results.length > 0) {
        results = await analyzeResultsWithAI(results, input.query, input.platform);
      }

      return { results, count: results.length, platform: input.platform };
    }),

  // بحث شامل في كل المنصات
  searchAll: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        location: z.string().default(""),
        platforms: z
          .array(z.enum(["instagram", "tiktok", "twitter", "linkedin", "snapchat", "google"]))
          .default(["instagram", "tiktok", "twitter", "linkedin", "snapchat", "google"]),
      })
    )
    .mutation(async ({ input }) => {
      const allResults: Record<string, any[]> = {};
      const errors: Record<string, string> = {};

      // البحث في المنصات بالتوازي (3 في نفس الوقت كحد أقصى)
      for (let i = 0; i < input.platforms.length; i += 3) {
        const chunk = input.platforms.slice(i, i + 3);
        await Promise.all(
          chunk.map(async (platform) => {
            try {
              let results: any[] = [];
              switch (platform) {
                case "instagram":
                  results = await scrapeInstagram(input.query, input.location);
                  break;
                case "tiktok":
                  results = await scrapeTikTok(input.query, input.location);
                  break;
                case "twitter":
                  results = await scrapeTwitter(input.query, input.location);
                  break;
                case "linkedin":
                  results = await scrapeLinkedIn(input.query, input.location);
                  break;
                case "snapchat":
                  results = await scrapeSnapchat(input.query, input.location);
                  break;
                case "google":
                  results = await scrapeGoogleSearch(input.query, input.location);
                  break;
              }
              allResults[platform] = results;
            } catch (e: any) {
              errors[platform] = e.message || "خطأ غير معروف";
              allResults[platform] = [];
            }
          })
        );
      }

      const combined = Object.values(allResults).flat();
      const analyzed =
        combined.length > 0
          ? await analyzeResultsWithAI(combined, input.query, "جميع المنصات")
          : [];

      return {
        byPlatform: allResults,
        combined: analyzed,
        totalCount: combined.length,
        errors,
      };
    }),
});
