/**
 * البحث في منصات التواصل الاجتماعي: TikTok, Snapchat, Telegram
 * سياسة صارمة: لا يُسمح بأي بيانات مولّدة أو وهمية - البيانات الحقيقية فقط
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

// ===== أدوات محاكاة البشر =====

/** تأخير عشوائي يحاكي سلوك البشر */
const humanDelay = (min = 1000, max = 3000) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

/** User-Agent عشوائي من متصفحات حقيقية */
const randomUserAgent = () => {
  const agents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.193 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];
  return agents[Math.floor(Math.random() * agents.length)];
};

/** جلب صفحة مع headers تحاكي المتصفح الحقيقي */
async function fetchLikeHuman(url: string, extraHeaders?: Record<string, string>): Promise<string> {
  await humanDelay(800, 2500);
  const res = await fetch(url, {
    headers: {
      "User-Agent": randomUserAgent(),
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
      "Referer": "https://www.google.com/",
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  // تنظيف HTML
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

/**
 * استخراج بيانات الأعمال من نص حقيقي مجلوب من الصفحة.
 * القاعدة الصارمة: يستخرج فقط ما هو موجود في النص - لا يخترع أي بيانات.
 * إذا لم يجد بيانات كافية يُرجع مصفوفة فارغة.
 */
async function extractBusinessesFromRealText(rawText: string, platform: string, keyword: string) {
  if (!rawText || rawText.length < 50) return [];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `أنت محلل استخباراتي دقيق. مهمتك استخراج بيانات الأعمال التجارية الموجودة فعلاً في النص المُعطى فقط.

قواعد صارمة لا استثناء فيها:
1. استخرج فقط ما هو مذكور صراحةً في النص
2. إذا لم يُذكر رقم الهاتف في النص → اترك phone فارغاً ""
3. إذا لم يُذكر الموقع الإلكتروني في النص → اترك website فارغاً ""
4. إذا لم تجد أي نشاط تجاري واضح → أرجع results: []
5. لا تخترع أي بيانات أو تتخيل أي معلومات
6. لا تُكمل بيانات ناقصة بتخمينات`,
      },
      {
        role: "user",
        content: `استخرج الأنشطة التجارية الموجودة فعلاً في هذا النص من ${platform} (البحث عن "${keyword}"):\n\n${rawText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "social_businesses",
        strict: true,
        schema: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  username: { type: "string" },
                  bio: { type: "string" },
                  followers: { type: "string" },
                  businessType: { type: "string" },
                  phone: { type: "string" },
                  website: { type: "string" },
                  city: { type: "string" },
                  profileUrl: { type: "string" },
                  engagementLevel: { type: "string" },
                },
                required: ["name", "username", "bio", "followers", "businessType", "phone", "website", "city", "profileUrl", "engagementLevel"],
                additionalProperties: false,
              },
            },
          },
          required: ["results"],
          additionalProperties: false,
        },
      },
    },
  });
  try {
    const parsed = JSON.parse(response.choices[0].message.content as string);
    // تنظيف: حذف أي نتيجة تبدو وهمية (username فارغ أو name فارغ)
    const results = (parsed.results || []).filter((r: any) =>
      r.name && r.name.trim() !== "" && r.username && r.username.trim() !== ""
    );
    return results as Array<{
      name: string; username: string; bio: string; followers: string;
      businessType: string; phone: string; website: string; city: string;
      profileUrl: string; engagementLevel: string;
    }>;
  } catch {
    return [];
  }
}

/** توليد هاشتاقات ذكية للبحث (هذه مجرد كلمات بحث وليست بيانات عملاء) */
async function generateSearchHashtags(keyword: string, city: string, platform: string): Promise<string[]> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `أنت خبير في التسويق الرقمي السعودي ومتخصص في منصة ${platform}.
أنشئ قائمة هاشتاقات فعّالة للبحث عن أنشطة تجارية.`,
      },
      {
        role: "user",
        content: `أنشئ 8 هاشتاقات للبحث عن "${keyword}" في "${city}" على منصة ${platform}. أرجع JSON فقط.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "hashtags",
        strict: true,
        schema: {
          type: "object",
          properties: {
            hashtags: { type: "array", items: { type: "string" } },
          },
          required: ["hashtags"],
          additionalProperties: false,
        },
      },
    },
  });
  try {
    const parsed = JSON.parse(response.choices[0].message.content as string);
    return parsed.hashtags || [];
  } catch {
    return [`${keyword}_${city}`, `${keyword}السعودية`, `${city}`, `${keyword}`];
  }
}

// ===== TikTok Search =====
async function searchTikTok(keyword: string, city: string): Promise<any[]> {
  const hashtag = keyword.replace(/\s+/g, "") + city.replace(/\s+/g, "");
  const urls = [
    `https://www.tiktok.com/search?q=${encodeURIComponent(keyword + " " + city)}`,
    `https://www.tiktok.com/tag/${encodeURIComponent(hashtag)}`,
  ];

  let combinedText = "";
  for (const url of urls) {
    try {
      const text = await fetchLikeHuman(url, {
        "Referer": "https://www.tiktok.com/",
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
      });
      combinedText += " " + text;
      await humanDelay(1500, 3000);
    } catch {
      // تجاهل الأخطاء والمتابعة
    }
  }

  // إذا لم يُجلب نص كافٍ → لا نتائج (لا بيانات وهمية)
  if (combinedText.trim().length < 100) {
    return [];
  }

  return extractBusinessesFromRealText(combinedText, "TikTok", keyword + " " + city);
}

// ===== Snapchat Search =====
async function searchSnapchat(keyword: string, city: string): Promise<any[]> {
  const urls = [
    `https://www.snapchat.com/search?q=${encodeURIComponent(keyword)}`,
    `https://story.snapchat.com/search?q=${encodeURIComponent(keyword + " " + city)}`,
  ];

  let combinedText = "";
  for (const url of urls) {
    try {
      const text = await fetchLikeHuman(url, {
        "Referer": "https://www.snapchat.com/",
      });
      combinedText += " " + text;
      await humanDelay(1200, 2500);
    } catch {
      // تجاهل
    }
  }

  // إذا لم يُجلب نص كافٍ → لا نتائج (لا بيانات وهمية)
  if (combinedText.trim().length < 100) {
    return [];
  }

  return extractBusinessesFromRealText(combinedText, "Snapchat", keyword + " " + city);
}

// ===== Telegram Search =====
async function searchTelegram(keyword: string, city: string): Promise<any[]> {
  const queries = [
    `${keyword} ${city}`,
    `${keyword} السعودية`,
    `${keyword}`,
  ];

  let combinedText = "";
  for (const q of queries) {
    try {
      const url = `https://t.me/s/${encodeURIComponent(q.replace(/\s+/g, ""))}`;
      const text = await fetchLikeHuman(url, {
        "Referer": "https://t.me/",
      });
      combinedText += " " + text;
      await humanDelay(1000, 2000);
    } catch {
      // تجاهل
    }
  }

  // بحث إضافي في tgstat (دليل قنوات تيليجرام)
  try {
    const tgstatUrl = `https://tgstat.com/search?q=${encodeURIComponent(keyword + " " + city)}&type=channel`;
    const text = await fetchLikeHuman(tgstatUrl, {
      "Referer": "https://tgstat.com/",
    });
    combinedText += " " + text;
  } catch {
    // تجاهل
  }

  // إذا لم يُجلب نص كافٍ → لا نتائج (لا بيانات وهمية)
  if (combinedText.trim().length < 100) {
    return [];
  }

  return extractBusinessesFromRealText(combinedText, "Telegram", keyword + " " + city);
}

// ===== Router =====
export const socialSearchRouter = router({
  /** البحث في TikTok */
  searchTikTok: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = await searchTikTok(input.keyword, input.city);
        return { results, platform: "TikTok", total: results.length };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** البحث في Snapchat */
  searchSnapchat: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = await searchSnapchat(input.keyword, input.city);
        return { results, platform: "Snapchat", total: results.length };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** البحث في Telegram */
  searchTelegram: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = await searchTelegram(input.keyword, input.city);
        return { results, platform: "Telegram", total: results.length };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** بحث شامل في جميع المنصات دفعة واحدة */
  searchAllPlatforms: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      platforms: z.array(z.enum(["tiktok", "snapchat", "telegram"])).default(["tiktok", "snapchat", "telegram"]),
    }))
    .mutation(async ({ input }) => {
      const promises: Promise<{ platform: string; results: any[] }>[] = [];

      if (input.platforms.includes("tiktok")) {
        promises.push(
          searchTikTok(input.keyword, input.city)
            .then(r => ({ platform: "TikTok", results: r }))
            .catch(() => ({ platform: "TikTok", results: [] }))
        );
      }
      if (input.platforms.includes("snapchat")) {
        promises.push(
          searchSnapchat(input.keyword, input.city)
            .then(r => ({ platform: "Snapchat", results: r }))
            .catch(() => ({ platform: "Snapchat", results: [] }))
        );
      }
      if (input.platforms.includes("telegram")) {
        promises.push(
          searchTelegram(input.keyword, input.city)
            .then(r => ({ platform: "Telegram", results: r }))
            .catch(() => ({ platform: "Telegram", results: [] }))
        );
      }

      const allResults = await Promise.allSettled(promises);
      const combined: any[] = [];

      for (const result of allResults) {
        if (result.status === "fulfilled") {
          const { platform, results } = result.value;
          combined.push(...results.map((r: any) => ({ ...r, source: platform })));
        }
      }

      return { results: combined, total: combined.length };
    }),

  /** اقتراح هاشتاقات ذكية للبحث */
  suggestSocialHashtags: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      platform: z.enum(["tiktok", "snapchat", "telegram", "all"]).default("all"),
    }))
    .mutation(async ({ input }) => {
      const platform = input.platform === "all" ? "TikTok وSnapchat وTelegram" : input.platform;
      const hashtags = await generateSearchHashtags(input.keyword, input.city, platform);
      return { hashtags };
    }),

  /** تحليل حساب تجاري من رابط مباشر */
  analyzeProfile: protectedProcedure
    .input(z.object({
      profileUrl: z.string().url(),
      platform: z.enum(["tiktok", "snapchat", "telegram"]),
    }))
    .mutation(async ({ input }) => {
      let pageText = "";
      try {
        pageText = await fetchLikeHuman(input.profileUrl);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذّر الوصول للحساب" });
      }

      if (!pageText || pageText.length < 50) {
        throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على بيانات كافية لهذا الحساب" });
      }

      const platformName = { tiktok: "TikTok", snapchat: "Snapchat", telegram: "Telegram" }[input.platform];

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت محلل أعمال متخصص في السوق السعودي. حلّل هذا الحساب على منصة ${platformName}.
قاعدة صارمة: استخرج فقط ما هو موجود في النص. لا تخترع أي بيانات. إذا لم يُذكر الهاتف اتركه فارغاً.`,
          },
          {
            role: "user",
            content: `حلّل هذا الحساب على ${platformName}:\n\n${pageText.slice(0, 5000)}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "profile_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                username: { type: "string" },
                bio: { type: "string" },
                followers: { type: "string" },
                businessType: { type: "string" },
                phone: { type: "string" },
                website: { type: "string" },
                city: { type: "string" },
                engagementLevel: { type: "string" },
                commercialScore: { type: "string" },
                recommendation: { type: "string" },
              },
              required: ["name", "username", "bio", "followers", "businessType", "phone", "website", "city", "engagementLevel", "commercialScore", "recommendation"],
              additionalProperties: false,
            },
          },
        },
      });

      try {
        return JSON.parse(response.choices[0].message.content as string);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل تحليل الحساب" });
      }
    }),
});
