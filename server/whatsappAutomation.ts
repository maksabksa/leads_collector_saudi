/**
 * WhatsApp Web Automation Service
 * يفتح واتساب ويب في Chromium ويرسل الرسائل تلقائياً
 * يحتفظ بالجلسة (QR scan مرة واحدة فقط)
 */

import puppeteer, { Browser, Page } from "puppeteer-core";
import path from "path";
import fs from "fs";

const CHROMIUM_PATH = "/usr/bin/chromium-browser";
const USER_DATA_DIR = path.join(process.cwd(), ".whatsapp-session");
const WA_URL = "https://web.whatsapp.com";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// حالة الجلسة
export type WaStatus =
  | "disconnected"
  | "qr_pending"
  | "connected"
  | "sending"
  | "error";

let browser: Browser | null = null;
let page: Page | null = null;
let currentStatus: WaStatus = "disconnected";
let qrDataUrl: string | null = null;
let lastError: string | null = null;
let pollingActive = false;

// نتيجة إرسال رسالة
export type SendResult = {
  success: boolean;
  phone: string;
  error?: string;
};

// ضمان وجود مجلد الجلسة
function ensureSessionDir() {
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }
}

// تشغيل المتصفح
async function launchBrowser(): Promise<Browser> {
  ensureSessionDir();
  return puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    userDataDir: USER_DATA_DIR,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,900",
    ],
  });
}

// إعداد الصفحة مع User Agent صحيح
async function setupPage(p: Page) {
  await p.setViewport({ width: 1280, height: 900 });
  await p.setUserAgent(USER_AGENT);
  // تجاوز فحص WebDriver
  await p.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
}

// فحص تسجيل الدخول
async function checkIfLoggedIn(p: Page): Promise<boolean> {
  try {
    return await p.evaluate(() => {
      return !!(
        document.querySelector("#side") ||
        document.querySelector('[data-testid="chat-list"]') ||
        document.querySelector('[aria-label="Chat list"]')
      );
    });
  } catch {
    return false;
  }
}

// التقاط QR كـ screenshot للصفحة الكاملة
async function captureQRScreenshot(p: Page): Promise<string | null> {
  try {
    const hasQR = await p.evaluate(() => {
      return !!(
        document.querySelector("[data-ref]") ||
        document.querySelector("canvas")
      );
    });
    if (!hasQR) return null;

    const screenshot = await p.screenshot({
      encoding: "base64",
      type: "png",
    });
    return `data:image/png;base64,${screenshot}`;
  } catch {
    return null;
  }
}

// بدء جلسة واتساب ويب
export async function startWhatsAppSession(): Promise<{
  status: WaStatus;
  qr?: string;
}> {
  try {
    currentStatus = "qr_pending";
    qrDataUrl = null;
    lastError = null;
    pollingActive = false;

    // أغلق المتصفح القديم إن وجد
    if (browser) {
      try {
        await browser.close();
      } catch { /* تجاهل */ }
      browser = null;
      page = null;
    }

    browser = await launchBrowser();
    const pages = await browser.pages();
    page = pages.length > 0 ? pages[0] : await browser.newPage();
    await setupPage(page);

    await page.goto(WA_URL, { waitUntil: "networkidle0", timeout: 60000 });

    // انتظر حتى 12 ثانية لتحميل الصفحة كاملاً
    let loggedIn = false;
    let qrFound = false;

    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      loggedIn = await checkIfLoggedIn(page);
      if (loggedIn) break;

      qrFound = await page.evaluate(() => {
        return !!(
          document.querySelector("[data-ref]") ||
          document.querySelector("canvas")
        );
      });
      if (qrFound) break;
    }

    if (loggedIn) {
      currentStatus = "connected";
      return { status: "connected" };
    }

    if (qrFound) {
      const qr = await captureQRScreenshot(page);
      if (qr) {
        qrDataUrl = qr;
        currentStatus = "qr_pending";
        // ابدأ polling للتحقق من تسجيل الدخول
        startLoginPolling(page);
        return { status: "qr_pending", qr: qrDataUrl };
      }
    }

    // إذا لم يظهر QR ولم يكن مسجلاً، أعد المحاولة مرة أخرى
    currentStatus = "error";
    lastError = "لم يتم تحميل واتساب ويب بشكل صحيح";
    return { status: "error" };
  } catch (err: any) {
    currentStatus = "error";
    lastError = err.message;
    return { status: "error" };
  }
}

// Polling للتحقق من تسجيل الدخول وتحديث QR
function startLoginPolling(p: Page) {
  if (pollingActive) return;
  pollingActive = true;

  const poll = async () => {
    const maxAttempts = 90; // 3 دقائق
    for (let i = 0; i < maxAttempts; i++) {
      if (!pollingActive) break;
      await new Promise((r) => setTimeout(r, 2000));

      try {
        const loggedIn = await checkIfLoggedIn(p);
        if (loggedIn) {
          currentStatus = "connected";
          qrDataUrl = null;
          pollingActive = false;
          return;
        }

        // تحديث QR screenshot
        const newQR = await captureQRScreenshot(p);
        if (newQR) qrDataUrl = newQR;
      } catch {
        pollingActive = false;
        break;
      }
    }
    pollingActive = false;
  };

  poll().catch(() => { pollingActive = false; });
}

// جلب حالة الجلسة الحالية
export async function getSessionStatus(): Promise<{
  status: WaStatus;
  qr?: string;
  error?: string;
}> {
  if (currentStatus === "connected" && page) {
    try {
      const stillConnected = await checkIfLoggedIn(page);
      if (!stillConnected) {
        currentStatus = "disconnected";
      }
    } catch {
      currentStatus = "disconnected";
    }
  }
  return {
    status: currentStatus,
    qr: qrDataUrl || undefined,
    error: lastError || undefined,
  };
}

// إرسال رسالة لرقم واحد
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<SendResult> {
  if (currentStatus !== "connected" || !page) {
    return { success: false, phone, error: "واتساب غير متصل" };
  }

  try {
    currentStatus = "sending";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const waUrl = `${WA_URL}/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    await page.goto(waUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 4000));

    // انتظر حقل الإدخال
    const inputSelectors = [
      '[data-testid="conversation-compose-box-input"]',
      '[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][title]',
      'footer [contenteditable="true"]',
    ];

    let inputEl = null;
    for (const sel of inputSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 8000 });
        inputEl = await page.$(sel);
        if (inputEl) break;
      } catch { continue; }
    }

    if (!inputEl) {
      // بحث بديل
      inputEl = await page.evaluateHandle(() => {
        const els = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        for (const el of els) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          if (rect.bottom > window.innerHeight * 0.7) return el;
        }
        return null;
      }) as any;
    }

    if (!inputEl || !(await inputEl.asElement())) {
      currentStatus = "connected";
      return { success: false, phone, error: "لم يتم العثور على حقل الرسالة" };
    }

    const el = inputEl.asElement()!;
    await el.click();
    await new Promise((r) => setTimeout(r, 500));

    // مسح المحتوى وكتابة الرسالة
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.type(message, { delay: 20 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 2000));

    currentStatus = "connected";
    return { success: true, phone };
  } catch (err: any) {
    currentStatus = "connected";
    return { success: false, phone, error: err.message };
  }
}

// إرسال رسائل مجمعة
export async function sendBulkMessages(
  messages: Array<{ phone: string; message: string; leadId: number; companyName: string }>,
  onProgress?: (index: number, result: SendResult) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const { phone, message } = messages[i];
    const result = await sendWhatsAppMessage(phone, message);
    results.push(result);
    if (onProgress) onProgress(i, result);

    if (i < messages.length - 1) {
      const delay = 3000 + Math.random() * 3000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return results;
}

// قطع الاتصال
export async function disconnectWhatsApp(): Promise<void> {
  pollingActive = false;
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
  } catch { /* تجاهل */ }
  currentStatus = "disconnected";
  qrDataUrl = null;
}
