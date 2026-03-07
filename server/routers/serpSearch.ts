/**
 * Bright Data SERP API - محرك بحث موحد لجميع المنصات الاجتماعية
 *
 * يستخدم Bright Data SERP API (serp_api1) للبحث في Google بدون CAPTCHA
 * ويستخرج نتائج حقيقية من: Snapchat, TikTok, Instagram, LinkedIn
 *
 * ===== سياسة البيانات الصارمة =====
 * - لا بيانات مولّدة أو وهمية تحت أي ظرف
 * - رقم الهاتف يُستخرج بـ regex من النص الخام فقط
 * - إذا لم تُجلب بيانات → مصفوفة فارغة
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import * as cheerio from "cheerio";

// ===== إعدادات SERP API =====
const SERP_HOST = process.env.BRIGHT_DATA_SERP_HOST || "brd.superproxy.io";
const SERP_PORT = process.env.BRIGHT_DATA_SERP_PORT || "33335";
const SERP_USERNAME = process.env.BRIGHT_DATA_SERP_USERNAME || "";
const SERP_PASSWORD = process.env.BRIGHT_DATA_SERP_PASSWORD || "";
const BD_API_TOKEN = process.env.BRIGHT_DATA_API_TOKEN || "";

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

// ===== SERP API Request =====

/** إرسال طلب بحث عبر Bright Data SERP API */
async function serpRequest(googleUrl: string): Promise<string> {
  if (!BD_API_TOKEN) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "BRIGHT_DATA_API_TOKEN غير مضبوط",
    });
  }

  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${BD_API_TOKEN}`,
    },
    body: JSON.stringify({
      zone: "serp_api1",
      url: googleUrl,
      format: "raw",
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `SERP API error ${response.status}: ${errText.substring(0, 200)}`,
    });
  }

  return response.text();
}

// ===== استخراج نتائج Google من HTML =====

interface GoogleResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

function parseGoogleResults(html: string, targetDomain: string): GoogleResult[] {
  const $ = cheerio.load(html);
  const results: GoogleResult[] = [];
  const seen = new Set<string>();

  // محاولة 1: نتائج Google الرئيسية
  $("div.g, div[data-sokoban-container], div.tF2Cxc").each((_i: number, el) => {
    const linkEl = $(el).find("a[href]").first();
    const titleEl = $(el).find("h3").first();
    const snippetEl = $(el).find(".VwiC3b, .yXK7lf, span.aCOpRe, div.IsZvec").first();

    const href = linkEl.attr("href") || "";
    const title = titleEl.text().trim();

    if (!href || !href.startsWith("http") || href.includes("google.com")) return;
    if (!href.includes(targetDomain)) return;
    if (seen.has(href)) return;
    seen.add(href);

    results.push({
      title,
      link: href,
      snippet: snippetEl.text().trim(),
      displayLink: new URL(href).hostname,
    });
  });

  // محاولة 2: جميع الروابط الخارجية (fallback)
  if (results.length === 0) {
    $("a[href]").each((_i: number, el) => {
      const href = $(el).attr("href") || "";
      if (!href.startsWith("http") || href.includes("google.com")) return;
      if (!href.includes(targetDomain)) return;
      if (seen.has(href)) return;
      seen.add(href);

      const title = $(el).text().trim();
      if (title.length < 3) return;

      results.push({
        title: title.substring(0, 150),
        link: href,
        snippet: "",
        displayLink: new URL(href).hostname,
      });
    });
  }

  return results.slice(0, 15);
}

// ===== Snapchat Search =====

export interface SnapchatProfile {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  phone: string;
  subscribers?: number;
  dataSource: "serp";
}

export async function searchSnapchatSERP(keyword: string, city: string): Promise<SnapchatProfile[]> {
  const query = `${keyword} ${city} site:snapchat.com`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=ar&gl=sa`;

  const html = await serpRequest(googleUrl);
  const googleResults = parseGoogleResults(html, "snapchat.com");

  const profiles: SnapchatProfile[] = [];
  const seen = new Set<string>();

  for (const item of googleResults) {
    // استخراج username من URL
    const usernameMatch = item.link.match(/snapchat\.com\/(?:add|p|discover)\/([a-zA-Z0-9._-]+)/);
    if (!usernameMatch) continue;
    const username = usernameMatch[1];
    if (seen.has(username)) continue;
    seen.add(username);

    const phones = extractPhones(item.snippet + " " + item.title);

    profiles.push({
      id: `sc-${username}`,
      username,
      displayName: item.title
        .replace(` | Snapchat`, "")
        .replace(` - Snapchat`, "")
        .replace(`(@${username})`, "")
        .trim(),
      description: item.snippet,
      profileUrl: `https://www.snapchat.com/add/${username}`,
      phone: phones[0] || "",
      dataSource: "serp",
    });
  }

  return profiles;
}

// ===== TikTok Search =====

export interface TikTokProfile {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  phone: string;
  followers?: number;
  dataSource: "serp";
}

export async function searchTikTokSERP(keyword: string, city: string): Promise<TikTokProfile[]> {
  const query = `${keyword} ${city} site:tiktok.com`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=ar&gl=sa`;

  const html = await serpRequest(googleUrl);
  const googleResults = parseGoogleResults(html, "tiktok.com");

  const profiles: TikTokProfile[] = [];
  const seen = new Set<string>();

  for (const item of googleResults) {
    // استخراج username من URL
    const usernameMatch = item.link.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (!usernameMatch) continue;
    const username = usernameMatch[1];
    if (seen.has(username)) continue;
    seen.add(username);

    const phones = extractPhones(item.snippet + " " + item.title);

    profiles.push({
      id: `tt-${username}`,
      username,
      displayName: item.title
        .replace(` | TikTok`, "")
        .replace(` - TikTok`, "")
        .replace(`(@${username})`, "")
        .trim(),
      description: item.snippet,
      profileUrl: `https://www.tiktok.com/@${username}`,
      phone: phones[0] || "",
      dataSource: "serp",
    });
  }

  return profiles;
}

// ===== Instagram Search =====

export interface InstagramProfile {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileUrl: string;
  phone: string;
  isVerified?: boolean;
  dataSource: "serp";
}

export async function searchInstagramSERP(keyword: string, city: string): Promise<InstagramProfile[]> {
  const query = `${keyword} ${city} site:instagram.com`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=ar&gl=sa`;

  const html = await serpRequest(googleUrl);
  const googleResults = parseGoogleResults(html, "instagram.com");

  const profiles: InstagramProfile[] = [];
  const seen = new Set<string>();

  const skipPaths = new Set(["p", "explore", "reel", "stories", "tv", "reels", "accounts"]);

  for (const item of googleResults) {
    const usernameMatch = item.link.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (!usernameMatch) continue;
    const username = usernameMatch[1];
    if (skipPaths.has(username)) continue;
    if (seen.has(username)) continue;
    seen.add(username);

    const phones = extractPhones(item.snippet + " " + item.title);
    const isVerified = item.title.includes("✓") || item.snippet.includes("verified");

    profiles.push({
      id: `ig-${username}`,
      username,
      displayName: item.title
        .replace(` • Instagram photos and videos`, "")
        .replace(` (@${username})`, "")
        .replace(` | Instagram`, "")
        .trim(),
      description: item.snippet,
      profileUrl: `https://www.instagram.com/${username}/`,
      phone: phones[0] || "",
      isVerified,
      dataSource: "serp",
    });
  }

  return profiles;
}

// ===== LinkedIn Search =====

export interface LinkedInProfile {
  id: string;
  name: string;
  description: string;
  profileUrl: string;
  type: "company" | "person";
  phone: string;
  industry?: string;
  dataSource: "serp";
}

export async function searchLinkedInSERP(keyword: string, city: string): Promise<LinkedInProfile[]> {
  const query = `${keyword} ${city} site:linkedin.com/company`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&hl=ar&gl=sa`;

  const html = await serpRequest(googleUrl);
  const googleResults = parseGoogleResults(html, "linkedin.com");

  const profiles: LinkedInProfile[] = [];
  const seen = new Set<string>();

  for (const item of googleResults) {
    const companyMatch = item.link.match(/linkedin\.com\/company\/([a-zA-Z0-9-]+)/);
    const personMatch = item.link.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
    const match = companyMatch || personMatch;
    if (!match) continue;
    if (seen.has(match[1])) continue;
    seen.add(match[1]);

    const phones = extractPhones(item.snippet);

    profiles.push({
      id: `li-${match[1]}`,
      name: item.title.replace(` | LinkedIn`, "").replace(` - LinkedIn`, "").trim(),
      description: item.snippet,
      profileUrl: item.link,
      type: companyMatch ? "company" : "person",
      phone: phones[0] || "",
      dataSource: "serp",
    });
  }

  return profiles;
}

// ===== AI Enhancement =====

async function enhanceWithAI(results: any[], platform: string, keyword: string): Promise<any[]> {
  if (!results.length) return results;

  try {
    const prompt = `أنت محلل بيانات للسوق السعودي. حلل هذه النتائج من ${platform} للكلمة المفتاحية "${keyword}".

لكل نتيجة حدد:
1. هل هي نشاط تجاري حقيقي؟
2. نوع النشاط (مطعم، متجر، خدمة، إلخ)
3. مستوى الأهمية للتواصل (high/medium/low)

النتائج:
${JSON.stringify(results.slice(0, 8).map((r: any) => ({
  name: r.username || r.name || r.displayName,
  desc: ((r.description || "") as string).substring(0, 100),
})), null, 2)}

أجب بـ JSON فقط:
{"analyses": [{"index": 0, "isBusiness": true, "businessType": "مطعم", "interestLevel": "high"}]}`;

    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "analysis",
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
    return results.map((r: any, i: number) => {
      const analysis = parsed.analyses?.find((a: any) => a.index === i);
      return analysis ? { ...r, isBusiness: analysis.isBusiness, businessType: analysis.businessType, interestLevel: analysis.interestLevel } : r;
    });
  } catch {
    return results;
  }
}

// ===== Router =====

export const serpSearchRouter = router({
  /** بحث Snapchat */
  searchSnapchat: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      analyzeWithAI: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      let results = await searchSnapchatSERP(input.keyword, input.city);
      if (input.analyzeWithAI && results.length > 0) {
        results = await enhanceWithAI(results, "Snapchat", input.keyword) as typeof results;
      }
      return { results, total: results.length, platform: "snapchat", method: "Bright Data SERP API" };
    }),

  /** بحث TikTok */
  searchTikTok: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      analyzeWithAI: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      let results = await searchTikTokSERP(input.keyword, input.city);
      if (input.analyzeWithAI && results.length > 0) {
        results = await enhanceWithAI(results, "TikTok", input.keyword) as typeof results;
      }
      return { results, total: results.length, platform: "tiktok", method: "Bright Data SERP API" };
    }),

  /** بحث Instagram */
  searchInstagram: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      analyzeWithAI: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      let results = await searchInstagramSERP(input.keyword, input.city);
      if (input.analyzeWithAI && results.length > 0) {
        results = await enhanceWithAI(results, "Instagram", input.keyword) as typeof results;
      }
      return { results, total: results.length, platform: "instagram", method: "Bright Data SERP API" };
    }),

  /** بحث LinkedIn */
  searchLinkedIn: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      const results = await searchLinkedInSERP(input.keyword, input.city);
      return { results, total: results.length, platform: "linkedin", method: "Bright Data SERP API" };
    }),

  /** بحث موحد في جميع المنصات */
  searchAll: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      platforms: z.array(z.enum(["snapchat", "tiktok", "instagram", "linkedin"])).default(["snapchat", "tiktok", "instagram", "linkedin"]),
    }))
    .mutation(async ({ input }) => {
      const tasks: Promise<{ platform: string; results: any[]; total: number }>[] = [];

      if (input.platforms.includes("snapchat")) {
        tasks.push(
          searchSnapchatSERP(input.keyword, input.city)
            .then(r => ({ platform: "snapchat", results: r, total: r.length }))
            .catch(() => ({ platform: "snapchat", results: [], total: 0 }))
        );
      }
      if (input.platforms.includes("tiktok")) {
        tasks.push(
          searchTikTokSERP(input.keyword, input.city)
            .then(r => ({ platform: "tiktok", results: r, total: r.length }))
            .catch(() => ({ platform: "tiktok", results: [], total: 0 }))
        );
      }
      if (input.platforms.includes("instagram")) {
        tasks.push(
          searchInstagramSERP(input.keyword, input.city)
            .then(r => ({ platform: "instagram", results: r, total: r.length }))
            .catch(() => ({ platform: "instagram", results: [], total: 0 }))
        );
      }
      if (input.platforms.includes("linkedin")) {
        tasks.push(
          searchLinkedInSERP(input.keyword, input.city)
            .then(r => ({ platform: "linkedin", results: r, total: r.length }))
            .catch(() => ({ platform: "linkedin", results: [], total: 0 }))
        );
      }

      const allResults = await Promise.allSettled(tasks);
      const byPlatform = allResults.map(r => r.status === "fulfilled" ? r.value : { platform: "unknown", results: [], total: 0 });
      const totalLeads = byPlatform.reduce((sum, r) => sum + r.total, 0);

      return { byPlatform, totalLeads, keyword: input.keyword, city: input.city };
    }),

  /** فحص حالة SERP API */
  checkStatus: protectedProcedure.query(async () => {
    const configured = !!(BD_API_TOKEN && SERP_USERNAME && SERP_PASSWORD);
    return {
      configured,
      zone: "serp_api1",
      host: SERP_HOST,
      port: SERP_PORT,
      status: configured ? "جاهز" : "يحتاج إعداد",
    };
  }),
});
