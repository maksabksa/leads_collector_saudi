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

    // استخدام HTTP CONNECT للـ proxy
    const connectOptions = {
      host: SERP_HOST,
      port: SERP_PORT,
      method: "CONNECT",
      path: `${targetHost}:${targetPort}`,
      headers: {
        "Proxy-Authorization": `Basic ${auth}`,
        "Host": `${targetHost}:${targetPort}`,
      },
    };

    const connectReq = http.request(connectOptions);
    connectReq.setTimeout(20000);

    connectReq.on("connect", (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      // دالة مساعدة لإرسال الطلب الفعلي عبر socket معطى
      const doRequest = (requestSocket: any) => {
        const getOptions: https.RequestOptions = {
          host: targetHost,
          port: targetPort,
          path: parsed.pathname + parsed.search,
          method: "GET",
          socket: requestSocket,
          agent: false,
          rejectUnauthorized: false,
          headers: {
            "Host": targetHost,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ar,en;q=0.9",
            "Accept-Encoding": "identity",
          },
        } as any;

        const req = (isHttps ? https : http).request(getOptions, (innerRes) => {
          if (innerRes.statusCode === 429) {
            requestSocket.destroy();
            reject(new Error(`SERP request failed: 429`));
            return;
          }
          if (innerRes.statusCode && innerRes.statusCode >= 400) {
            requestSocket.destroy();
            reject(new Error(`SERP request failed: ${innerRes.statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          innerRes.on("data", (chunk) => chunks.push(chunk));
          innerRes.on("end", () => {
            requestSocket.destroy();
            resolve(Buffer.concat(chunks).toString("utf-8"));
          });
          innerRes.on("error", (err) => {
            requestSocket.destroy();
            reject(err);
          });
        });

        req.setTimeout(20000, () => {
          requestSocket.destroy();
          reject(new Error("Request timeout"));
        });
        req.on("error", (err) => {
          requestSocket.destroy();
          reject(err);
        });
        req.end();
      };

      if (isHttps) {
        // إنشاء TLS socket صريح مع rejectUnauthorized: false
        // هذا ضروري لأن Bright Data يستخدم self-signed certificates
        // تمرير socket مباشرة لـ https.request لا يكفي - يجب tls.connect صريح
        const tlsSocket = tls.connect({
          socket,
          host: targetHost,
          servername: targetHost,
          rejectUnauthorized: false,
        });
        tlsSocket.on("secureConnect", () => doRequest(tlsSocket));
        tlsSocket.on("error", (err) => { socket.destroy(); reject(err); });
      } else {
        doRequest(socket);
      }
    });

    connectReq.on("error", (err) => reject(err));
    connectReq.on("timeout", () => {
      connectReq.destroy();
      reject(new Error("Proxy connect timeout"));
    });
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

// ===== البحث في Google عن حسابات Instagram =====
export async function searchInstagramSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:instagram.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10&hl=ar`;

  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "instagram.com");
  } catch (err) {
    console.warn(`[Instagram SERP] query failed: ${query}`, err);
    return [];
  }
}

// ===== البحث في Google عن حسابات TikTok =====
export async function searchTikTokSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:tiktok.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10&hl=ar`;

  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "tiktok.com");
  } catch (err) {
    console.warn(`[TikTok SERP] query failed: ${query}`, err);
    return [];
  }
}

// ===== البحث في Google عن حسابات Snapchat =====
export async function searchSnapchatSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:snapchat.com ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10&hl=ar`;

  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "snapchat.com");
  } catch (err) {
    console.warn(`[Snapchat SERP] query failed: ${query}`, err);
    return [];
  }
}

// ===== البحث في Google عن حسابات LinkedIn =====
export async function searchLinkedInSERP(query: string, location?: string): Promise<Array<{
  username: string;
  displayName: string;
  bio: string;
  url: string;
}>> {
  const searchQuery = `site:linkedin.com/company ${query}${location ? ` ${location}` : ""}`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10&hl=ar`;

  try {
    const html = await serpRequest(url);
    return parseGoogleResultsPublic(html, "linkedin.com");
  } catch (err) {
    console.warn(`[LinkedIn SERP] query failed: ${query}`, err);
    return [];
  }
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

  // استخراج الروابط من HTML
  const linkRegex = /href="(https?:\/\/(?:www\.)?[^"]*?)"/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1];
    if (url.includes(domainFilter) && !url.includes("google.com")) {
      links.push(url);
    }
  }

  // استخراج usernames من الروابط
  for (const url of links.slice(0, 15)) {
    let username = "";

    if (domainFilter === "instagram.com") {
      const m = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/);
      username = m?.[1] || "";
    } else if (domainFilter === "tiktok.com") {
      const m = url.match(/tiktok\.com\/@([a-zA-Z0-9._]+)\/?/);
      username = m?.[1] || "";
    } else if (domainFilter === "snapchat.com") {
      const m = url.match(/snapchat\.com\/(?:add\/)?([a-zA-Z0-9._-]+)\/?/);
      username = m?.[1] || "";
    } else if (domainFilter === "linkedin.com") {
      const m = url.match(/linkedin\.com\/company\/([a-zA-Z0-9._-]+)\/?/);
      username = m?.[1] || "";
    } else if (domainFilter === "twitter.com" || domainFilter === "x.com") {
      const m = url.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]+)\/?/);
      username = m?.[1] || "";
    } else {
      username = url;
    }

    // تصفية الحسابات غير المرغوبة
    const blacklist = ["explore", "p", "reel", "stories", "accounts", "hashtag", "tv", "reels", "search", "login", "signup", "about", "help", "legal", "privacy", "terms", "intent", "share", "home", "notifications", "messages"];
    if (username && !blacklist.includes(username.toLowerCase()) && !seen.has(username)) {
      seen.add(username);
      results.push({
        username,
        displayName: username,
        bio: "",
        url,
      });
    }
  }

  return results;
}
