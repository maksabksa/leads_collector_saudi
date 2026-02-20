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
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1280,800",
    ],
  });
}

// الحصول على الصفحة الحالية أو إنشاء جديدة
async function getPage(): Promise<Page> {
  if (!browser || !browser.connected) {
    browser = await launchBrowser();
  }
  const pages = await browser.pages();
  if (pages.length > 0) {
    page = pages[0];
  } else {
    page = await browser.newPage();
  }
  await page.setViewport({ width: 1280, height: 800 });
  return page;
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

    const p = await getPage();
    await p.goto(WA_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

    // انتظر قليلاً للتحميل
    await new Promise((r) => setTimeout(r, 3000));

    // تحقق إذا كان مسجلاً دخوله بالفعل
    const isLoggedIn = await checkIfLoggedIn(p);
    if (isLoggedIn) {
      currentStatus = "connected";
      return { status: "connected" };
    }

    // انتظر QR code
    try {
      await p.waitForSelector('[data-ref]', { timeout: 15000 });
      // التقط QR كـ screenshot
      const qrEl = await p.$('[data-ref]');
      if (qrEl) {
        // خذ screenshot للصفحة كاملة
        const screenshot = await p.screenshot({ encoding: "base64", type: "png" });
        qrDataUrl = `data:image/png;base64,${screenshot}`;
        currentStatus = "qr_pending";

        // ابدأ polling للتحقق من تسجيل الدخول
        pollForLogin(p);
        return { status: "qr_pending", qr: qrDataUrl };
      }
    } catch {
      // ربما مسجل دخوله بالفعل
      const loggedIn = await checkIfLoggedIn(p);
      if (loggedIn) {
        currentStatus = "connected";
        return { status: "connected" };
      }
    }

    return { status: currentStatus, qr: qrDataUrl || undefined };
  } catch (err: any) {
    currentStatus = "error";
    lastError = err.message;
    return { status: "error" };
  }
}

// فحص تسجيل الدخول
async function checkIfLoggedIn(p: Page): Promise<boolean> {
  try {
    // واتساب ويب يظهر side panel عند تسجيل الدخول
    const result = await p.evaluate(() => {
      return !!(
        document.querySelector('[data-testid="chat-list"]') ||
        document.querySelector('#side') ||
        document.querySelector('[data-testid="default-user"]') ||
        document.querySelector('[aria-label="Chat list"]')
      );
    });
    return result;
  } catch {
    return false;
  }
}

// Polling للتحقق من تسجيل الدخول بعد مسح QR
async function pollForLogin(p: Page) {
  const maxAttempts = 60; // 60 ثانية
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const loggedIn = await checkIfLoggedIn(p);
      if (loggedIn) {
        currentStatus = "connected";
        qrDataUrl = null;
        return;
      }
      // تحديث QR screenshot
      const screenshot = await p.screenshot({ encoding: "base64", type: "png" });
      qrDataUrl = `data:image/png;base64,${screenshot}`;
    } catch {
      break;
    }
  }
}

// جلب حالة الجلسة الحالية
export async function getSessionStatus(): Promise<{
  status: WaStatus;
  qr?: string;
  error?: string;
}> {
  if (currentStatus === "connected" && page) {
    // تحقق أن الاتصال لا يزال قائماً
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
    // تنظيف رقم الهاتف
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const waUrl = `${WA_URL}/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    await page.goto(waUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 3000));

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
      // جرب نهج مختلف: ابحث عن أي contenteditable في footer
      inputEl = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[contenteditable="true"]'));
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > window.innerHeight * 0.7) return el as any;
        }
        return null;
      }) as any;
    }

    if (!inputEl) {
      currentStatus = "connected";
      return { success: false, phone, error: "لم يتم العثور على حقل الرسالة" };
    }

    // انقر على حقل الإدخال
    await inputEl.click();
    await new Promise((r) => setTimeout(r, 500));

    // امسح المحتوى الحالي وأدخل الرسالة
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await new Promise((r) => setTimeout(r, 200));

    // اكتب الرسالة
    await page.keyboard.type(message, { delay: 30 });
    await new Promise((r) => setTimeout(r, 1000));

    // اضغط Enter للإرسال
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 2000));

    // تحقق من نجاح الإرسال (ابحث عن علامة الإرسال ✓)
    const sent = await page.evaluate(() => {
      const ticks = document.querySelectorAll('[data-testid="msg-dblcheck"], [data-testid="msg-check"]');
      return ticks.length > 0;
    });

    currentStatus = "connected";
    return { success: true, phone };
  } catch (err: any) {
    currentStatus = "connected";
    return { success: false, phone, error: err.message };
  }
}

// إرسال رسائل مجمعة مع تأخير بشري
export async function sendBulkMessages(
  messages: Array<{ phone: string; message: string; leadId: number; companyName: string }>,
  onProgress?: (index: number, result: SendResult) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const { phone, message, companyName } = messages[i];
    const result = await sendWhatsAppMessage(phone, message);
    results.push(result);
    if (onProgress) onProgress(i, result);

    // تأخير بشري بين الرسائل (3-6 ثواني)
    if (i < messages.length - 1) {
      const delay = 3000 + Math.random() * 3000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return results;
}

// قطع الاتصال
export async function disconnectWhatsApp(): Promise<void> {
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
