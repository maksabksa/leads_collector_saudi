/**
 * Bright Data SERP API - البحث في محركات البحث
 * مع retry logic + rate limiting + caching لتجنب 429
 */
import * as https from "https";
import * as http from "http";
import * as tls from "tls";

const SERP_HOST = process.env.BRIGHT_DATA_SERP_HOST || "brd.superproxy.io";
const SERP_PORT = parseInt(process.env.BRIGHT_DATA_SERP_PORT || "22225");
const SERP_USERNAME = process.env.BRIGHT_DATA_SERP_USERNAME || "";
const SERP_PASSWORD = process.env.BRIGHT_DATA_SERP_PASSWORD || "";

// ===== Rate Limiter =====
// حد أقصى 2 طلب/ثانية لتجنب 429
const requestQueue: Array<() => void> = [];
let activeRequests = 0;
const MAX_CONCURRENT = 2;
const MIN_DELAY_MS = 600; // 600ms بين كل طلب

function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      activeRequests++;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeRequests--;
        await sleep(MIN_DELAY_MS);
        if (requestQueue.length > 0) {
          const next = requestQueue.shift()!;
          next();
        }
      }
    };

    if (activeRequests < MAX_CONCURRENT) {
      execute();
    } else {
      requestQueue.push(execute);
    }
  });
}

// ===== Simple In-Memory Cache =====
const cache = new Map<string, { data: string; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 دقيقة

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: string): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  // تنظيف cache القديم إذا تجاوز 200 مدخل
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== Core SERP Request via HTTP CONNECT Proxy =====
// الطريقة الصحيحة: CONNECT + TLS + raw HTTP (بدون https.request فوق TLS لتجنب double-TLS)
async function serpRequestRaw(targetUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!SERP_USERNAME || !SERP_PASSWORD) {
      reject(new Error("Bright Data SERP credentials not configured"));
      return;
    }

    const auth = Buffer.from(`${SERP_USERNAME}:${SERP_PASSWORD}`).toString("base64");
    const parsed = new URL(targetUrl);
    const isHttps = parsed.protocol === "https:";
    const targetHost = parsed.hostname;
    const targetPort = isHttps ? 443 : 80;
    const requestPath = parsed.pathname + parsed.search;

    const connectReq = http.request({
      host: SERP_HOST,
      port: SERP_PORT,
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
      headers: {
        "Proxy-Authorization": `Basic ${auth}`,
        "Host": `${targetHost}:${targetPort}`,
      },
    });
    connectReq.setTimeout(20000, () => { connectReq.destroy(); reject(new Error("Proxy connect timeout")); });

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      // إرسال raw HTTP request مباشرة عبر socket (أو TLS socket)
      const sendRawRequest = (sock: any) => {
        const rawReq = [
          `GET ${requestPath} HTTP/1.1`,
          `Host: ${targetHost}`,
          `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36`,
          `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
          `Accept-Language: ar,en;q=0.9`,
          `Accept-Encoding: identity`,
          `Connection: close`,
          ``,
          ``,
        ].join("\r\n");

        sock.write(rawReq);

        let responseData = "";
        let headersParsed = false;
        let statusCode = 0;
        let bodyStart = 0;

        const timeout = setTimeout(() => {
          sock.destroy();
          reject(new Error("Request timeout"));
        }, 25000);

        sock.on("data", (chunk: Buffer) => {
          responseData += chunk.toString("utf-8");
          if (!headersParsed) {
            const headerEnd = responseData.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              headersParsed = true;
              bodyStart = headerEnd + 4;
              const statusLine = responseData.split("\r\n")[0];
              const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d+)/);
              statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
              if (statusCode === 429) {
                clearTimeout(timeout);
                sock.destroy();
                reject(new Error("SERP request failed: 429"));
              } else if (statusCode >= 400 && statusCode !== 200) {
                clearTimeout(timeout);
                sock.destroy();
                reject(new Error(`SERP request failed: ${statusCode}`));
              }
            }
          }
        });

        sock.on("end", () => {
          clearTimeout(timeout);
          sock.destroy();
          if (!headersParsed) {
            reject(new Error("Empty response from SERP"));
            return;
          }
          const body = responseData.slice(bodyStart);
          resolve(body);
        });

        sock.on("error", (err: Error) => {
          clearTimeout(timeout);
          sock.destroy();
          reject(err);
        });
      };

      if (isHttps) {
        // TLS upgrade على الـ socket مباشرة - لا نستخدم https.request لتجنب double-TLS
        const tlsSocket = tls.connect({
          socket,
          servername: targetHost,
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
        });
        tlsSocket.on("secureConnect", () => sendRawRequest(tlsSocket));
        tlsSocket.on("error", (err) => { socket.destroy(); reject(err); });
      } else {
        sendRawRequest(socket);
      }
    });

    connectReq.on("error", (err) => reject(err));
    connectReq.end();
  });
}

// ===== serpRequest مع retry + cache =====
export async function serpRequest(url: string, maxRetries = 3): Promise<string> {
  const cacheKey = url;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[SERP] Cache hit for: ${url.slice(0, 80)}`);
    return cached;
  }

  return enqueueRequest(async () => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await serpRequestRaw(url);
        setCache(cacheKey, result);
        return result;
      } catch (err: any) {
        lastError = err;
        const is429 = err.message?.includes("429");
        const isTimeout = err.message?.includes("timeout");

        if (is429 || isTimeout) {
          // exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[SERP] Attempt ${attempt}/${maxRetries} failed (${err.message}), retrying in ${delay}ms...`);
          await sleep(delay);
        } else {
          // خطأ غير قابل للإعادة
          throw err;
        }
      }
    }

    throw lastError || new Error("SERP request failed after retries");
  });
}

// ===== دالة مساعدة: توليد استعلامات متعددة للبحث =====
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
  ];
}

// دالة بحث محسّنة: ترسل استعلامات متعددة وتدمج النتائج بدون تكرار
async function multiQuerySearch(
  site: string,
  query: string,
  location: string | undefined,
  label: string
): Promise<Array<{ username: string; displayName: string; bio: string; url: string }>> {
  const variants = buildQueryVariants(query, location, site);
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];

  // إرسال أول 3 استعلامات بالتوازي
  const firstBatch = variants.slice(0, 3).map(async (q) => {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
      const html = await serpRequest(url);
      return parseGoogleResultsPublic(html, site);
    } catch (err) {
      console.warn(`[${label}] query failed: ${q}`, err);
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

  // إذا كانت النتائج أقل من 15، أرسل الاستعلامات المتبقية
  if (allResults.length < 15) {
    const secondBatch = variants.slice(3).map(async (q) => {
      try {
        const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
        const html = await serpRequest(url);
        return parseGoogleResultsPublic(html, site);
      } catch (err) {
        console.warn(`[${label}] query failed: ${q}`, err);
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
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  return multiQuerySearch("instagram.com", query, location, "Instagram SERP");
}

// ===== البحث في Google عن حسابات TikTok =====
export async function searchTikTokSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  return multiQuerySearch("tiktok.com", query, location, "TikTok SERP");
}

// ===== البحث في Google عن حسابات Snapchat =====
export async function searchSnapchatSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  return multiQuerySearch("snapchat.com", query, location, "Snapchat SERP");
}

// ===== البحث في Google عن حسابات LinkedIn =====
export async function searchLinkedInSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  // LinkedIn يحتاج استعلام خاص للشركات
  const loc = location || "";
  const locAr = loc ? `${loc} السعودية` : "السعودية";
  const variants = [
    `site:linkedin.com/company ${query} ${locAr}`,
    `site:linkedin.com/in ${query} ${locAr}`,
    `site:linkedin.com ${query} Saudi Arabia`,
  ];
  const seen = new Set<string>();
  const allResults: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  for (const q of variants) {
    try {
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=ar&gl=sa&cr=countrySA`;
      const html = await serpRequest(url);
      const res = parseGoogleResultsPublic(html, "linkedin.com");
      for (const r of res) {
        if (!seen.has(r.username)) { seen.add(r.username); allResults.push(r); }
      }
    } catch (err) { console.warn(`[LinkedIn SERP] failed: ${q}`, err); }
  }
  return allResults;
}

// ===== البحث في Google عن صفحات Facebook =====
export async function searchFacebookSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  return multiQuerySearch("facebook.com", query, location, "Facebook SERP");
}

// ===== تحليل نتائج Google HTML =====
export function parseGoogleResultsPublic(html: string, domainFilter: string): Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}> {
  const results: Array<{ username: string; displayName: string; bio: string; url: string }> = [];
  const seen = new Set<string>();

  // استخراج الروابط من HTML مع السياق المحيط بها
  const linkRegex = /href="(https?:\/\/(?:www\.)?[^"]*?)"/g;
  let match;

  // قائمة الحسابات المحظورة
  const blacklist = new Set(["explore", "p", "reel", "reels", "stories", "accounts", "hashtag", "tv",
    "search", "login", "signup", "about", "help", "legal", "privacy", "terms",
    "intent", "share", "home", "notifications", "messages", "add", "web",
    "discover", "trending", "live", "map", "maps", "places"]);

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
        // بعض روابط TikTok بدون @
        const m2 = url.match(/tiktok\.com\/([a-zA-Z0-9._]+)/);
        username = m2?.[1] || "";
      }
    } else if (domainFilter === "snapchat.com") {
      const m = url.match(/snapchat\.com\/(?:add\/)?([a-zA-Z0-9._-]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "linkedin.com") {
      const m = url.match(/linkedin\.com\/company\/([a-zA-Z0-9._-]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "twitter.com" || domainFilter === "x.com") {
      const m = url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)/);
      username = m?.[1] || "";
    } else if (domainFilter === "facebook.com") {
      // صفحات Facebook: /pages/name/id أو /name أو /profile.php?id=
      const mPage = url.match(/facebook\.com\/pages\/([^/]+)/);
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

    // استخراج العنوان والوصف من السياق المحيط بالرابط
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
        // استخراج الاسم قبل @ إذا كان موجوداً
        const atMatch = rawTitle.match(/^(.+?)\s*[@(]/);
        displayName = atMatch ? atMatch[1].trim() : rawTitle.slice(0, 60);
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
    ];
    for (const pattern of descPatterns) {
      const descMatch = context.match(pattern);
      if (descMatch) {
        bio = descMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 200);
        if (bio) break;
      }
    }

    results.push({ username, displayName, bio, url });

    if (results.length >= 50) break; // رفع الحد من 10 إلى 50
  }

  return results;
}
