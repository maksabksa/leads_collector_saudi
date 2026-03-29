/**
 * Headless Browser Scraper — Puppeteer
 * يُستخدم كـ fallback عند فشل HTTP Fetch العادي
 * يدعم مواقع JavaScript-Heavy (React/Vue/Angular)
 */
import puppeteer from "puppeteer-core";

const CHROMIUM_PATH = "/usr/bin/chromium-browser";

export interface HeadlessResult {
  html: string;
  text: string;
  title: string;
  metaDescription: string;
  success: boolean;
  error?: string;
}

/**
 * يفتح الموقع بمتصفح حقيقي ويُشغّل JavaScript كاملاً
 * يُرجع HTML الكامل بعد تحميل كل المحتوى الديناميكي
 */
export async function scrapeWithHeadless(url: string, timeoutMs = 25000): Promise<HeadlessResult> {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1280,800",
        "--disable-blink-features=AutomationControlled",
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      ],
    });

    const page = await browser.newPage();

    // إخفاء علامات الأتمتة
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    // تعيين viewport وUser-Agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      "Accept-Language": "ar-SA,ar;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    // تجاهل الصور والخطوط لتسريع التحميل
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "font", "media", "stylesheet"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: timeoutMs,
    });

    // انتظار إضافي لتحميل المحتوى الديناميكي
    await new Promise(r => setTimeout(r, 2000));

    // استخراج البيانات من الصفحة المحملة بالكامل
    const result = await page.evaluate(() => {
      const title = document.title || "";
      const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || "";
      const html = document.documentElement.outerHTML;

      // تنظيف النص للـ AI
      const scripts = document.querySelectorAll("script, style, noscript");
      scripts.forEach(el => el.remove());
      const text = document.body?.innerText?.replace(/\s+/g, " ").trim().slice(0, 12000) || "";

      return { title, metaDescription: metaDesc, html: html.slice(0, 200000), text };
    });

    return {
      html: result.html,
      text: result.text,
      title: result.title,
      metaDescription: result.metaDescription,
      success: true,
    };
  } catch (err: any) {
    console.warn("[HeadlessScraper] Failed:", err?.message);
    return {
      html: "",
      text: "",
      title: "",
      metaDescription: "",
      success: false,
      error: err?.message,
    };
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* تجاهل */ }
    }
  }
}

/**
 * أخذ Screenshot كامل للموقع (Full-Page)
 * يستخدم Bright Data Scraping Browser (WebSocket) للوصول للإنترنت
 * يُرجع Buffer للصورة بصيغة PNG
 */
export async function takeWebsiteScreenshot(url: string, timeoutMs = 30000): Promise<Buffer | null> {
  // محاولة أولى: Bright Data Scraping Browser (يعمل عبر الإنترنت)
  const wsEndpoint = process.env.BRIGHT_DATA_WS_ENDPOINT;
  if (wsEndpoint) {
    let browser = null;
    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      // ملاحظة: لا نستخدم setExtraHTTPHeaders مع Bright Data لأنه يمنع التنقل

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      // انتظار إضافي لتحميل المحتوى
      await new Promise(r => setTimeout(r, 3000));

      // إخفاء النوافذ المنبثقة الشائعة
      try {
        await page.evaluate(() => {
          const selectors = [
            '[class*="cookie"]', '[class*="popup"]', '[class*="modal"]',
            '[id*="cookie"]', '[id*="popup"]', '[id*="overlay"]',
            '[class*="gdpr"]', '[class*="consent"]',
          ];
          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach((el: any) => { el.style.display = 'none'; });
          });
        });
      } catch { /* تجاهل أخطاء إخفاء النوافذ */ }

      // Full-Page Screenshot — يلتقط الصفحة الكاملة بطولها الكامل
      const screenshotBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
      });

      await browser.disconnect();
      console.log(`[Screenshot] Captured via Bright Data (full-page): ${url} (${Buffer.from(screenshotBuffer).length} bytes)`);
      return Buffer.from(screenshotBuffer);
    } catch (err: any) {
      console.warn("[Screenshot] Bright Data failed:", err?.message);
      if (browser) {
        try { await browser.disconnect(); } catch { /* تجاهل */ }
      }
    }
  }

  // محاولة ثانية: Chromium المحلي (قد لا يعمل في بيئة الإنتاج)
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1440,900",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
    await new Promise(r => setTimeout(r, 2000));

    // Full-Page Screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: true,
    });

    console.log(`[Screenshot] Captured via local Chromium (full-page): ${url}`);
    return Buffer.from(screenshotBuffer);
  } catch (err: any) {
    console.warn("[Screenshot] Local Chromium also failed:", err?.message);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* تجاهل */ }
    }
  }
}

/**
 * أخذ Screenshot لصفحة سوشيال ميديا (إنستغرام / تيك توك / تويتر / سناب شات)
 * يستخدم Bright Data Scraping Browser للوصول للمنصات المحجوبة
 * يُرجع Buffer للصورة بصيغة PNG
 */
export async function takeSocialMediaScreenshot(
  url: string,
  platform: "instagram" | "tiktok" | "twitter" | "snapchat" | "facebook",
  timeoutMs = 35000
): Promise<Buffer | null> {
  const wsEndpoint = process.env.BRIGHT_DATA_WS_ENDPOINT;
  if (!wsEndpoint) {
    console.warn("[SocialScreenshot] No Bright Data WS endpoint configured");
    return null;
  }

  let browser = null;
  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
    });

    const page = await browser.newPage();
    // viewport مناسب للسوشيال ميديا (موبايل-like لإنستغرام، desktop للباقي)
    if (platform === "instagram" || platform === "tiktok") {
      await page.setViewport({ width: 430, height: 932 }); // iPhone 14 Pro Max
    } else {
      await page.setViewport({ width: 1280, height: 800 });
    }

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // انتظار تحميل المحتوى الديناميكي
    await new Promise(r => setTimeout(r, 4000));

    // إخفاء النوافذ المنبثقة حسب المنصة
    try {
      await page.evaluate((plt: string) => {
        // إخفاء نوافذ تسجيل الدخول والكوكيز
        const hideSelectors = [
          '[role="dialog"]',
          '[class*="cookie"]', '[class*="consent"]',
          '[class*="login"]', '[class*="signup"]',
          '[class*="modal"]', '[class*="overlay"]',
          '[class*="banner"]',
        ];
        // إنستغرام: إخفاء نافذة "تسجيل الدخول للمتابعة"
        if (plt === "instagram") {
          hideSelectors.push('._a9-z', '._acas', '.RnEpo');
        }
        // تيك توك: إخفاء نافذة التطبيق
        if (plt === "tiktok") {
          hideSelectors.push('[class*="AppDownload"]', '[class*="LoginModal"]');
        }
        hideSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach((el: any) => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
          });
        });
        // إزالة overflow:hidden من body
        document.body.style.overflow = 'auto';
      }, platform);
    } catch { /* تجاهل */ }

    // انتظار إضافي بعد إخفاء النوافذ
    await new Promise(r => setTimeout(r, 1500));

    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false, // viewport فقط للسوشيال ميديا (أكثر وضوحاً)
    });

    await browser.disconnect();
    console.log(`[SocialScreenshot] Captured ${platform}: ${url} (${Buffer.from(screenshotBuffer).length} bytes)`);
    return Buffer.from(screenshotBuffer);
  } catch (err: any) {
    console.warn(`[SocialScreenshot] Failed for ${platform}:`, err?.message);
    if (browser) {
      try { await browser.disconnect(); } catch { /* تجاهل */ }
    }
    return null;
  }
}

/**
 * اكتشاف الميزات التقنية من HTML الكامل (بعد تشغيل JS)
 */
export function detectFeaturesFromFullHtml(html: string, text: string) {
  const lower = html.toLowerCase();
  const textLower = text.toLowerCase();
  const combined = lower + " " + textLower;

  return {
    hasPaymentGateway: /mada|moyasar|hyperpay|payfort|stripe|checkout|payment|بوابة.*دفع|ادفع|الدفع|visa|mastercard|pay\.google|apple.*pay/i.test(combined),
    hasEcommerce: /cart|سلة|عربة|checkout|shop|متجر|منتجات|add.to.cart|buy.now|اشتر/i.test(combined),
    hasBooking: /book|حجز|موعد|appointment|reservation|schedule|احجز|book.*now/i.test(combined),
    hasWhatsapp: /wa\.me|whatsapp|واتساب/i.test(combined),
    hasLiveChat: /livechat|tawk|intercom|zendesk|chat.*widget|crisp/i.test(combined),
    hasAnalytics: /google.*analytics|gtag|ga\(|_gaq|hotjar|mixpanel|segment/i.test(combined),
    hasSSL: html.startsWith("https") || /https:\/\//i.test(html.slice(0, 500)),
    hasBlog: /blog|مدونة|مقالات|articles|posts/i.test(combined),
    hasContactForm: /contact.*form|نموذج.*تواصل|form.*submit|اتصل.*بنا/i.test(combined),
    hasSocialLinks: /instagram\.com|tiktok\.com|snapchat\.com|twitter\.com|facebook\.com/i.test(combined),
    phoneNumbers: (combined.match(/(?:\+966|00966|0)5[0-9]{8}/g) || []).slice(0, 3),
    emails: (combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])
      .filter(e => !e.includes("example") && !e.includes("test"))
      .slice(0, 3),
  };
}
