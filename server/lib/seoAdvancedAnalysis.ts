/**
 * SEO Advanced Analysis Engine
 * يجمع بيانات SEO متقدمة عبر:
 * 1. Bright Data SERP → ترتيب الموقع في نتائج البحث
 * 2. Google Custom Search → الكلمات المفتاحية والمنافسين
 * 3. Bright Data Scraper → تحليل Backlinks من Open Link Profile
 * 4. AI → تفسير البيانات وتوليد توصيات
 */
import { ENV } from "../_core/env";
import { fetchViaProxy, fetchWithScrapingBrowser } from "./brightDataScraper";
import { invokeLLM } from "../_core/llm";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface KeywordData {
  keyword: string;
  volume: string;
  position: number | null;
  difficulty: string;
}

export interface CompetitorData {
  name: string;
  url: string;
  seoScore: number;
  strengths: string[];
}

export interface RankingData {
  keyword: string;
  position: number | null;
  url: string;
  snippet: string;
}

export interface SeoAdvancedReport {
  // الكلمات المفتاحية
  topKeywords: KeywordData[];
  missingKeywords: string[];
  keywordOpportunities: string[];

  // الـ Backlinks
  estimatedBacklinks: number;
  backlinkQuality: "weak" | "average" | "good" | "strong";
  topReferringDomains: string[];
  backlinkGaps: string[];

  // المنافسون
  competitors: CompetitorData[];
  competitorGaps: string[];
  competitiveAdvantages: string[];

  // ترتيب البحث
  searchRankings: RankingData[];
  brandMentions: number;
  localSeoScore: number;

  // ملخص
  overallSeoHealth: "critical" | "weak" | "average" | "good" | "excellent";
  seoSummary: string;
  priorityActions: string[];
}

// ─── SERP Helper ─────────────────────────────────────────────────────────────
async function fetchSerpResults(query: string): Promise<string> {
  const serpHost = ENV.brightDataSerpHost;
  const serpUser = ENV.brightDataSerpUsername;
  const serpPass = ENV.brightDataSerpPassword;

  if (!serpHost || !serpUser || !serpPass) {
    return "";
  }

  try {
    const targetUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=ar&gl=sa`;
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "x-proxy-url": `http://${serpUser}:${serpPass}@${serpHost}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return "";
    return await response.text();
  } catch {
    return "";
  }
}

// ─── Extract SERP snippets ────────────────────────────────────────────────────
function extractSerpSnippets(html: string): { title: string; url: string; snippet: string }[] {
  const results: { title: string; url: string; snippet: string }[] = [];
  if (!html) return results;

  // استخراج URLs من نتائج البحث
  const urlPattern = /href="\/url\?q=([^&"]+)/g;
  const titlePattern = /<h3[^>]*>([^<]+)<\/h3>/g;

  let urlMatch;
  let titleMatch;
  const urls: string[] = [];
  const titles: string[] = [];

  while ((urlMatch = urlPattern.exec(html)) !== null) {
    const url = decodeURIComponent(urlMatch[1]);
    if (url.startsWith("http") && !url.includes("google.com")) {
      urls.push(url);
    }
  }

  while ((titleMatch = titlePattern.exec(html)) !== null) {
    titles.push(titleMatch[1].replace(/<[^>]+>/g, "").trim());
  }

  for (let i = 0; i < Math.min(urls.length, titles.length, 5); i++) {
    results.push({ title: titles[i] || "", url: urls[i] || "", snippet: "" });
  }

  return results;
}

// ─── Check site ranking for a keyword ────────────────────────────────────────
async function checkKeywordRanking(domain: string, keyword: string): Promise<number | null> {
  const html = await fetchSerpResults(keyword);
  if (!html) return null;

  const domainClean = domain.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const results = extractSerpSnippets(html);

  for (let i = 0; i < results.length; i++) {
    if (results[i].url.includes(domainClean)) {
      return i + 1;
    }
  }
  return null;
}

// ─── Find competitors via SERP ────────────────────────────────────────────────
async function findCompetitors(
  businessType: string,
  city: string,
  domain: string
): Promise<{ name: string; url: string }[]> {
  const query = `${businessType} ${city} موقع`;
  const html = await fetchSerpResults(query);
  if (!html) return [];

  const domainClean = domain.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  const results = extractSerpSnippets(html);

  return results
    .filter((r) => r.url && !r.url.includes(domainClean))
    .slice(0, 4)
    .map((r) => ({ name: r.title || new URL(r.url).hostname, url: r.url }));
}

// ─── Estimate backlinks via scraping ─────────────────────────────────────────
async function estimateBacklinks(url: string): Promise<{ count: number; domains: string[] }> {
  try {
    // نستخدم Open Link Profile من Bing Webmaster أو نجمع من SERP
    const domain = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").split("/")[0];
    const query = `link:${domain} -site:${domain}`;
    const html = await fetchSerpResults(query);
    if (!html) return { count: 0, domains: [] };

    const results = extractSerpSnippets(html);
    const domains = results
      .map((r) => {
        try { return new URL(r.url).hostname; } catch { return ""; }
      })
      .filter(Boolean);

    // تقدير عدد الـ backlinks بناءً على نتائج البحث
    const countMatch = html.match(/(\d[\d,]+)\s*نتيجة|About\s*([\d,]+)\s*results/i);
    const count = countMatch
      ? parseInt((countMatch[1] || countMatch[2] || "0").replace(/,/g, ""))
      : domains.length * 10;

    const uniqueDomains = Array.from(new Set(domains)).slice(0, 5);
    return { count: Math.min(count, 50000), domains: uniqueDomains };
  } catch {
    return { count: 0, domains: [] };
  }
}

// ─── Main Analysis Function ───────────────────────────────────────────────────
export async function runSeoAdvancedAnalysis(params: {
  url: string;
  companyName: string;
  businessType: string;
  city: string;
  websiteContent?: string;
  pagespeedData?: {
    seoScore: number | null;
    performanceScore: number | null;
    mobilePerformanceScore: number | null;
  };
}): Promise<SeoAdvancedReport> {
  const { url, companyName, businessType, city, websiteContent, pagespeedData } = params;
  const domain = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "").split("/")[0];

  // ─── جمع البيانات بالتوازي ────────────────────────────────────────────────
  const [
    brandRankingHtml,
    businessRankingHtml,
    competitorsList,
    backlinkData,
  ] = await Promise.allSettled([
    fetchSerpResults(`${companyName} ${city}`),
    fetchSerpResults(`${businessType} ${city}`),
    findCompetitors(businessType, city, url),
    estimateBacklinks(url),
  ]);

  const brandHtml = brandRankingHtml.status === "fulfilled" ? brandRankingHtml.value : "";
  const businessHtml = businessRankingHtml.status === "fulfilled" ? businessRankingHtml.value : "";
  const competitors = competitorsList.status === "fulfilled" ? competitorsList.value : [];
  const backlinks = backlinkData.status === "fulfilled" ? backlinkData.value : { count: 0, domains: [] };

  // ─── تحقق من ترتيب الموقع في نتائج البحث ─────────────────────────────────
  const brandPosition = brandHtml
    ? extractSerpSnippets(brandHtml).findIndex((r) => r.url.includes(domain)) + 1 || null
    : null;
  const businessPosition = businessHtml
    ? extractSerpSnippets(businessHtml).findIndex((r) => r.url.includes(domain)) + 1 || null
    : null;

  // ─── عدد الإشارات للعلامة التجارية ──────────────────────────────────────
  const brandMentions = brandHtml
    ? (brandHtml.match(new RegExp(companyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) || []).length
    : 0;

  // ─── تحليل بالـ AI ────────────────────────────────────────────────────────
  const serpContext = `
نتائج البحث عن اسم النشاط "${companyName} ${city}": ${brandHtml ? "متوفرة" : "غير متوفرة"}
ترتيب الموقع عند البحث باسم النشاط: ${brandPosition ? `المركز ${brandPosition}` : "غير مرتب في أول 5 نتائج"}
ترتيب الموقع عند البحث بنوع النشاط: ${businessPosition ? `المركز ${businessPosition}` : "غير مرتب في أول 5 نتائج"}
المنافسون المكتشفون: ${competitors.map((c) => c.name || c.url).join(", ") || "لم يُكتشف منافسون"}
تقدير عدد الـ Backlinks: ${backlinks.count}
نطاقات مرجعية: ${backlinks.domains.join(", ") || "لا توجد"}
درجة SEO من PageSpeed: ${pagespeedData?.seoScore ?? "غير متوفرة"}/100
درجة الأداء: ${pagespeedData?.performanceScore ?? "غير متوفرة"}/100
درجة الجوال: ${pagespeedData?.mobilePerformanceScore ?? "غير متوفرة"}/100
${websiteContent ? `محتوى الموقع (مقتطف): ${websiteContent.slice(0, 800)}` : ""}
`;

  const prompt = `أنت خبير SEO متخصص في السوق السعودي.
بناءً على البيانات التالية لموقع "${companyName}" (${businessType} في ${city}):
${serpContext}

قدم تحليل SEO متقدم بصيغة JSON فقط:
{
  "topKeywords": [
    {"keyword": "كلمة مفتاحية رئيسية", "volume": "عالي/متوسط/منخفض", "position": null, "difficulty": "سهل/متوسط/صعب"}
  ],
  "missingKeywords": ["كلمة مفتاحية يجب استهدافها 1", "كلمة 2"],
  "keywordOpportunities": ["فرصة كلمة مفتاحية 1 مع سبب تجاري"],
  "estimatedBacklinks": ${backlinks.count},
  "backlinkQuality": "weak|average|good|strong",
  "topReferringDomains": ${JSON.stringify(backlinks.domains)},
  "backlinkGaps": ["نطاق مهم يجب الحصول على رابط منه"],
  "competitors": [
    {"name": "اسم المنافس", "url": "رابطه", "seoScore": 7, "strengths": ["ميزة 1"]}
  ],
  "competitorGaps": ["ثغرة مقارنة بالمنافسين"],
  "competitiveAdvantages": ["ميزة تنافسية يمكن استغلالها"],
  "searchRankings": [
    {"keyword": "${companyName}", "position": ${brandPosition ?? null}, "url": "${url}", "snippet": "وصف مختصر"},
    {"keyword": "${businessType} ${city}", "position": ${businessPosition ?? null}, "url": "${url}", "snippet": "وصف مختصر"}
  ],
  "brandMentions": ${brandMentions},
  "localSeoScore": 5,
  "overallSeoHealth": "critical|weak|average|good|excellent",
  "seoSummary": "ملخص تحليلي دقيق في 2-3 جمل يصف الوضع الحالي والأولوية",
  "priorityActions": ["إجراء أولوية 1 مع تأثيره التجاري", "إجراء 2", "إجراء 3"]
}

ملاحظات:
- اقترح كلمات مفتاحية واقعية لهذا النوع من النشاط في السعودية
- المنافسون: استخدم البيانات المتوفرة أو اقترح منافسين واقعيين
- الـ Backlinks: قيّم الجودة بناءً على العدد ونوع النطاقات
- الأولويات: رتب حسب التأثير التجاري الفوري`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "أنت خبير SEO. أجب دائماً بـ JSON صحيح فقط." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" } as any,
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : "{}";
  let aiResult: any = {};
  try { aiResult = JSON.parse(content); } catch { aiResult = {}; }

  // دمج البيانات الحقيقية مع تحليل AI
  return {
    topKeywords: aiResult.topKeywords ?? [],
    missingKeywords: aiResult.missingKeywords ?? [],
    keywordOpportunities: aiResult.keywordOpportunities ?? [],
    estimatedBacklinks: backlinks.count || aiResult.estimatedBacklinks || 0,
    backlinkQuality: aiResult.backlinkQuality ?? "weak",
    topReferringDomains: backlinks.domains.length > 0 ? backlinks.domains : (aiResult.topReferringDomains ?? []),
    backlinkGaps: aiResult.backlinkGaps ?? [],
    competitors: (competitors.length > 0
      ? competitors.map((c, i) => ({
          name: c.name,
          url: c.url,
          seoScore: aiResult.competitors?.[i]?.seoScore ?? 5,
          strengths: aiResult.competitors?.[i]?.strengths ?? [],
        }))
      : aiResult.competitors ?? []),
    competitorGaps: aiResult.competitorGaps ?? [],
    competitiveAdvantages: aiResult.competitiveAdvantages ?? [],
    searchRankings: aiResult.searchRankings ?? [
      { keyword: companyName, position: brandPosition, url, snippet: "" },
      { keyword: `${businessType} ${city}`, position: businessPosition, url, snippet: "" },
    ],
    brandMentions,
    localSeoScore: aiResult.localSeoScore ?? 5,
    overallSeoHealth: aiResult.overallSeoHealth ?? "average",
    seoSummary: aiResult.seoSummary ?? "",
    priorityActions: aiResult.priorityActions ?? [],
  };
}
