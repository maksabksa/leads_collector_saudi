/**
 * Bright Data SERP REST API - البحث في محركات البحث
 * الطريقة الصحيحة: REST API عبر https://api.brightdata.com/request
 * وليس HTTP/HTTPS Proxy
 */
import https from "https";

// ===== Bright Data SERP REST API =====
const SERP_API_KEY = process.env.BRIGHT_DATA_API_TOKEN || "";
const SERP_ZONE = process.env.BRIGHT_DATA_SERP_ZONE || "serp_api1";

// ===== Residential Proxy (للاستخدام المباشر مع المواقع غير Google) =====
const RESI_HOST = process.env.BRIGHT_DATA_RESIDENTIAL_HOST || "brd.superproxy.io";
const RESI_PORT = parseInt(process.env.BRIGHT_DATA_RESIDENTIAL_PORT || "33335");
const RESI_USERNAME = process.env.BRIGHT_DATA_RESIDENTIAL_USERNAME || "";
const RESI_PASSWORD = process.env.BRIGHT_DATA_RESIDENTIAL_PASSWORD || "";

// ===== User-Agent Pool (30+ agents) =====
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.105 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.105 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.178 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Linux; Android 13; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.89 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Linux; Android 12; TECNO KG7h) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.111 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

const ACCEPT_LANGUAGES = [
  "ar-SA,ar;q=0.9,en;q=0.8",
  "ar,en-US;q=0.9,en;q=0.8",
  "ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7",
  "en-US,en;q=0.9,ar;q=0.8",
  "ar-AE,ar;q=0.9,en;q=0.8",
];

let uaIndex = 0;
function nextUserAgent(): string {
  const ua = USER_AGENTS[uaIndex % USER_AGENTS.length];
  uaIndex = (uaIndex + 1) % USER_AGENTS.length;
  return ua;
}
function nextAcceptLanguage(): string {
  return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

// ===== Concurrency Manager: 6 طلبات متزامنة =====
const MAX_CONCURRENT = 6;
let activeRequests = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => { activeRequests++; resolve(); });
  });
}

function releaseSlot(): void {
  activeRequests--;
  if (waitQueue.length > 0) {
    const next = waitQueue.shift()!;
    next();
  }
}

// ===== Smart Cache: لا يخزن النتائج الفارغة =====
const cache = new Map<string, { data: string; expiresAt: number; resultCount: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 دقيقة للنتائج الجيدة
const EMPTY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 دقائق فقط للنتائج الفارغة

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: string, resultCount: number): void {
  const ttl = resultCount > 0 ? CACHE_TTL_MS : EMPTY_CACHE_TTL_MS;
  cache.set(key, { data, expiresAt: Date.now() + ttl, resultCount });
  // تنظيف cache القديم إذا تجاوز 500 مدخل
  if (cache.size > 500) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Core SERP Request: Bright Data REST API =====
// الطريقة الصحيحة: POST إلى https://api.brightdata.com/request
// وليس HTTP/HTTPS proxy
async function serpRequestRaw(targetUrl: string): Promise<string> {
  if (!SERP_API_KEY) {
    throw new Error("BRIGHT_DATA_API_TOKEN not configured");
  }

  const body = JSON.stringify({
    zone: SERP_ZONE,
    url: targetUrl,
    format: "raw",
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.brightdata.com",
      port: 443,
      path: "/request",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERP_API_KEY}`,
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res: any) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf-8");
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error(`SERP API auth failed: ${res.statusCode} - check BRIGHT_DATA_API_TOKEN`));
          return;
        }
        if (res.statusCode === 429) {
          reject(new Error("SERP API rate limit: 429 Too Many Requests"));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`SERP API error: ${res.statusCode} - ${responseBody.slice(0, 200)}`));
          return;
        }
        if (responseBody.length < 100) {
          reject(new Error("Empty response from SERP API"));
          return;
        }
        resolve(responseBody);
      });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("SERP API request timeout"));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ===== serpRequest مع retry =====
export async function serpRequest(url: string, maxRetries = 3): Promise<string> {
  const cacheKey = url;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[SERP] Cache hit: ${url.slice(0, 80)}`);
    return cached;
  }

  await acquireSlot();
  try {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await serpRequestRaw(url);
        const resultCount = (result.match(/href="https?:\/\//g) || []).length;
        setCache(cacheKey, result, resultCount);
        console.log(`[SERP] ✅ Got ${resultCount} links from: ${url.slice(0, 80)}`);
        return result;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err.message?.includes("timeout") ||
          err.message?.includes("429") ||
          err.message?.includes("ECONNRESET");

        if (attempt < maxRetries && isRetryable) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`[SERP] Attempt ${attempt}/${maxRetries} failed (${err.message}), retry in ${Math.round(delay)}ms...`);
          await sleep(delay);
        } else if (!isRetryable) {
          throw err;
        }
      }
    }

    throw lastError || new Error("SERP request failed after retries");
  } finally {
    releaseSlot();
  }
}

// ===== Residential Proxy Request =====
// الآن يستخدم SERP REST API أيضاً (لأن الـ Residential يحجب Google)
export async function residentialRequest(url: string, maxRetries = 3): Promise<string> {
  // نستخدم SERP API كـ fallback لأنه يعمل مع جميع المواقع
  return serpRequest(url, maxRetries);
}

// ===== ترجمة الكلمات العربية الشائعة للإنجليزية =====
const AR_TO_EN: Record<string, string> = {
  "مطعم": "restaurant", "مطاعم": "restaurants",
  "كافيه": "cafe", "كافيهات": "cafes", "قهوة": "coffee",
  "صالون": "salon", "صالونات": "salons",
  "عيادة": "clinic", "عيادات": "clinics",
  "متجر": "store", "محل": "shop", "محلات": "shops",
  "فندق": "hotel", "فنادق": "hotels",
  "شركة": "company", "مؤسسة": "company",
  "جيم": "gym", "نادي": "club",
  "مدرسة": "school", "أكاديمية": "academy",
  "الرياض": "riyadh", "جدة": "jeddah", "مكة": "mecca",
  "الدمام": "dammam", "الخبر": "khobar", "المدينة": "medina",
  "السعودية": "saudi", "سعودي": "saudi",
};

function translateToEnglish(text: string): string {
  let result = text;
  for (const [ar, en] of Object.entries(AR_TO_EN)) {
    result = result.replace(new RegExp(ar, "g"), en);
  }
  return result.trim();
}

// ===== دالة مساعدة: توليد استعلامات متعددة =====
// ملاحظة مهمة: site:instagram.com + نص عربي = 0 نتائج في Google
// الحل: استخدام site: أولاً لأنه يعطي نتائج مباشرة من المنصة
function buildQueryVariants(query: string, location: string | undefined, site: string): string[] {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const locEn = loc ? `${translateToEnglish(loc)} Saudi Arabia` : "Saudi Arabia";
  const queryEn = translateToEnglish(query);
  const platformName = site.replace(".com", "").replace(".net", "");
  // site: أولاً - هذا يعطي نتائج مباشرة من المنصة وهو الأكثر فعالية
  return [
    // site: بالعربي (الأكثر فعالية - يعطي روابط مباشرة)
    `site:${site} ${query} ${locAr}`,
    `site:${site} ${query} ${loc || "الرياض"}`,
    // site: بالإنجليزي
    `site:${site} ${queryEn} ${locEn}`,
    `site:${site} ${queryEn} ${loc || "riyadh"} saudi`,
    // بدون site: كـ fallback
    `${platformName} ${query} ${locAr}`,
    `${platformName} ${queryEn} ${locEn}`,
    `${query} ${locAr} ${platformName}`,
    `${queryEn} ${locEn} ${platformName} account`,
  ];
}

// ===== بحث متعدد الاستعلامات مع دمج النتائج =====
async function multiQuerySearch(
  site: string,
  query: string,
  location: string | undefined,
  label: string,
  useResidential = false
): Promise<Array<{ username: string; displayName: string; bio: string; url: string }>> {
  const variants = buildQueryVariants(query, location, site);
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];

  const fetchHtml = async (q: string): Promise<string> => {
    // ملاحظة: cr=countrySA يسبب 407 من SERP proxy - تم حذفه
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa`;
    if (useResidential && RESI_USERNAME) {
      try {
        return await residentialRequest(url);
      } catch (err: any) {
        console.warn(`[${label}] Residential failed, fallback to SERP: ${err.message}`);
        return await serpRequest(url);
      }
    }
    return await serpRequest(url);
  };

  // تشغيل الاستعلامات بشكل تسلسلي مع delay بين كل طلب لتجنب socket hang up
  // الـ SERP proxy يفشل عند الطلبات المتزامنة
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < variants.length; i++) {
    const q = variants[i];
    try {
      if (i > 0) await sleep(800); // delay 800ms بين كل طلب
      const html = await fetchHtml(q);
      const parsed = parseGoogleResultsPublic(html, site);
      for (const r of parsed) {
        if (!seen.has(r.username)) {
          seen.add(r.username);
          allResults.push(r);
        }
      }
      // إذا وجدنا 20+ نتيجة، نوقف البحث
      if (allResults.length >= 20) break;
    } catch (err: any) {
      console.warn(`[${label}] query failed: ${q} - ${err.message}`);
    }
  }

  console.log(`[${label}] Total unique results: ${allResults.length}`);
  return allResults;
}

// ===== البحث في Google عن حسابات Instagram =====
export async function searchInstagramSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  return multiQuerySearch("instagram.com", query, location, "Instagram SERP", false);
}

// ===== البحث في Google عن حسابات TikTok =====
export async function searchTikTokSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  return multiQuerySearch("tiktok.com", query, location, "TikTok SERP", false);
}

// ===== البحث في Google عن حسابات Snapchat =====
export async function searchSnapchatSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const locEn = loc ? `${loc} Saudi Arabia` : "Saudi Arabia";
  const variants = [
    `snapchat.com/add ${query} ${locAr}`,
    `snapchat.com/add ${query} ${locEn}`,
    `snapchat.com/add ${query} KSA`,
    `site:snapchat.com/add ${query} ${locAr}`,
    `"snapchat" "${query}" ${locAr}`,
  ];
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];

  const fetchBatch = variants.slice(0, 3).map(async (q) => {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
      const html = await serpRequest(url);
      const matches = html.match(/snapchat\.com\/add\/([a-zA-Z0-9._-]+)/g) || [];
      return matches.map((m) => {
        const username = m.replace("snapchat.com/add/", "");
        return { username, displayName: username, bio: "", url: `https://www.snapchat.com/add/${username}` };
      });
    } catch (err: any) {
      console.warn(`[Snapchat SERP] failed: ${q} - ${err.message}`);
      return [];
    }
  });

  const results = await Promise.all(fetchBatch);
  for (const batch of results) {
    for (const r of batch) {
      if (r.username && !seen.has(r.username)) {
        seen.add(r.username);
        allResults.push(r);
      }
    }
  }

  console.log(`[Snapchat SERP] Total unique results: ${allResults.length}`);
  return allResults;
}

// ===== البحث في Google عن حسابات LinkedIn =====
export async function searchLinkedInSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const variants = [
    `site:linkedin.com/company ${query} ${locAr}`,
    `site:linkedin.com/in ${query} ${locAr}`,
    `site:linkedin.com ${query} Saudi Arabia`,
  ];
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];

  const fetchBatch = variants.map(async (q) => {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
      const html = await serpRequest(url);
      return parseGoogleResultsPublic(html, "linkedin.com");
    } catch (err: any) {
      console.warn(`[LinkedIn SERP] failed: ${q} - ${err.message}`);
      return [];
    }
  });

  const results = await Promise.all(fetchBatch);
  for (const batch of results) {
    for (const r of batch) {
      if (!seen.has(r.username)) { seen.add(r.username); allResults.push(r); }
    }
  }
  return allResults;
}

// ===== البحث في Google عن صفحات Facebook =====
export async function searchFacebookSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const locEn = loc ? `${loc} Saudi Arabia` : "Saudi Arabia";
  const queryEn = translateToEnglish(query);
  const variants = [
    `site:facebook.com ${query} ${locAr}`,
    `site:facebook.com ${query} ${loc || "الرياض"}`,
    `site:facebook.com/pages ${query} ${locAr}`,
    `site:facebook.com ${queryEn} ${locEn}`,
    `facebook ${query} ${locAr} صفحة`,
    `facebook.com ${query} ${locAr}`,
  ];
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < variants.length; i++) {
    const q = variants[i];
    try {
      if (i > 0) await sleep(800);
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa`;
      const html = await serpRequest(url);
      const parsed = parseGoogleResultsPublic(html, "facebook.com");
      for (const r of parsed) {
        if (!seen.has(r.username)) { seen.add(r.username); allResults.push(r); }
      }
      if (allResults.length >= 20) break;
    } catch (err: any) {
      console.warn(`[Facebook SERP] query failed: ${q} - ${err.message}`);
    }
  }

  console.log(`[Facebook SERP] Total unique results: ${allResults.length}`);
  return allResults;
}

// ===== البحث في Google عن حسابات Twitter/X =====
export async function searchTwitterSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const locEn = loc ? `${loc} Saudi Arabia` : "Saudi Arabia";
  const queryEn = translateToEnglish(query);
  // تويتر/X: نستخدم x.com لأن Google تفهرسه أفضل من twitter.com
  const variants = [
    `site:x.com ${query} ${locAr}`,
    `site:x.com ${query} ${loc || "الرياض"}`,
    `site:x.com ${queryEn} ${locEn}`,
    `site:twitter.com ${query} ${locAr}`,
    `x.com ${query} ${locAr} حساب`,
    `twitter ${query} ${locAr} حساب`,
  ];
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < variants.length; i++) {
    const q = variants[i];
    try {
      if (i > 0) await sleep(800);
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa`;
      const html = await serpRequest(url);
      // نحاول كلا النمطين: twitter.com و x.com
      const parsedX = parseGoogleResultsPublic(html, "x.com");
      const parsedT = parseGoogleResultsPublic(html, "twitter.com");
      for (const r of [...parsedX, ...parsedT]) {
        if (!seen.has(r.username)) { seen.add(r.username); allResults.push(r); }
      }
      if (allResults.length >= 20) break;
    } catch (err: any) {
      console.warn(`[Twitter SERP] query failed: ${q} - ${err.message}`);
    }
  }

  console.log(`[Twitter SERP] Total unique results: ${allResults.length}`);
  return allResults;
}

// ===== تحليل نتائج Google HTML =====
// Google الحديث يُشفّر الروابط في JSON مضمّن أو يضعها في نصوص - نستخدم regex عام
export function parseGoogleResultsPublic(html: string, domainFilter: string): Array<{
  username: string; displayName: string; bio: string; url: string;
}> {
  const results: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  const seen = new Set<string>();

  const blacklist = new Set([
    "explore", "p", "reel", "reels", "stories", "accounts", "hashtag", "tv",
    "search", "login", "signup", "about", "help", "legal", "privacy", "terms",
    "intent", "share", "home", "notifications", "messages", "add", "web",
    "discover", "trending", "live", "map", "maps", "places", "directory",
    "business", "ads", "developers", "pages", "groups", "events", "marketplace",
    "watch", "gaming", "fundraisers", "jobs", "news", "photos", "videos",
    "friends", "memories", "saved", "settings", "profile", "people",
    "_n", "_u", "tagged", "saved", "highlights", "igtv",
  ]);

  // استخراج الـ usernames مباشرة من HTML بـ regex عام
  // هذا يعمل مع Google HTML الحديث الذي يُشفّر الروابط
  let usernameRegex: RegExp;
  let urlBuilder: (username: string) => string;

  // ملاحظة: Google HTML يستخدم &amp; بدلاً من & لذا يجب دعمها في الـ regex
  // النمط: instagram.com/username/ أو instagram.com/username&amp; أو instagram.com/username"
  if (domainFilter === "instagram.com") {
    usernameRegex = /instagram\.com\/([a-zA-Z0-9._]{3,30})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://www.instagram.com/${u}/`;
  } else if (domainFilter === "tiktok.com") {
    usernameRegex = /tiktok\.com\/@([a-zA-Z0-9._]{3,30})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://www.tiktok.com/@${u}`;
  } else if (domainFilter === "snapchat.com") {
    usernameRegex = /snapchat\.com\/(?:add\/)?([a-zA-Z0-9._-]{3,30})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://www.snapchat.com/add/${u}`;
  } else if (domainFilter === "linkedin.com") {
    usernameRegex = /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9._-]{3,50})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://www.linkedin.com/company/${u}`;
  } else if (domainFilter === "twitter.com" || domainFilter === "x.com") {
    usernameRegex = /(?:twitter|x)\.com\/([a-zA-Z0-9_]{3,30})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://x.com/${u}`;
  } else if (domainFilter === "facebook.com") {
    usernameRegex = /facebook\.com\/(?:pages\/)?([a-zA-Z0-9._-]{3,50})(?:\/|\?|\\|"|\s|&|>|<|\n|\r|$)/g;
    urlBuilder = (u) => `https://www.facebook.com/${u}`;
  } else {
    return [];
  }

  let match;
  while ((match = usernameRegex.exec(html)) !== null) {
    const username = match[1];
    if (!username || username.length < 3) continue;
    if (blacklist.has(username.toLowerCase())) continue;
    if (seen.has(username)) continue;
    // تجاهل الأرقام فقط (ليست usernames)
    if (/^\d+$/.test(username)) continue;
    seen.add(username);

    const url = urlBuilder(username);

    // استخراج السياق المحيط
    const pos = match.index;
    const contextStart = Math.max(0, pos - 800);
    const contextEnd = Math.min(html.length, pos + 800);
    const context = html.slice(contextStart, contextEnd);

    // استخراج العنوان من h3
    let displayName = username;
    const h3Match = context.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (h3Match) {
      const rawTitle = h3Match[1].replace(/<[^>]+>/g, "").trim();
      if (rawTitle && rawTitle.length > 2) {
        const atMatch = rawTitle.match(/^(.+?)\s*[@(]/);
        displayName = atMatch ? atMatch[1].trim() : rawTitle.slice(0, 80);
      }
    }

    // استخراج الوصف - أنماط متعددة لـ Google HTML الحديث
    let bio = "";
    const descPatterns = [
      /class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*s3v9rd[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*lEBKkf[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*yDYNvb[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*IsZvec[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*st[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*fzUZNc[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*lyLwlc[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
    ];
    for (const pattern of descPatterns) {
      const descMatch = context.match(pattern);
      if (descMatch) {
        bio = descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300);
        if (bio && bio.length > 10) break;
      }
    }

    results.push({ username, displayName, bio, url });
    if (results.length >= 60) break;
  }

  return results;
}
