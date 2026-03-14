/**
 * Bright Data SERP API - البحث في محركات البحث
 * النسخة المحسّنة:
 * - User-Agent rotation: 30+ user agent
 * - Concurrency: 6 طلبات متزامنة
 * - Retry ذكي: exponential backoff + تغيير User-Agent
 * - Cache ذكي: يتجنب تخزين النتائج الفارغة
 * - إصلاح socket hang up بـ Buffer accumulation بدلاً من string concat
 */
import * as http from "http";
import * as tls from "tls";

const SERP_HOST = process.env.BRIGHT_DATA_SERP_HOST || "brd.superproxy.io";
const SERP_PORT = parseInt(process.env.BRIGHT_DATA_SERP_PORT || "22225");
const SERP_USERNAME = process.env.BRIGHT_DATA_SERP_USERNAME || "";
const SERP_PASSWORD = process.env.BRIGHT_DATA_SERP_PASSWORD || "";

// ===== Residential Proxy =====
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

// ===== Core SERP Request: HTTP CONNECT + TLS + Buffer accumulation =====
// الإصلاح الرئيسي: استخدام Buffer[] بدلاً من string concat لتجنب encoding issues مع UTF-8
async function serpRequestRaw(
  targetUrl: string,
  userAgent: string,
  acceptLanguage: string,
  proxyHost: string,
  proxyPort: number,
  proxyUser: string,
  proxyPass: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!proxyUser || !proxyPass) {
      reject(new Error("Bright Data credentials not configured"));
      return;
    }

    const auth = Buffer.from(`${proxyUser}:${proxyPass}`).toString("base64");
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const targetHost = parsed.hostname;
    const targetPort = isHttps ? 443 : 80;
    const requestPath = parsed.pathname + parsed.search;

    const connectReq = http.request({
      host: proxyHost,
      port: proxyPort,
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
      headers: {
        "Proxy-Authorization": `Basic ${auth}`,
        "Host": `${targetHost}:${targetPort}`,
      },
    });

    connectReq.setTimeout(20000, () => {
      connectReq.destroy();
      reject(new Error("Proxy connect timeout"));
    });

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      const sendRawRequest = (sock: any) => {
        const rawReq = [
          `GET ${requestPath} HTTP/1.1`,
          `Host: ${targetHost}`,
          `User-Agent: ${userAgent}`,
          `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8`,
          `Accept-Language: ${acceptLanguage}`,
          `Accept-Encoding: identity`,
          `Cache-Control: no-cache`,
          `Pragma: no-cache`,
          `Sec-Fetch-Dest: document`,
          `Sec-Fetch-Mode: navigate`,
          `Sec-Fetch-Site: none`,
          `Upgrade-Insecure-Requests: 1`,
          `Connection: close`,
          ``,
          ``,
        ].join("\r\n");

        sock.write(rawReq);

        // استخدام Buffer[] بدلاً من string concat - هذا يحل مشكلة UTF-8 encoding
        const chunks: Buffer[] = [];
        let headersParsed = false;
        let statusCode = 0;
        let bodyOffset = 0;

        const timer = setTimeout(() => {
          sock.destroy();
          reject(new Error("Request timeout after 30s"));
        }, 30000);

        sock.on("data", (chunk: Buffer) => {
          chunks.push(chunk);

          if (!headersParsed) {
            const combined = Buffer.concat(chunks);
            const headerEndIdx = combined.indexOf("\r\n\r\n");
            if (headerEndIdx !== -1) {
              headersParsed = true;
              bodyOffset = headerEndIdx + 4;
              const headerStr = combined.slice(0, headerEndIdx).toString("ascii");
              const statusLine = headerStr.split("\r\n")[0];
              const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
              statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

              if (statusCode === 429) {
                clearTimeout(timer);
                sock.destroy();
                reject(new Error("SERP request failed: 429 Too Many Requests"));
                return;
              }
              if (statusCode >= 400 && statusCode !== 200) {
                clearTimeout(timer);
                sock.destroy();
                reject(new Error(`HTTP ${statusCode}`));
                return;
              }
            }
          }
        });

        sock.on("end", () => {
          clearTimeout(timer);
          if (!headersParsed) {
            reject(new Error("Empty response from SERP proxy"));
            return;
          }
          const fullBuffer = Buffer.concat(chunks);
          const body = fullBuffer.slice(bodyOffset).toString("utf-8");
          resolve(body);
        });

        sock.on("error", (err: Error) => {
          clearTimeout(timer);
          reject(err);
        });

        sock.on("close", () => {
          // إذا انتهى الـ socket قبل "end"، نحاول resolve بما لدينا
          if (headersParsed && chunks.length > 0) {
            clearTimeout(timer);
            const fullBuffer = Buffer.concat(chunks);
            const body = fullBuffer.slice(bodyOffset).toString("utf-8");
            if (body.length > 100) {
              resolve(body);
            }
          }
        });
      };

      if (isHttps) {
        const tlsSocket = tls.connect({
          socket,
          servername: targetHost,
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
        });
        tlsSocket.on("secureConnect", () => sendRawRequest(tlsSocket));
        tlsSocket.on("error", (err) => {
          socket.destroy();
          reject(err);
        });
      } else {
        sendRawRequest(socket);
      }
    });

    connectReq.on("error", (err) => reject(err));
    connectReq.end();
  });
}

// ===== serpRequest مع retry + User-Agent rotation =====
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
      const ua = nextUserAgent();
      const lang = nextAcceptLanguage();

      try {
        const result = await serpRequestRaw(
          url, ua, lang,
          SERP_HOST, SERP_PORT, SERP_USERNAME, SERP_PASSWORD
        );

        // حساب عدد النتائج لتحديد TTL
        const resultCount = (result.match(/href="https?:\/\//g) || []).length;
        setCache(cacheKey, result, resultCount);
        return result;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err.message?.includes("socket hang up") ||
          err.message?.includes("ECONNRESET") ||
          err.message?.includes("timeout") ||
          err.message?.includes("429");

        if (attempt < maxRetries && isRetryable) {
          const delay = Math.pow(2, attempt) * 800 + Math.random() * 400;
          console.warn(`[SERP] Attempt ${attempt}/${maxRetries} failed (${err.message}), retry in ${Math.round(delay)}ms with new UA...`);
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
export async function residentialRequest(url: string, maxRetries = 3): Promise<string> {
  const cacheKey = `resi:${url}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[RESI] Cache hit: ${url.slice(0, 80)}`);
    return cached;
  }

  await acquireSlot();
  try {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const ua = nextUserAgent();
      const lang = nextAcceptLanguage();

      try {
        const result = await serpRequestRaw(
          url, ua, lang,
          RESI_HOST, RESI_PORT,
          RESI_USERNAME || SERP_USERNAME,
          RESI_PASSWORD || SERP_PASSWORD
        );
        const resultCount = (result.match(/href="https?:\/\//g) || []).length;
        setCache(cacheKey, result, resultCount);
        return result;
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err.message?.includes("socket hang up") ||
          err.message?.includes("ECONNRESET") ||
          err.message?.includes("timeout") ||
          err.message?.includes("429");

        if (attempt < maxRetries && isRetryable) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[RESI] Attempt ${attempt}/${maxRetries} failed (${err.message}), retry in ${delay}ms...`);
          await sleep(delay);
        } else if (!isRetryable) {
          throw err;
        }
      }
    }

    throw lastError || new Error("Residential request failed after retries");
  } finally {
    releaseSlot();
  }
}

// ===== دالة مساعدة: توليد استعلامات متعددة =====
function buildQueryVariants(query: string, location: string | undefined, site: string): string[] {
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const locEn = loc ? `${loc} Saudi Arabia` : "Saudi Arabia";
  return [
    `site:${site} ${query} ${locAr}`,
    `site:${site} ${query} ${locEn}`,
    `site:${site} ${query} السعودية للتواصل`,
    `site:${site} ${query} السعودية واتساب`,
    `site:${site} ${query} KSA`,
    `site:${site} ${query} الرياض`,
    `site:${site} ${query} جدة`,
    `"${query}" site:${site}`,
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
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
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

  // الدفعة الأولى: 4 استعلامات بالتوازي (بدلاً من 3)
  const firstBatch = variants.slice(0, 4).map(async (q) => {
    try {
      const html = await fetchHtml(q);
      return parseGoogleResultsPublic(html, site);
    } catch (err: any) {
      console.warn(`[${label}] query failed: ${q} - ${err.message}`);
      return [];
    }
  });

  const batchResults = await Promise.all(firstBatch);
  for (const batch of batchResults) {
    for (const r of batch) {
      if (!seen.has(r.username)) {
        seen.add(r.username);
        allResults.push(r);
      }
    }
  }

  // إذا كانت النتائج أقل من 20، أرسل الاستعلامات المتبقية
  if (allResults.length < 20) {
    const secondBatch = variants.slice(4).map(async (q) => {
      try {
        const html = await fetchHtml(q);
        return parseGoogleResultsPublic(html, site);
      } catch (err: any) {
        console.warn(`[${label}] query2 failed: ${q} - ${err.message}`);
        return [];
      }
    });
    const secondResults = await Promise.all(secondBatch);
    for (const batch of secondResults) {
      for (const r of batch) {
        if (!seen.has(r.username)) {
          seen.add(r.username);
          allResults.push(r);
        }
      }
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
  return multiQuerySearch("facebook.com", query, location, "Facebook SERP", false);
}

// ===== البحث في Google عن حسابات Twitter/X =====
export async function searchTwitterSERP(query: string, location?: string): Promise<Array<{
  username: string; displayName: string; bio: string; url: string;
}>> {
  return multiQuerySearch("twitter.com", query, location, "Twitter SERP", false);
}

// ===== تحليل نتائج Google HTML =====
export function parseGoogleResultsPublic(html: string, domainFilter: string): Array<{
  username: string; displayName: string; bio: string; url: string;
}> {
  const results: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  const seen = new Set<string>();

  const linkRegex = /href="(https?:\/\/(?:www\.)?[^"]*?)"/g;
  let match;

  const blacklist = new Set([
    "explore", "p", "reel", "reels", "stories", "accounts", "hashtag", "tv",
    "search", "login", "signup", "about", "help", "legal", "privacy", "terms",
    "intent", "share", "home", "notifications", "messages", "add", "web",
    "discover", "trending", "live", "map", "maps", "places", "directory",
    "business", "ads", "developers", "pages", "groups", "events", "marketplace",
    "watch", "gaming", "fundraisers", "jobs", "news", "photos", "videos",
    "friends", "memories", "saved", "settings", "profile", "people",
  ]);

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url.includes(domainFilter) || url.includes("google.com")) continue;

    let username = "";

    if (domainFilter === "instagram.com") {
      const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
      username = m?.[1] || "";
    } else if (domainFilter === "tiktok.com") {
      const m = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)/);
      username = m?.[1] || "";
      if (!username) {
        const m2 = url.match(/tiktok\.com\/([a-zA-Z0-9._]+)/);
        username = m2?.[1] || "";
      }
    } else if (domainFilter === "snapchat.com") {
      const m = url.match(/snapchat\.com\/(?:add\/)?([a-zA-Z0-9._-]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "linkedin.com") {
      const m = url.match(/linkedin\.com\/company\/([a-zA-Z0-9._-]+)/);
      username = m?.[1] || "";
      if (!username) {
        const m2 = url.match(/linkedin\.com\/in\/([a-zA-Z0-9._-]+)/);
        username = m2?.[1] || "";
      }
    } else if (domainFilter === "twitter.com" || domainFilter === "x.com") {
      const m = url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "facebook.com") {
      const mPage = url.match(/facebook\.com\/pages\/([^/?#]+)/);
      const mProfile = url.match(/facebook\.com\/([a-zA-Z0-9._-]+)(?:\/|\?|$)/);
      const mPhpId = url.match(/profile\.php\?id=(\d+)/);
      if (mPage) username = mPage[1];
      else if (mPhpId) username = mPhpId[1];
      else if (mProfile) username = mProfile[1];
    } else {
      username = url;
    }

    if (!username || blacklist.has(username.toLowerCase()) || seen.has(username)) continue;
    seen.add(username);

    // استخراج السياق المحيط بالرابط
    const pos = match.index;
    const contextStart = Math.max(0, pos - 600);
    const contextEnd = Math.min(html.length, pos + 600);
    const context = html.slice(contextStart, contextEnd);

    // استخراج العنوان من h3
    let displayName = username;
    const h3Match = context.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (h3Match) {
      const rawTitle = h3Match[1].replace(/<[^>]+>/g, "").trim();
      if (rawTitle) {
        const atMatch = rawTitle.match(/^(.+?)\s*[@(]/);
        displayName = atMatch ? atMatch[1].trim() : rawTitle.slice(0, 80);
      }
    }

    // استخراج الوصف
    let bio = "";
    const descPatterns = [
      /class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*s3v9rd[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*lEBKkf[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*yDYNvb[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*IsZvec[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
      /class="[^"]*st[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/,
    ];
    for (const pattern of descPatterns) {
      const descMatch = context.match(pattern);
      if (descMatch) {
        bio = descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300);
        if (bio) break;
      }
    }

    results.push({ username, displayName, bio, url });
    if (results.length >= 50) break;
  }

  return results;
}
