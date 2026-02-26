/**
 * Puppeteer Scraper - استخراج متقدم من TikTok وSnapchat
 * يستخدم Chromium الحقيقي مع محاكاة سلوك بشري لتجاوز الحماية
 */

import puppeteerCore from "puppeteer-core";

// مسار Chromium في النظام
const CHROMIUM_PATH = "/usr/bin/chromium-browser";

// regex لاستخراج أرقام الهواتف السعودية والخليجية
const PHONE_PATTERNS = [
  /(?:^|\s|[,،\|\/])\+?966\s?(?:5\d)\d{7}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])05\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?971\s?5\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?965\s?\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?974\s?\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?968\s?\d{8}(?:\s|$|[,،\|\/])/g,
  /(?:^|\s|[,،\|\/])\+?973\s?\d{8}(?:\s|$|[,،\|\/])/g,
  /واتساب[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /whatsapp[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /تواصل[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /للتواصل[:\s]*(\+?[\d\s\-]{9,15})/gi,
  /📞\s*(\+?[\d\s\-]{9,15})/g,
  /📱\s*(\+?[\d\s\-]{9,15})/g,
  /☎\s*(\+?[\d\s\-]{9,15})/g,
];

// regex لاستخراج المواقع
const WEBSITE_PATTERNS = [
  /https?:\/\/(?!(?:www\.)?(tiktok|snapchat|instagram|twitter|facebook|youtube|linkedin)\.com)[^\s,،\|<>"']{5,}/gi,
  /(?:^|\s)(?:www\.)[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s,،\|<>"']*)?/gi,
];

function extractPhones(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of PHONE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      // استخراج الرقم من المجموعة أو من المطابقة الكاملة
      const raw = (match[1] || match[0]).replace(/[^\d+]/g, "");
      if (raw.length >= 9 && raw.length <= 15) {
        // توحيد الصيغة السعودية
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

function extractWebsites(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of WEBSITE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      const url = match[0].trim();
      if (url.length > 5 && url.length < 200) {
        found.add(url.startsWith("http") ? url : "https://" + url);
      }
    }
  }
  return Array.from(found);
}

// إنشاء browser instance مشترك
let browserInstance: any = null;
let browserLastUsed = 0;
const BROWSER_IDLE_TIMEOUT = 5 * 60 * 1000; // 5 دقائق

async function getBrowser() {
  const now = Date.now();
  // إغلاق المتصفح إذا كان خاملاً لفترة طويلة
  if (browserInstance && now - browserLastUsed > BROWSER_IDLE_TIMEOUT) {
    try { await browserInstance.close(); } catch {}
    browserInstance = null;
  }
  if (!browserInstance) {
    browserInstance = await puppeteerCore.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--safebrowsing-disable-auto-update",
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--ignore-certificate-errors-spki-list",
        // تجاوز كشف الأتمتة
        "--disable-blink-features=AutomationControlled",
        "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ],
    });
  }
  browserLastUsed = now;
  return browserInstance;
}

// تأخير بشري عشوائي
function humanDelay(min = 800, max = 2500): Promise<void> {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

// ===== TikTok Profile Scraper =====
export interface TikTokProfile {
  username: string;
  displayName: string;
  bio: string;
  phones: string[];
  websites: string[];
  followers: string;
  profileUrl: string;
  avatarUrl?: string;
  verified: boolean;
}

export async function scrapeTikTokProfile(username: string): Promise<TikTokProfile | null> {
  const profileUrl = `https://www.tiktok.com/@${username.replace("@", "")}`;
  let page: any = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // إعداد headers بشرية
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    });

    // تجاوز كشف webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      (window as any).chrome = { runtime: {} };
    });

    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await humanDelay(1500, 3000);

    // انتظار تحميل المحتوى
    await page.waitForSelector("body", { timeout: 10000 });

    // استخراج البيانات من الصفحة
    const profileData = await page.evaluate(() => {
      // محاولة استخراج من JSON-LD أو meta tags أولاً
      const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
      let jsonData: any = null;
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || "");
          if (data?.UserModule?.users || data?.user?.uniqueId) {
            jsonData = data;
            break;
          }
        } catch {}
      }

      // استخراج من SIGI_STATE أو __NEXT_DATA__
      const sigiScript = document.querySelector("#SIGI_STATE, #__NEXT_DATA__");
      if (sigiScript) {
        try {
          const sigiData = JSON.parse(sigiScript.textContent || "");
          const userModule = sigiData?.UserModule?.users || sigiData?.props?.pageProps?.userInfo?.user;
          if (userModule) {
            const user = typeof userModule === "object" && !Array.isArray(userModule)
              ? Object.values(userModule)[0] as any
              : userModule;
            return {
              displayName: user?.nickname || user?.name || "",
              bio: user?.signature || user?.bioLink?.link || "",
              followers: String(user?.followerCount || user?.stats?.followerCount || ""),
              verified: user?.verified || false,
              avatarUrl: user?.avatarLarger || user?.avatarMedium || "",
            };
          }
        } catch {}
      }

      // fallback: استخراج من DOM
      const displayName =
        document.querySelector('[data-e2e="user-title"]')?.textContent ||
        document.querySelector('h1[data-e2e="user-name"]')?.textContent ||
        document.querySelector(".tiktok-1d3iqpf-H1ShareTitle")?.textContent ||
        document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

      const bio =
        document.querySelector('[data-e2e="user-bio"]')?.textContent ||
        document.querySelector(".tiktok-1n6ug3w-H2ShareDesc")?.textContent ||
        document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

      const followers =
        document.querySelector('[data-e2e="followers-count"]')?.textContent ||
        document.querySelector(".tiktok-1rjajjm-StrongVideoCount")?.textContent || "";

      const verified = !!document.querySelector('[data-e2e="user-verified"]');

      return { displayName, bio, followers, verified, avatarUrl: "" };
    });

    // استخراج الأرقام والمواقع من الـ bio
    const fullText = `${profileData.displayName} ${profileData.bio}`;
    const phones = extractPhones(fullText);
    const websites = extractWebsites(profileData.bio || "");

    // البحث في روابط الصفحة عن مواقع إضافية
    const pageLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map((a: any) => a.href)
        .filter((href: string) =>
          href &&
          !href.includes("tiktok.com") &&
          !href.includes("javascript:") &&
          href.startsWith("http")
        )
        .slice(0, 10);
    });

    for (const link of pageLinks) {
      if (!link.match(/tiktok|instagram|twitter|facebook|youtube|linkedin/i)) {
        websites.push(link);
      }
    }

    return {
      username: username.replace("@", ""),
      displayName: profileData.displayName?.trim() || username,
      bio: profileData.bio?.trim() || "",
      phones,
      websites: Array.from(new Set(websites)).slice(0, 5),
      followers: profileData.followers || "",
      profileUrl,
      avatarUrl: profileData.avatarUrl,
      verified: profileData.verified || false,
    };
  } catch (err) {
    console.error(`[TikTok Scraper] Error for @${username}:`, err);
    return null;
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}

// ===== TikTok Search Scraper =====
export interface TikTokSearchResult {
  username: string;
  displayName: string;
  bio: string;
  phones: string[];
  websites: string[];
  followers: string;
  profileUrl: string;
  verified: boolean;
  source: "tiktok_puppeteer";
}

export async function searchTikTokWithPuppeteer(keyword: string, city: string): Promise<TikTokSearchResult[]> {
  const query = `${keyword} ${city}`.trim();
  const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`;
  let page: any = null;
  const results: TikTokSearchResult[] = [];

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await humanDelay(2000, 4000);

    // تمرير بشري لتحميل المزيد
    await page.evaluate(() => window.scrollBy(0, 400));
    await humanDelay(1000, 2000);

    // استخراج قائمة المستخدمين من نتائج البحث
    const usernames = await page.evaluate(() => {
      const users: string[] = [];

      // محاولة استخراج من SIGI_STATE
      const sigiScript = document.querySelector("#SIGI_STATE, #__NEXT_DATA__");
      if (sigiScript) {
        try {
          const data = JSON.parse(sigiScript.textContent || "");
          // البحث في مختلف مسارات البيانات
          const searchData =
            data?.SearchUserList?.userInfoList ||
            data?.props?.pageProps?.searchData?.user_list ||
            [];
          for (const item of searchData.slice(0, 10)) {
            const uniqueId = item?.userInfo?.user?.uniqueId || item?.user?.uniqueId;
            if (uniqueId) users.push(uniqueId);
          }
        } catch {}
      }

      // fallback: استخراج من DOM
      if (users.length === 0) {
        const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
        for (const link of links) {
          const href = (link as HTMLAnchorElement).href;
          const match = href.match(/\/@([^/?]+)/);
          if (match && match[1] && !users.includes(match[1])) {
            users.push(match[1]);
          }
        }
      }

      return Array.from(new Set(users)).slice(0, 8);
    });

    console.log(`[TikTok Puppeteer] Found ${usernames.length} usernames for "${query}"`);

    // جلب تفاصيل كل ملف تعريف
    for (const username of usernames.slice(0, 5)) {
      await humanDelay(1500, 3000);
      const profile = await scrapeTikTokProfile(username);
      if (profile) {
        results.push({
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          phones: profile.phones,
          websites: profile.websites,
          followers: profile.followers,
          profileUrl: profile.profileUrl,
          verified: profile.verified,
          source: "tiktok_puppeteer",
        });
      }
    }

    return results;
  } catch (err) {
    console.error(`[TikTok Puppeteer] Search error for "${query}":`, err);
    return results;
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}

// ===== Snapchat Profile Scraper =====
export interface SnapchatProfile {
  username: string;
  displayName: string;
  bio: string;
  phones: string[];
  websites: string[];
  subscribers: string;
  profileUrl: string;
  source: "snapchat_puppeteer";
}

export async function scrapeSnapchatProfile(username: string): Promise<SnapchatProfile | null> {
  const profileUrl = `https://www.snapchat.com/add/${username.replace("@", "")}`;
  let page: any = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await humanDelay(1500, 3000);

    const profileData = await page.evaluate(() => {
      // استخراج من JSON-LD
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        try {
          const data = JSON.parse(jsonLd.textContent || "");
          return {
            displayName: data?.name || "",
            bio: data?.description || "",
            subscribers: "",
          };
        } catch {}
      }

      // استخراج من meta tags
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
      const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
      const description = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";

      // استخراج من DOM
      const displayName =
        document.querySelector('[class*="PublicProfileCard_displayName"]')?.textContent ||
        document.querySelector('[class*="displayName"]')?.textContent ||
        document.querySelector('h1')?.textContent ||
        ogTitle || "";

      const bio =
        document.querySelector('[class*="PublicProfileCard_bio"]')?.textContent ||
        document.querySelector('[class*="bio"]')?.textContent ||
        ogDesc || description || "";

      const subscribers =
        document.querySelector('[class*="subscribers"]')?.textContent ||
        document.querySelector('[class*="follower"]')?.textContent || "";

      return { displayName, bio, subscribers };
    });

    const fullText = `${profileData.displayName} ${profileData.bio}`;
    const phones = extractPhones(fullText);
    const websites = extractWebsites(profileData.bio || "");

    // استخراج روابط من الصفحة
    const pageLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map((a: any) => a.href)
        .filter((href: string) =>
          href &&
          !href.includes("snapchat.com") &&
          !href.includes("javascript:") &&
          href.startsWith("http")
        )
        .slice(0, 5);
    });

    for (const link of pageLinks) {
      if (!link.match(/snapchat|instagram|twitter|facebook|youtube/i)) {
        websites.push(link);
      }
    }

    return {
      username: username.replace("@", ""),
      displayName: profileData.displayName?.trim() || username,
      bio: profileData.bio?.trim() || "",
      phones,
      websites: Array.from(new Set(websites)).slice(0, 5),
      subscribers: profileData.subscribers || "",
      profileUrl,
      source: "snapchat_puppeteer",
    };
  } catch (err) {
    console.error(`[Snapchat Scraper] Error for @${username}:`, err);
    return null;
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}

// ===== Snapchat Search Scraper =====
export async function searchSnapchatWithPuppeteer(keyword: string, city: string): Promise<SnapchatProfile[]> {
  const query = `${keyword} ${city}`.trim();
  // Snapchat لا يدعم بحث المستخدمين العام - نستخدم بحث Google عن حسابات سناب
  const googleSearchUrl = `https://www.google.com/search?q=site:snapchat.com/add+${encodeURIComponent(keyword)}+${encodeURIComponent(city)}&num=10`;
  let page: any = null;
  const results: SnapchatProfile[] = [];

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    await page.goto(googleSearchUrl, { waitUntil: "domcontentloaded", timeout: 25000 });
    await humanDelay(2000, 4000);

    // استخراج روابط snapchat.com/add من نتائج Google
    const snapUsernames = await page.evaluate(() => {
      const usernames: string[] = [];
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        const match = href.match(/snapchat\.com\/add\/([^/?&"]+)/i);
        if (match && match[1] && !usernames.includes(match[1])) {
          usernames.push(match[1]);
        }
      }
      // أيضاً من نص الصفحة
      const bodyText = document.body.innerText;
      const textMatches = Array.from(bodyText.matchAll(/snapchat\.com\/add\/([a-zA-Z0-9._-]+)/g));
      for (const m of textMatches) {
        if (m[1] && !usernames.includes(m[1])) usernames.push(m[1]);
      }
      return Array.from(new Set(usernames)).slice(0, 8);
    });

    console.log(`[Snapchat Puppeteer] Found ${snapUsernames.length} usernames for "${query}"`);

    // جلب تفاصيل كل ملف تعريف
    for (const username of snapUsernames.slice(0, 5)) {
      await humanDelay(1500, 3000);
      const profile = await scrapeSnapchatProfile(username);
      if (profile) {
        results.push(profile);
      }
    }

    return results;
  } catch (err) {
    console.error(`[Snapchat Puppeteer] Search error for "${query}":`, err);
    return results;
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
}

// إغلاق المتصفح عند إيقاف السيرفر
process.on("exit", async () => {
  if (browserInstance) {
    try { await browserInstance.close(); } catch {}
  }
});
