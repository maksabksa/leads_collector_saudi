/**
 * Bright Data Dataset API - واجهة موحدة لجمع بيانات المنصات الاجتماعية
 *
 * يستخدم Bright Data Web Scraper API (Dataset API) لجمع بيانات حقيقية من:
 * - TikTok: بحث بـ keyword عبر search URL + discover URL
 * - Instagram: جلب posts بـ URL مباشر
 * - LinkedIn: بحث عبر Google Custom Search API
 * - Snapchat: بحث عبر Google Custom Search API
 *
 * ===== سياسة البيانات الصارمة =====
 * 1. لا يُسمح بأي بيانات مولّدة أو وهمية تحت أي ظرف
 * 2. رقم الهاتف: يُستخرج بـ regex من النص الخام فقط
 * 3. إذا لم تُجلب بيانات كافية → مصفوفة فارغة
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

// ===== إعدادات Bright Data Dataset API =====
const BRIGHT_DATA_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";
const BD_API_BASE = "https://api.brightdata.com/datasets/v3";

// Dataset IDs الرسمية
const DATASET_IDS = {
  TIKTOK_POSTS: "gd_lu702nij2f790tmv9h",       // TikTok Posts by URL
  INSTAGRAM_POSTS: "gd_lyclm20il4r5helnj",      // Instagram Posts by URL
};

// Google Custom Search API
const GOOGLE_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || "";
const GOOGLE_CSE_ID = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || "";

// ===== أنماط استخراج البيانات =====
const PHONE_REGEX = /(?:\+966|00966|0)(?:5[0-9]{8}|[1-9][0-9]{7})/g;

function extractPhones(text: string): string[] {
  const matches = text.match(PHONE_REGEX) || [];
  return Array.from(new Set(matches.map(p => {
    const d = p.replace(/\D/g, "");
    if (d.startsWith("966")) return "+966" + d.slice(3);
    if (d.startsWith("00966")) return "+966" + d.slice(5);
    if (d.startsWith("05")) return "+966" + d.slice(1);
    return p;
  }))).filter(p => p.length >= 12 && p.length <= 14);
}

// ===== Bright Data Dataset API helpers =====

/** تشغيل dataset job وانتظار النتيجة */
async function triggerAndWait(
  datasetId: string,
  inputs: object[],
  maxWaitMs = 90000
): Promise<any[]> {
  if (!BRIGHT_DATA_API_TOKEN) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "BRIGHT_DATA_API_TOKEN غير مضبوط",
    });
  }

  // 1. تشغيل الـ job
  const triggerRes = await fetch(
    `${BD_API_BASE}/trigger?dataset_id=${datasetId}&include_errors=true&format=json`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputs),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!triggerRes.ok) {
    const errText = await triggerRes.text();
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Bright Data trigger error: ${errText.substring(0, 200)}`,
    });
  }

  const { snapshot_id } = await triggerRes.json();
  if (!snapshot_id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "لم يُرجع snapshot_id" });

  // 2. انتظار النتيجة بـ polling
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollInterval));

    const snapshotRes = await fetch(
      `${BD_API_BASE}/snapshot/${snapshot_id}?format=json`,
      {
        headers: { Authorization: `Bearer ${BRIGHT_DATA_API_TOKEN}` },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (snapshotRes.status === 202) continue; // لا يزال قيد المعالجة

    if (snapshotRes.ok) {
      const data = await snapshotRes.json();
      if (Array.isArray(data)) return data.filter(item => !item.error);
      return [];
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Snapshot error: ${snapshotRes.status}`,
    });
  }

  throw new TRPCError({ code: "TIMEOUT", message: "انتهت مهلة جلب البيانات من Bright Data" });
}

// ===== Google Custom Search helpers =====

/** البحث في منصة محددة عبر Google Custom Search */
async function googleSearchPlatform(
  keyword: string,
  platform: "tiktok" | "instagram" | "snapchat" | "linkedin",
  city: string,
  count = 10
): Promise<Array<{
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}>> {
  if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) return [];

  const siteMap = {
    tiktok: "site:tiktok.com",
    instagram: "site:instagram.com",
    snapchat: "site:snapchat.com",
    linkedin: "site:linkedin.com",
  };

  const query = `${keyword} ${city} ${siteMap[platform]}`;
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}&num=${Math.min(count, 10)}&lr=lang_ar&gl=sa`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => ({
      title: item.title || "",
      link: item.link || "",
      snippet: item.snippet || "",
      displayLink: item.displayLink || "",
    }));
  } catch {
    return [];
  }
}

// ===== TikTok Search =====

export interface TikTokResult {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  followers?: number;
  likes?: number;
  videoCount?: number;
  phone: string;
  website?: string;
  isVerified?: boolean;
  dataSource: "brightdata" | "google";
}

/** بحث TikTok عبر Bright Data Dataset API + Google fallback */
export async function searchTikTokDataset(keyword: string, city: string): Promise<TikTokResult[]> {
  const results: TikTokResult[] = [];

  // محاولة 1: Bright Data Dataset API عبر TikTok Discover URL
  if (BRIGHT_DATA_API_TOKEN) {
    try {
      const searchQuery = encodeURIComponent(`${keyword} ${city}`);
      const discoverUrl = `https://www.tiktok.com/discover/${encodeURIComponent(keyword)}-${encodeURIComponent(city)}`;
      const searchUrl = `https://www.tiktok.com/search/video?q=${searchQuery}`;

      const rawData = await triggerAndWait(DATASET_IDS.TIKTOK_POSTS, [
        { url: discoverUrl },
        { url: searchUrl },
      ], 90000);

      for (const item of rawData) {
        if (!item || item.error) continue;
        const username = item.author_username || item.author?.username || item.username || "";
        if (!username) continue;

        const phones = extractPhones(
          [item.description || "", item.bio || "", item.author_bio || ""].join(" ")
        );

        results.push({
          id: item.video_id || item.id || `tt-${username}-${Date.now()}`,
          username,
          displayName: item.author_name || item.author?.display_name || username,
          description: item.description || item.bio || "",
          profileUrl: `https://www.tiktok.com/@${username}`,
          followers: item.author_followers || item.followers_count,
          likes: item.likes_count || item.digg_count,
          videoCount: item.video_count,
          phone: phones[0] || "",
          website: item.author_website || item.website || "",
          isVerified: item.author_verified || false,
          dataSource: "brightdata",
        });
      }
    } catch (err: any) {
      // fallback إلى Google
      console.error("TikTok Bright Data error:", err.message);
    }
  }

  // محاولة 2: Google Custom Search كـ fallback
  if (results.length === 0) {
    const googleResults = await googleSearchPlatform(keyword, "tiktok", city, 10);
    for (const item of googleResults) {
      const usernameMatch = item.link.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
      if (!usernameMatch) continue;
      const username = usernameMatch[1];
      const phones = extractPhones(item.snippet);

      results.push({
        id: `tt-google-${username}`,
        username,
        displayName: item.title.replace(" | TikTok", "").replace(" - TikTok", ""),
        description: item.snippet,
        profileUrl: `https://www.tiktok.com/@${username}`,
        phone: phones[0] || "",
        dataSource: "google",
      });
    }
  }

  // إزالة التكرارات
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.username)) return false;
    seen.add(r.username);
    return true;
  });
}

// ===== Instagram Search =====

export interface InstagramResult {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  followers?: number;
  following?: number;
  postsCount?: number;
  phone: string;
  website?: string;
  isVerified?: boolean;
  isBusinessAccount?: boolean;
  businessCategory?: string;
  dataSource: "brightdata" | "google";
}

/** بحث Instagram عبر Google Custom Search (الأكثر موثوقية) */
export async function searchInstagramDataset(keyword: string, city: string): Promise<InstagramResult[]> {
  const results: InstagramResult[] = [];

  // Google Custom Search للبحث في Instagram
  const googleResults = await googleSearchPlatform(keyword, "instagram", city, 10);

  for (const item of googleResults) {
    const usernameMatch = item.link.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (!usernameMatch) continue;
    const username = usernameMatch[1];
    if (["p", "explore", "reel", "stories", "tv"].includes(username)) continue;

    const phones = extractPhones(item.snippet);
    const isVerified = item.title.includes("✓") || item.title.includes("Verified");

    results.push({
      id: `ig-${username}`,
      username,
      displayName: item.title.replace(" (@" + username + ") • Instagram", "")
        .replace(" • Instagram photos and videos", "")
        .replace(" | Instagram", ""),
      description: item.snippet,
      profileUrl: `https://www.instagram.com/${username}/`,
      phone: phones[0] || "",
      isVerified,
      dataSource: "google",
    });
  }

  // إزالة التكرارات
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.username)) return false;
    seen.add(r.username);
    return true;
  });
}

// ===== Snapchat Search =====

export interface SnapchatResult {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  snapchatUrl: string;
  phone: string;
  subscribers?: number;
  dataSource: "google";
}

/** بحث Snapchat عبر Google Custom Search */
export async function searchSnapchatDataset(keyword: string, city: string): Promise<SnapchatResult[]> {
  const googleResults = await googleSearchPlatform(keyword, "snapchat", city, 10);
  const results: SnapchatResult[] = [];

  for (const item of googleResults) {
    const usernameMatch = item.link.match(/snapchat\.com\/(?:add|p)\/([a-zA-Z0-9._-]+)/);
    if (!usernameMatch) continue;
    const username = usernameMatch[1];
    const phones = extractPhones(item.snippet);

    results.push({
      id: `sc-${username}`,
      username,
      displayName: item.title.replace(" | Snapchat", "").replace(" - Snapchat", ""),
      description: item.snippet,
      profileUrl: `https://www.snapchat.com/add/${username}`,
      snapchatUrl: item.link,
      phone: phones[0] || "",
      dataSource: "google",
    });
  }

  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.username)) return false;
    seen.add(r.username);
    return true;
  });
}

// ===== LinkedIn Search =====

export interface LinkedInResult {
  id: string;
  name: string;
  description: string;
  profileUrl: string;
  industry?: string;
  location?: string;
  employees?: string;
  phone: string;
  website?: string;
  dataSource: "google";
}

/** بحث LinkedIn عبر Google Custom Search */
export async function searchLinkedInDataset(keyword: string, city: string): Promise<LinkedInResult[]> {
  const googleResults = await googleSearchPlatform(keyword, "linkedin", city, 10);
  const results: LinkedInResult[] = [];

  for (const item of googleResults) {
    const companyMatch = item.link.match(/linkedin\.com\/company\/([a-zA-Z0-9-]+)/);
    const profileMatch = item.link.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
    const match = companyMatch || profileMatch;
    if (!match) continue;

    const phones = extractPhones(item.snippet);
    const isCompany = !!companyMatch;

    results.push({
      id: `li-${match[1]}`,
      name: item.title.replace(" | LinkedIn", "").replace(" - LinkedIn", ""),
      description: item.snippet,
      profileUrl: item.link,
      industry: isCompany ? "شركة" : "فرد",
      location: city,
      phone: phones[0] || "",
      dataSource: "google",
    });
  }

  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// ===== AI Analysis =====

/** تحليل النتائج بـ AI لاستخراج معلومات إضافية */
async function analyzeWithAI(results: any[], platform: string, keyword: string): Promise<any[]> {
  if (!results.length) return results;

  try {
    const prompt = `أنت محلل بيانات للسوق السعودي. حلل هذه النتائج من ${platform} للكلمة المفتاحية "${keyword}".
    
لكل نتيجة، حدد:
1. هل هي نشاط تجاري حقيقي؟ (true/false)
2. نوع النشاط التجاري (مطعم، متجر، خدمة، إلخ)
3. مستوى الاهتمام للتواصل (high/medium/low)

النتائج:
${JSON.stringify(results.slice(0, 5).map(r => ({
  name: r.username || r.name || r.displayName,
  desc: (r.description || "").substring(0, 100),
})), null, 2)}

أجب بـ JSON فقط:
{
  "analyses": [
    { "index": 0, "isBusiness": true, "businessType": "مطعم", "interestLevel": "high" }
  ]
}`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "platform_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              analyses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer" },
                    isBusiness: { type: "boolean" },
                    businessType: { type: "string" },
                    interestLevel: { type: "string", enum: ["high", "medium", "low"] },
                  },
                  required: ["index", "isBusiness", "businessType", "interestLevel"],
                  additionalProperties: false,
                },
              },
            },
            required: ["analyses"],
            additionalProperties: false,
          },
        },
      },
    });

    const parsed = JSON.parse(response.choices[0].message.content as string);
    const analyses = parsed.analyses || [];

    return results.map((r, i) => {
      const analysis = analyses.find((a: any) => a.index === i);
      if (!analysis) return r;
      return {
        ...r,
        isBusiness: analysis.isBusiness,
        businessType: analysis.businessType,
        interestLevel: analysis.interestLevel,
      };
    });
  } catch {
    return results;
  }
}

// ===== Router =====

export const brightDataDatasetRouter = router({
  /** بحث TikTok */
  searchTikTok: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      analyzeWithAI: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      try {
        let results = await searchTikTokDataset(input.keyword, input.city);
        if (input.analyzeWithAI && results.length > 0) {
          results = await analyzeWithAI(results, "TikTok", input.keyword);
        }
        return {
          results,
          total: results.length,
          platform: "tiktok",
          method: results[0]?.dataSource === "brightdata" ? "Bright Data Dataset API" : "Google Custom Search",
        };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** بحث Instagram */
  searchInstagram: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      analyzeWithAI: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      try {
        let results = await searchInstagramDataset(input.keyword, input.city);
        if (input.analyzeWithAI && results.length > 0) {
          results = await analyzeWithAI(results, "Instagram", input.keyword);
        }
        return {
          results,
          total: results.length,
          platform: "instagram",
          method: "Google Custom Search",
        };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** بحث Snapchat */
  searchSnapchat: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = await searchSnapchatDataset(input.keyword, input.city);
        return {
          results,
          total: results.length,
          platform: "snapchat",
          method: "Google Custom Search",
        };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** بحث LinkedIn */
  searchLinkedIn: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const results = await searchLinkedInDataset(input.keyword, input.city);
        return {
          results,
          total: results.length,
          platform: "linkedin",
          method: "Google Custom Search",
        };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  /** بحث موحد في جميع المنصات */
  searchAll: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      platforms: z.array(z.enum(["tiktok", "instagram", "snapchat", "linkedin"])).default(["tiktok", "instagram", "snapchat", "linkedin"]),
    }))
    .mutation(async ({ input }) => {
      const promises: Promise<{ platform: string; results: any[]; total: number; method: string }>[] = [];

      if (input.platforms.includes("tiktok")) {
        promises.push(
          searchTikTokDataset(input.keyword, input.city)
            .then(r => ({ platform: "tiktok", results: r, total: r.length, method: r[0]?.dataSource === "brightdata" ? "Bright Data" : "Google" }))
            .catch(() => ({ platform: "tiktok", results: [], total: 0, method: "error" }))
        );
      }
      if (input.platforms.includes("instagram")) {
        promises.push(
          searchInstagramDataset(input.keyword, input.city)
            .then(r => ({ platform: "instagram", results: r, total: r.length, method: "Google" }))
            .catch(() => ({ platform: "instagram", results: [], total: 0, method: "error" }))
        );
      }
      if (input.platforms.includes("snapchat")) {
        promises.push(
          searchSnapchatDataset(input.keyword, input.city)
            .then(r => ({ platform: "snapchat", results: r, total: r.length, method: "Google" }))
            .catch(() => ({ platform: "snapchat", results: [], total: 0, method: "error" }))
        );
      }
      if (input.platforms.includes("linkedin")) {
        promises.push(
          searchLinkedInDataset(input.keyword, input.city)
            .then(r => ({ platform: "linkedin", results: r, total: r.length, method: "Google" }))
            .catch(() => ({ platform: "linkedin", results: [], total: 0, method: "error" }))
        );
      }

      const allResults = await Promise.all(promises);
      const totalLeads = allResults.reduce((sum, r) => sum + r.total, 0);

      return {
        byPlatform: allResults,
        totalLeads,
        keyword: input.keyword,
        city: input.city,
      };
    }),

  /** فحص حالة API */
  checkStatus: protectedProcedure.query(async () => {
    const hasBrightData = !!BRIGHT_DATA_API_TOKEN;
    const hasGoogle = !!(GOOGLE_API_KEY && GOOGLE_CSE_ID);

    return {
      brightDataConfigured: hasBrightData,
      googleConfigured: hasGoogle,
      platforms: {
        tiktok: hasBrightData ? "Bright Data Dataset API + Google fallback" : hasGoogle ? "Google Custom Search" : "غير متاح",
        instagram: hasGoogle ? "Google Custom Search" : "غير متاح",
        snapchat: hasGoogle ? "Google Custom Search" : "غير متاح",
        linkedin: hasGoogle ? "Google Custom Search" : "غير متاح",
      },
      status: (hasBrightData || hasGoogle) ? "جاهز" : "يحتاج إعداد",
    };
  }),
});
