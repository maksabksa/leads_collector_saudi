/**
 * WhatsApp Web Automation Service
 * يستخدم whatsapp-web.js للتحكم الكامل في واتساب ويب
 * يولّد QR كـ Data URL ويرسل الرسائل مباشرة
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Client, LocalAuth } = require("whatsapp-web.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require("qrcode");
import path from "path";

const SESSION_DIR = path.join(process.cwd(), ".wwebjs_auth");

// حالة الجلسة
export type WaStatus =
  | "disconnected"
  | "qr_pending"
  | "initializing"
  | "connected"
  | "sending"
  | "error";

export type SendResult = {
  success: boolean;
  phone: string;
  error?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let currentStatus: WaStatus = "disconnected";
let qrDataUrl: string | null = null;
let lastError: string | null = null;
let isInitializing = false;

// إنشاء client جديد
function createClient() {
  return new Client({
    authStrategy: new LocalAuth({
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

// بدء جلسة واتساب
export async function startWhatsAppSession(): Promise<{
  status: WaStatus;
  qr?: string;
}> {
  // إذا كان يعمل بالفعل
  if (isInitializing) {
    return { status: currentStatus, qr: qrDataUrl || undefined };
  }

  // إذا كان متصلاً بالفعل
  if (currentStatus === "connected" && client) {
    return { status: "connected" };
  }

  try {
    isInitializing = true;
    currentStatus = "initializing";
    qrDataUrl = null;
    lastError = null;

    // أغلق client القديم
    if (client) {
      try { await client.destroy(); } catch { /* تجاهل */ }
      client = null;
    }

    client = createClient();

    // حدث QR — يُطلق عند ظهور رمز QR جديد
    client.on("qr", async (qr: string) => {
      try {
        qrDataUrl = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
        currentStatus = "qr_pending";
        isInitializing = false;
      } catch (e) {
        console.error("QR generation error:", e);
      }
    });

    // حدث الاتصال الناجح
    client.on("ready", () => {
      currentStatus = "connected";
      qrDataUrl = null;
      isInitializing = false;
    });

    // حدث المصادقة
    client.on("authenticated", () => {
      currentStatus = "connected";
      qrDataUrl = null;
      isInitializing = false;
    });

    // حدث فشل المصادقة
    client.on("auth_failure", (msg: string) => {
      currentStatus = "error";
      lastError = "فشل المصادقة: " + msg;
      isInitializing = false;
    });

    // حدث قطع الاتصال
    client.on("disconnected", () => {
      currentStatus = "disconnected";
      qrDataUrl = null;
      isInitializing = false;
    });

    // ابدأ التهيئة (لا تنتظرها — تعمل في الخلفية)
    client.initialize().catch((err: Error) => {
      if (!err.message.includes("Target closed")) {
        currentStatus = "error";
        lastError = err.message;
      }
      isInitializing = false;
    });

    // انتظر حتى يظهر QR أو يتصل (حد أقصى 40 ثانية)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const s = currentStatus as string;
      if (s === "qr_pending" || s === "connected") {
        break;
      }
      if (s === "error") {
        return { status: "error" as WaStatus };
      }
    }

    return {
      status: currentStatus,
      qr: qrDataUrl || undefined,
    };
  } catch (err: any) {
    currentStatus = "error";
    lastError = err.message;
    isInitializing = false;
    return { status: "error" };
  }
}

// جلب حالة الجلسة الحالية
export async function getSessionStatus(): Promise<{
  status: WaStatus;
  qr?: string;
  error?: string;
}> {
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
  if (currentStatus !== "connected" || !client) {
    return { success: false, phone, error: "واتساب غير متصل، يرجى ربط الحساب أولاً" };
  }

  try {
    // تنسيق الرقم الدولي
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.startsWith("0")
      ? "966" + cleanPhone.slice(1)
      : cleanPhone.startsWith("966")
        ? cleanPhone
        : "966" + cleanPhone;
    const chatId = intlPhone + "@c.us";

    await client.sendMessage(chatId, message);
    return { success: true, phone };
  } catch (err: any) {
    return { success: false, phone, error: err.message };
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
  isInitializing = false;
  try {
    if (client) {
      await client.destroy();
      client = null;
    }
  } catch { /* تجاهل */ }
  currentStatus = "disconnected";
  qrDataUrl = null;
}
