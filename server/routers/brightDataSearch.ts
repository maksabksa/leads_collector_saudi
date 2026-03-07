import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import puppeteer from "puppeteer-core";
import { invokeLLM } from "../_core/llm";
import { searchInstagramSERP, searchTikTokSERP, searchSnapchatSERP } from "./serpSearch";

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

// ─── بحث Twitter/X ─────────────────────────────────────────────────────────────
async function scrapeTwitter(query: string, location: string): Promise<any[]> {
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    const searchQuery = location ? `${query} ${location}` : query;
    await page.goto(
      `https://twitter.com/search?q=${encodeURIComponent(searchQuery)}&f=user`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );
    await sleep(4000);

    const users = await page.evaluate(() => {
      const items: any[] = [];
      document.querySelectorAll('[data-testid="UserCell"]').forEach((cell, i) => {
        if (i >= 15) return;
        const username =
          (cell.querySelector('[data-testid="UserName"] span') as HTMLElement)
            ?.textContent || "";
        const handle =
          (cell.querySelector('[data-testid="UserName"] span:last-child') as HTMLElement)
            ?.textContent || "";
        const bio =
          (cell.querySelector('[data-testid="UserDescription"]') as HTMLElement)
            ?.textContent || "";
        const followers =
          (cell.querySelector('[data-testid="UserFollowers"]') as HTMLElement)
            ?.textContent || "";
        const avatar =
          (cell.querySelector('img[src*="profile_images"]') as HTMLImageElement)?.src || "";
        const verified = !!cell.querySelector('[data-testid="icon-verified"]');
        const website =
          (cell.querySelector('[data-testid="UserUrl"] a') as HTMLAnchorElement)?.href || "";
        const phone = bio?.match(/(?:\+966|05|009665)\d{8,9}/)?.[0] || "";
        if (username) items.push({ username, handle, bio, followers, avatar, verified, website, phone });
      });
      return items;
    });

    for (const user of users) {
      results.push({
        platform: "twitter",
        username: user.handle?.replace("@", "") || user.username,
        displayName: user.username,
        profileUrl: `https://twitter.com/${user.handle?.replace("@", "") || user.username}`,
        bio: user.bio?.substring(0, 200),
        followers: user.followers,
        verified: user.verified,
        website: user.website,
        phone: user.phone,
        thumbnail: user.avatar,
      });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
}

// ─── بحث LinkedIn ──────────────────────────────────────────────────────────────
async function scrapeLinkedIn(query: string, location: string): Promise<any[]> {
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    const searchQuery = location ? `${query} ${location}` : query;
    await page.goto(
      `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchQuery)}`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );
    await sleep(4000);

    const companies = await page.evaluate(() => {
      const items: any[] = [];
      document
        .querySelectorAll(".entity-result__item, .search-result__wrapper")
        .forEach((card, i) => {
          if (i >= 15) return;
          const name =
            (card.querySelector(".entity-result__title-text a") as HTMLElement)
              ?.textContent?.trim() || "";
          const url =
            (card.querySelector(".entity-result__title-text a") as HTMLAnchorElement)
              ?.href || "";
          const subtitle =
            (card.querySelector(".entity-result__primary-subtitle") as HTMLElement)
              ?.textContent?.trim() || "";
          const description =
            (card.querySelector(".entity-result__summary") as HTMLElement)
              ?.textContent?.trim() || "";
          const logo =
            (card.querySelector("img.EntityPhoto-circle") as HTMLImageElement)?.src || "";
          if (name) items.push({ name, url, subtitle, description, logo });
        });
      return items;
    });

    for (const company of companies) {
      results.push({
        platform: "linkedin",
        displayName: company.name,
        profileUrl: company.url,
        bio: company.description?.substring(0, 200),
        subtitle: company.subtitle,
        thumbnail: company.logo,
      });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
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
// ─── بحث Google Search
// ─── بحث Google Search ─────────────────────────────────────────────────────────
async function scrapeGoogleSearch(query: string, location: string): Promise<any[]> {
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    const searchQuery = location ? `${query} ${location}` : query;
    await page.goto(
      `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&gl=sa&hl=ar&num=20`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );
    await sleep(2000);

    const searchResults = await page.evaluate(() => {
      const items: any[] = [];
      document.querySelectorAll("div.g, div[data-hveid]").forEach((div, i) => {
        if (i >= 20) return;
        const titleEl = div.querySelector("h3");
        const linkEl = div.querySelector("a") as HTMLAnchorElement | null;
        const snippetEl = div.querySelector("div.VwiC3b, span.st");
        if (!titleEl || !linkEl) return;
        const title = titleEl.textContent?.trim() || "";
        const url = linkEl.getAttribute("href") || "";
        const snippet = snippetEl?.textContent?.trim() || "";
        const phone = snippet.match(/(?:\+966|05|009665)\d{8,9}/)?.[0] || "";
        if (title && url && !url.includes("google.com")) {
          items.push({ title, url, snippet, phone });
        }
      });
      return items;
    });

    for (const result of searchResults) {
      results.push({
        platform: "google",
        displayName: result.title,
        profileUrl: result.url,
        bio: result.snippet?.substring(0, 300),
        phone: result.phone,
        website: result.url,
      });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
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
