/**
 * Google Web Search - بحث ذكي في نتائج Google العادية
 *
 * ===== سياسة البيانات الصارمة =====
 * 1. لا يُسمح بأي بيانات مولّدة أو وهمية تحت أي ظرف
 * 2. رقم الهاتف: يُستخرج بـ regex من النص الخام فقط - لا من AI
 * 3. الموقع الإلكتروني: يُستخرج من روابط Google الحقيقية فقط
 * 4. الـ AI يستخرج الاسم والوصف والمعلومات النصية فقط
 * 5. إذا لم تُجلب بيانات كافية → مصفوفة فارغة (لا بيانات وهمية)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { TRPCError } from "@trpc/server";

// ===== أنماط التحقق من البيانات =====
const PHONE_PATTERNS = [
  /(?:^|\s|[,،\|\/])\+?966\s?(?:5\d)\d{7}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])05\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?971\s?5\d{8}(?:\s|$|[,،\|\/])/g,
  /واتساب[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /whatsapp[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /📞\s*(\+?[\d\s\-]{9,15})/g,
  /📱\s*(\+?[\d\s\-]{9,15})/g,
];

function extractPhones(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of PHONE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const raw = (match[1] || match[0]).replace(/[^\d+]/g, "");
      if (raw.length >= 9 && raw.length <= 15) {
        let normalized = raw;
        if (normalized.startsWith("05") && normalized.length === 10) {
          normalized = "+966" + normalized.slice(1);
        } else if (normalized.startsWith("5") && normalized.length === 9) {
          normalized = "+9665" + normalized.slice(1);
        } else if (normalized.startsWith("966") && !normalized.startsWith("+")) {
          normalized = "+" + normalized;
        }
        found.add(normalized);
      }
    }
  }
  return Array.from(found);
}

// أنماط استبعاد المواقع غير التجارية
const EXCLUDED_DOMAINS = [
  "google.com", "youtube.com", "facebook.com", "twitter.com", "instagram.com",
  "tiktok.com", "snapchat.com", "linkedin.com", "wikipedia.org", "wikimedia.org",
  "amazon.com", "amazon.sa", "noon.com", "jarir.com", "extra.com",
  "government.sa", "gov.sa", "moi.gov.sa", "moh.gov.sa",
  "w3.org", "schema.org", "cloudflare.com", "amazonaws.com",
  "gstatic.com", "googleapis.com", "googletagmanager.com",
];

function extractWebsites(text: string): string[] {
  const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9@:%_+.~#?&/=]*)/g;
  const matches = text.match(urlRegex) || [];
  return Array.from(new Set(matches))
    .filter(url => {
      const lower = url.toLowerCase();
      return !EXCLUDED_DOMAINS.some(d => lower.includes(d)) && url.length < 150;
    })
    .slice(0, 5);
}

// ===== محاكاة سلوك بشري =====
const humanDelay = (min = 800, max = 2500) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ===== تنظيف HTML =====
function cleanHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);
}

// ===== استخراج نتائج Google من HTML =====
function extractGoogleResults(html: string): Array<{
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
}> {
  const results: Array<{ title: string; url: string; snippet: string; displayUrl: string }> = [];

  // استخراج عناوين ومقتطفات النتائج
  // نمط بحث عن عناوين h3 مع روابطها
  const titlePattern = /<h3[^>]*>(.*?)<\/h3>/gi;
  const titles: string[] = [];
  let titleMatch;
  while ((titleMatch = titlePattern.exec(html)) !== null) {
    const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    if (title.length > 3) titles.push(title);
  }

  // استخراج الروابط الحقيقية (مش روابط Google الداخلية)
  const linkPattern = /href="(https?:\/\/(?!(?:www\.)?google\.)[^"]+)"/gi;
  const urls: string[] = [];
  let linkMatch;
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    const url = linkMatch[1];
    if (!EXCLUDED_DOMAINS.some(d => url.toLowerCase().includes(d))) {
      urls.push(url);
    }
  }

  // استخراج المقتطفات النصية (snippets)
  const snippetPattern = /<span[^>]*class="[^"]*(?:VwiC3b|MUxGbd|yXK7lf|lEBKkf)[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetPattern.exec(html)) !== null) {
    const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").trim();
    if (snippet.length > 20) snippets.push(snippet);
  }

  // دمج النتائج
  const maxResults = Math.min(titles.length, 15);
  for (let i = 0; i < maxResults; i++) {
    const url = urls[i] || "";
    const domain = url ? new URL(url).hostname.replace("www.", "") : "";
    results.push({
      title: titles[i] || "",
      url: url,
      snippet: snippets[i] || "",
      displayUrl: domain,
    });
  }

  return results.filter(r => r.title && r.url);
}

// ===== دالة البحث الرئيسية =====
export async function searchGoogleWeb(
  keyword: string,
  city: string,
  searchType: "businesses" | "general" = "businesses",
  page = 1
): Promise<{
  results: GoogleSearchResult[];
  rawCount: number;
  query: string;
}> {
  const query = searchType === "businesses"
    ? `${keyword} ${city} السعودية موقع هاتف`
    : `${keyword} ${city}`;

  const startIndex = (page - 1) * 10;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ar&gl=SA&num=20&start=${startIndex}`;

  let rawHtml = "";

  try {
    await humanDelay(500, 1500);
    const response = await fetch(googleUrl, {
      headers: {
        "User-Agent": randomUA(),
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
        "DNT": "1",
      },
      signal: AbortSignal.timeout(25000),
    });

    rawHtml = await response.text();
  } catch (err) {
    console.error("[Google Search] Fetch error:", err);
    throw new Error("فشل في الاتصال بـ Google");
  }

  if (!rawHtml || rawHtml.length < 500) {
    return { results: [], rawCount: 0, query };
  }

  // استخراج أرقام الهواتف من HTML الخام
  const realPhones = extractPhones(rawHtml);
  const realWebsites = extractWebsites(rawHtml);

  // استخراج نتائج Google المنظمة
  const googleResults = extractGoogleResults(rawHtml);

  if (googleResults.length === 0) {
    // محاولة استخراج بديل من النص الكامل
    const cleanText = cleanHtml(rawHtml);
    return await analyzeWithAI(cleanText, keyword, city, realPhones, realWebsites, query);
  }

  // تحليل النتائج بالـ AI لاستخراج بيانات الأعمال
  const resultsText = googleResults
    .map((r, i) => `[${i + 1}] العنوان: ${r.title}\nالرابط: ${r.url}\nالمقتطف: ${r.snippet}`)
    .join("\n\n");

  return await analyzeWithAI(resultsText, keyword, city, realPhones, realWebsites, query, googleResults);
}

export interface GoogleSearchResult {
  id: string;
  name: string;
  description: string;
  url: string;
  displayUrl: string;
  phone: string;
  availablePhones: string[];
  availableWebsites: string[];
  businessType: string;
  city: string;
  relevanceScore: number;
  dataSource: string;
  isLeadCandidate: boolean;
  socialLinks: {
    instagram?: string;
    twitter?: string;
    snapchat?: string;
    tiktok?: string;
  };
}

async function analyzeWithAI(
  text: string,
  keyword: string,
  city: string,
  realPhones: string[],
  realWebsites: string[],
  query: string,
  rawResults?: Array<{ title: string; url: string; snippet: string; displayUrl: string }>
): Promise<{ results: GoogleSearchResult[]; rawCount: number; query: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `أنت محلل استخباراتي تجاري متخصص في السوق السعودي.
مهمتك: تحليل نتائج بحث Google واستخراج الأنشطة التجارية الحقيقية.

قواعد صارمة:
1. استخرج فقط الأنشطة التجارية الحقيقية (مطاعم، محلات، شركات، عيادات، إلخ)
2. حقل phone: اتركه فارغاً "" دائماً - الأرقام تأتي من مصدر منفصل
3. حقل website: استخرجه من الرابط الفعلي فقط إذا كان موقع الشركة
4. isLeadCandidate: true إذا كان نشاطاً تجارياً يحتاج خدمات تسويق
5. relevanceScore: من 1-10 بناءً على مدى ملاءمة النشاط للبحث
6. لا تخترع أي بيانات
7. الحد الأقصى 12 نتيجة`,
        },
        {
          role: "user",
          content: `حلّل نتائج Google لـ "${keyword}" في "${city}" واستخرج الأنشطة التجارية:\n\n${text.slice(0, 8000)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "google_search_results",
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
                    description: { type: "string" },
                    url: { type: "string" },
                    displayUrl: { type: "string" },
                    phone: { type: "string" },
                    businessType: { type: "string" },
                    city: { type: "string" },
                    relevanceScore: { type: "number" },
                    isLeadCandidate: { type: "boolean" },
                    instagramUrl: { type: "string" },
                    twitterUrl: { type: "string" },
                    snapchatUrl: { type: "string" },
                    tiktokUrl: { type: "string" },
                  },
                  required: ["name", "description", "url", "displayUrl", "phone", "businessType", "city", "relevanceScore", "isLeadCandidate", "instagramUrl", "twitterUrl", "snapchatUrl", "tiktokUrl"],
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

    const parsed = JSON.parse(response.choices[0].message.content as string);
    const aiResults = (parsed.results || []).filter((r: any) => r.name && r.name.trim() !== "");

    const finalResults: GoogleSearchResult[] = aiResults.map((r: any, idx: number) => ({
      id: `google-${Date.now()}-${idx}`,
      name: r.name,
      description: r.description || "",
      url: r.url || rawResults?.[idx]?.url || "",
      displayUrl: r.displayUrl || rawResults?.[idx]?.displayUrl || "",
      phone: "",
      availablePhones: realPhones,
      availableWebsites: realWebsites,
      businessType: r.businessType || "غير محدد",
      city: r.city || city,
      relevanceScore: Math.min(10, Math.max(1, r.relevanceScore || 5)),
      dataSource: "google_web_search",
      isLeadCandidate: r.isLeadCandidate ?? true,
      socialLinks: {
        instagram: r.instagramUrl || undefined,
        twitter: r.twitterUrl || undefined,
        snapchat: r.snapchatUrl || undefined,
        tiktok: r.tiktokUrl || undefined,
      },
    }));

    return {
      results: finalResults,
      rawCount: rawResults?.length || aiResults.length,
      query,
    };
  } catch (err) {
    console.error("[Google Search] AI analysis error:", err);
    return { results: [], rawCount: 0, query };
  }
}

// ===== البحث المتعمق في موقع محدد =====
export async function deepSearchWebsite(url: string, keyword: string): Promise<{
  phones: string[];
  emails: string[];
  socialLinks: Record<string, string>;
  description: string;
}> {
  try {
    await humanDelay(500, 1500);
    const response = await fetch(url, {
      headers: {
        "User-Agent": randomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    const html = await response.text();
    const phones = extractPhones(html);

    // استخراج الإيميلات
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = Array.from(new Set(html.match(emailRegex) || []))
      .filter(e => !e.includes("example.com") && !e.includes("test.com"))
      .slice(0, 3);

    // استخراج روابط السوشيال ميديا
    const socialLinks: Record<string, string> = {};
    const instagramMatch = html.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (instagramMatch) socialLinks.instagram = `https://instagram.com/${instagramMatch[1]}`;
    const twitterMatch = html.match(/twitter\.com\/([a-zA-Z0-9_]+)/);
    if (twitterMatch) socialLinks.twitter = `https://twitter.com/${twitterMatch[1]}`;
    const snapchatMatch = html.match(/snapchat\.com\/add\/([a-zA-Z0-9._-]+)/);
    if (snapchatMatch) socialLinks.snapchat = `https://snapchat.com/add/${snapchatMatch[1]}`;
    const tiktokMatch = html.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
    if (tiktokMatch) socialLinks.tiktok = `https://tiktok.com/@${tiktokMatch[1]}`;

    // وصف مختصر من الـ meta description
    const metaDescMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    const description = metaDescMatch?.[1] || "";

    return { phones, emails, socialLinks, description };
  } catch {
    return { phones: [], emails: [], socialLinks: {}, description: "" };
  }
}

// ===== Router =====
export const googleSearchRouter = router({
  // البحث في Google Web
  searchWeb: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
      searchType: z.enum(["businesses", "general"]).default("businesses"),
      page: z.number().default(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await searchGoogleWeb(input.keyword, input.city, input.searchType, input.page);
        return result;
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // البحث المتعمق في موقع محدد
  deepSearchSite: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      keyword: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await deepSearchWebsite(input.url, input.keyword);
        return result;
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // تحليل ذكي للاستعلام وتوليد استراتيجية بحث
  analyzeSearchIntent: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      city: z.string().default("الرياض"),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت خبير استراتيجي في استخبارات السوق السعودي.
مهمتك: تحليل استعلام البحث وتوليد استراتيجية بحث ذكية تشمل:
- استعلامات بحث محسّنة لـ Google
- أنواع الأنشطة المستهدفة
- مؤشرات الجودة للعملاء المحتملين`,
            },
            {
              role: "user",
              content: `حلّل استعلام البحث: "${input.keyword}" في "${input.city}" وأنشئ استراتيجية بحث شاملة.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "search_strategy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  enhancedQueries: { type: "array", items: { type: "string" } },
                  targetBusinessTypes: { type: "array", items: { type: "string" } },
                  searchTips: { type: "array", items: { type: "string" } },
                  estimatedLeads: { type: "number" },
                  marketInsight: { type: "string" },
                },
                required: ["enhancedQueries", "targetBusinessTypes", "searchTips", "estimatedLeads", "marketInsight"],
                additionalProperties: false,
              },
            },
          },
        });

        const parsed = JSON.parse(response.choices[0].message.content as string);
        return parsed;
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),
});
