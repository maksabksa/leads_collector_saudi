import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import puppeteer from "puppeteer-core";
import { invokeLLM } from "../_core/llm";

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

// ─── بحث Instagram ─────────────────────────────────────────────────────────────
async function scrapeInstagram(query: string, location: string): Promise<any[]> {
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
    );

    const hashtag = encodeURIComponent(query.replace(/\s+/g, ""));
    await page.goto(`https://www.instagram.com/explore/tags/${hashtag}/`, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await sleep(3000);

    const posts = await page.evaluate(() => {
      const items: { url: string; thumbnail: string }[] = [];
      document.querySelectorAll("article a, div[role='button'] a").forEach((el, i) => {
        if (i >= 20) return;
        const a = el as HTMLAnchorElement;
        const img = a.querySelector("img") as HTMLImageElement | null;
        if (a.href) items.push({ url: a.href, thumbnail: img?.src || "" });
      });
      return items;
    });

    for (const post of posts.slice(0, 8)) {
      try {
        if (!post.url) continue;
        await page.goto(post.url, { waitUntil: "networkidle2", timeout: 20000 });
        await sleep(2000);

        const detail = await page.evaluate(() => {
          const username =
            (document.querySelector("header a") as HTMLElement)?.textContent?.trim() || "";
          const bio =
            (document.querySelector("div.-vDIg span") as HTMLElement)?.textContent?.trim() ||
            (document.querySelector("div[data-testid='user-description']") as HTMLElement)
              ?.textContent?.trim() ||
            "";
          const website =
            (document.querySelector("a[rel='me noopener noreferrer']") as HTMLAnchorElement)
              ?.href || "";
          const phone = bio.match(/(?:\+966|05|009665)\d{8,9}/)?.[0] || "";
          return { username, bio, website, phone };
        });

        if (detail.username) {
          results.push({
            platform: "instagram",
            username: detail.username,
            profileUrl: `https://www.instagram.com/${detail.username}/`,
            bio: detail.bio?.substring(0, 200),
            website: detail.website,
            phone: detail.phone,
            thumbnail: post.thumbnail,
          });
        }
      } catch {
        // تجاهل أخطاء المنشورات الفردية
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
}

// ─── بحث TikTok ────────────────────────────────────────────────────────────────
async function scrapeTikTok(query: string, location: string): Promise<any[]> {
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    const searchQuery = location ? `${query} ${location}` : query;
    await page.goto(
      `https://www.tiktok.com/search/user?q=${encodeURIComponent(searchQuery)}`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );
    await sleep(4000);

    const users = await page.evaluate(() => {
      const items: any[] = [];
      document
        .querySelectorAll("[data-e2e='search-user-container']")
        .forEach((card, i) => {
          if (i >= 15) return;
          const username =
            (card.querySelector("[data-e2e='search-user-unique-id']") as HTMLElement)
              ?.textContent || "";
          const nickname =
            (card.querySelector("[data-e2e='search-user-name']") as HTMLElement)
              ?.textContent || "";
          const followers =
            (card.querySelector("[data-e2e='search-user-fans-count']") as HTMLElement)
              ?.textContent || "";
          const avatar =
            (card.querySelector("img[data-e2e='search-user-avatar']") as HTMLImageElement)
              ?.src || "";
          const bio =
            (card.querySelector("[data-e2e='search-user-desc']") as HTMLElement)
              ?.textContent || "";
          if (username) items.push({ username, nickname, followers, avatar, bio });
        });
      return items;
    });

    for (const user of users) {
      const phone = user.bio?.match(/(?:\+966|05|009665)\d{8,9}/)?.[0] || "";
      results.push({
        platform: "tiktok",
        username: user.username,
        displayName: user.nickname,
        profileUrl: `https://www.tiktok.com/@${user.username}`,
        bio: user.bio?.substring(0, 200),
        followers: user.followers,
        phone,
        thumbnail: user.avatar,
      });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
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
  const browser = await openBrightDataBrowser();
  const results: any[] = [];
  try {
    const page = await browser.newPage();
    const searchQuery = location ? `${query} ${location}` : query;
    await page.goto(
      `https://www.snapchat.com/search?q=${encodeURIComponent(searchQuery)}`,
      { waitUntil: "networkidle2", timeout: 30000 }
    );
    await sleep(4000);

    const users = await page.evaluate(() => {
      const items: any[] = [];
      document
        .querySelectorAll("[data-testid='SearchResult'], .PublicProfileCard")
        .forEach((card, i) => {
          if (i >= 15) return;
          const username =
            (card.querySelector("[data-testid='username'], .username") as HTMLElement)
              ?.textContent?.trim() || "";
          const displayName =
            (card.querySelector("[data-testid='display-name'], .display-name") as HTMLElement)
              ?.textContent?.trim() || "";
          const bio =
            (card.querySelector("[data-testid='bio'], .bio") as HTMLElement)
              ?.textContent?.trim() || "";
          const avatar =
            (card.querySelector("img[data-testid='avatar']") as HTMLImageElement)?.src || "";
          const subscribers =
            (card.querySelector("[data-testid='subscribers']") as HTMLElement)
              ?.textContent?.trim() || "";
          if (username || displayName) items.push({ username, displayName, bio, avatar, subscribers });
        });
      return items;
    });

    for (const user of users) {
      const phone = user.bio?.match(/(?:\+966|05|009665)\d{8,9}/)?.[0] || "";
      results.push({
        platform: "snapchat",
        username: user.username,
        displayName: user.displayName,
        profileUrl: user.username ? `https://www.snapchat.com/add/${user.username}` : "",
        bio: user.bio?.substring(0, 200),
        followers: user.subscribers,
        phone,
        thumbnail: user.avatar,
      });
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return results;
}

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
