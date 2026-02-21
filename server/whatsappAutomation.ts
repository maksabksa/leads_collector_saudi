/**
 * WhatsApp Web Automation Service - Multi-Account
 * يدعم ربط أكثر من حساب واتساب في نفس الوقت
 * كل حساب له client مستقل وجلسة مستقلة
 */

import path from "path";

const SESSION_DIR = path.join(process.cwd(), ".wwebjs_auth");

export type WaStatus =
  | "disconnected"
  | "qr_pending"
  | "initializing"
  | "connected"
  | "error";

export type SendResult = {
  success: boolean;
  phone: string;
  error?: string;
};

// حالة كل حساب
interface AccountSession {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  status: WaStatus;
  qrDataUrl: string | null;
  lastError: string | null;
  isInitializing: boolean;
}

// Map من accountId إلى جلسته
const sessions = new Map<string, AccountSession>();

// الحساب الافتراضي للتوافق مع الكود القديم
const DEFAULT_ACCOUNT = "default";

function getSession(accountId: string): AccountSession {
  if (!sessions.has(accountId)) {
    sessions.set(accountId, {
      client: null,
      status: "disconnected",
      qrDataUrl: null,
      lastError: null,
      isInitializing: false,
    });
  }
  return sessions.get(accountId)!;
}

// إنشاء client جديد لحساب معين
async function createClient(accountId: string) {
  const wweb = await import("whatsapp-web.js");
  const { Client, LocalAuth } = (wweb.default || wweb) as typeof wweb.default;
  return new Client({
    authStrategy: new LocalAuth({
      clientId: accountId, // كل حساب له مجلد جلسة منفصل
      dataPath: SESSION_DIR,
    }),
    puppeteer: {
      executablePath: "/usr/bin/chromium-browser",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--window-size=1280,900",
      ],
    },
  });
}

// توليد QR كـ Data URL
async function generateQrDataUrl(qr: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.default.toDataURL(qr, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// بدء جلسة واتساب لحساب معين
export async function startWhatsAppSession(accountId = DEFAULT_ACCOUNT): Promise<{
  status: WaStatus;
  qr?: string;
}> {
  const session = getSession(accountId);

  if (session.isInitializing) {
    return { status: session.status, qr: session.qrDataUrl || undefined };
  }

  if (session.status === "connected" && session.client) {
    return { status: "connected" };
  }

  try {
    session.isInitializing = true;
    session.status = "initializing";
    session.qrDataUrl = null;
    session.lastError = null;

    if (session.client) {
      try { await session.client.destroy(); } catch { /* تجاهل */ }
      session.client = null;
    }

    session.client = await createClient(accountId);

    session.client.on("qr", async (qr: string) => {
      try {
        session.qrDataUrl = await generateQrDataUrl(qr);
        session.status = "qr_pending";
        session.isInitializing = false;
      } catch (e) {
        console.error(`[${accountId}] QR generation error:`, e);
      }
    });

    session.client.on("ready", () => {
      session.status = "connected";
      session.qrDataUrl = null;
      session.isInitializing = false;
    });

    session.client.on("authenticated", () => {
      session.status = "connected";
      session.qrDataUrl = null;
      session.isInitializing = false;
    });

    session.client.on("auth_failure", (msg: string) => {
      session.status = "error";
      session.lastError = "فشل المصادقة: " + msg;
      session.isInitializing = false;
    });

    session.client.on("disconnected", () => {
      session.status = "disconnected";
      session.qrDataUrl = null;
      session.isInitializing = false;
    });

    session.client.initialize().catch((err: Error) => {
      if (!err.message.includes("Target closed")) {
        session.status = "error";
        session.lastError = err.message;
      }
      session.isInitializing = false;
    });

    // انتظر حتى يظهر QR أو يتصل (حد أقصى 40 ثانية)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = session.status as string;
      if (s === "qr_pending" || s === "connected") break;
      if (s === "error") return { status: "error" as WaStatus };
    }

    return { status: session.status, qr: session.qrDataUrl || undefined };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    session.status = "error";
    session.lastError = message;
    session.isInitializing = false;
    return { status: "error" };
  }
}

// جلب حالة جلسة حساب معين
export async function getSessionStatus(accountId = DEFAULT_ACCOUNT): Promise<{
  status: WaStatus;
  qr?: string;
  error?: string;
}> {
  const session = getSession(accountId);
  return {
    status: session.status,
    qr: session.qrDataUrl || undefined,
    error: session.lastError || undefined,
  };
}

// جلب حالة جميع الحسابات
export function getAllSessionsStatus(): Array<{
  accountId: string;
  status: WaStatus;
  qr?: string;
  error?: string;
}> {
  const result: Array<{ accountId: string; status: WaStatus; qr?: string; error?: string }> = [];
  sessions.forEach((session, accountId) => {
    result.push({
      accountId,
      status: session.status,
      qr: session.qrDataUrl || undefined,
      error: session.lastError || undefined,
    });
  });
  return result;
}

// إرسال رسالة لرقم واحد عبر حساب معين
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  accountId = DEFAULT_ACCOUNT
): Promise<SendResult> {
  let resolvedAccountId = accountId;
  let session = getSession(accountId);

  // إذا كان الحساب المطلوب غير متصل، ابحث عن أول حساب متصل
  if (session.status !== "connected" || !session.client) {
    let foundConnected = false;
    sessions.forEach((s, id) => {
      if (!foundConnected && s.status === "connected" && s.client) {
        resolvedAccountId = id;
        session = s;
        foundConnected = true;
      }
    });
    if (!foundConnected) {
      return { success: false, phone, error: `لا يوجد حساب واتساب متصل. يرجى ربط حساب من صفحة واتساب أولاً` };
    }
  }

  try {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.startsWith("0")
      ? "966" + cleanPhone.slice(1)
      : cleanPhone.startsWith("966")
        ? cleanPhone
        : "966" + cleanPhone;
    const chatId = intlPhone + "@c.us";

    await session.client.sendMessage(chatId, message);
    return { success: true, phone };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, phone, error: message };
  }
}

// إرسال رسائل مجمعة مع تأخير بشري
export async function sendBulkMessages(
  messages: Array<{
    phone: string;
    message: string;
    leadId: number;
    companyName: string;
  }>,
  onProgress?: (index: number, result: SendResult) => void,
  accountId = DEFAULT_ACCOUNT,
  delayMs = 10000
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const { phone, message } = messages[i];
    const result = await sendWhatsAppMessage(phone, message, accountId);
    results.push(result);
    if (onProgress) onProgress(i, result);

    if (i < messages.length - 1) {
      const delay = delayMs + Math.random() * 2000; // تأخير + 0-2 ثانية عشوائية
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return results;
}

// قطع الاتصال لحساب معين
export async function disconnectWhatsApp(accountId = DEFAULT_ACCOUNT): Promise<void> {
  const session = getSession(accountId);
  session.isInitializing = false;
  try {
    if (session.client) {
      await session.client.destroy();
      session.client = null;
    }
  } catch { /* تجاهل */ }
  session.status = "disconnected";
  session.qrDataUrl = null;
}

// قطع الاتصال لجميع الحسابات
export async function disconnectAll(): Promise<void> {
  const accountIds: string[] = [];
  sessions.forEach((_, accountId) => accountIds.push(accountId));
  for (const accountId of accountIds) {
    await disconnectWhatsApp(accountId);
  }
}
