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
// نستخدم global variable لتبقى بين HMR reloads وتمنع إعادة إنشاء clients
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _gSessions = global as any;
if (!_gSessions.__waSessions) _gSessions.__waSessions = new Map<string, AccountSession>();
const sessions: Map<string, AccountSession> = _gSessions.__waSessions;

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
      console.log(`[${accountId}] ✅ متصل (ready)`);
    });

    session.client.on("authenticated", () => {
      session.status = "connected";
      session.qrDataUrl = null;
      session.isInitializing = false;
      console.log(`[${accountId}] ✅ متصل (authenticated)`);
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

    // معالجة الرسائل الواردة
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session.client.on("message", async (msg: any) => {
      try {
        // تجاهل الرسائل الصادرة من الحساب نفسه
        if (msg.fromMe) return;
        // منع معالجة نفس الرسالة أكثر من مرة (حماية من تكرار الرد)
        const msgId = msg.id?._serialized || msg.id?.id || `${msg.from}-${msg.timestamp}`;
        if (!markMessageProcessed(msgId)) {
          console.log(`[${accountId}] تجاهل رسالة مكررة: ${msgId}`);
          return;
        }
        // تجاهل رسائل جروبات الواتساب (@g.us)
        if (msg.from && msg.from.includes("@g.us")) {
          console.log(`[${accountId}] تجاهل رسالة جروب واتساب: ${msg.from}`);
          return;
        }
        // تجاهل القصص والحالات (status@broadcast)
        if (msg.from && (msg.from.includes("status@broadcast") || msg.from === "status@broadcast")) {
          console.log(`[${accountId}] تجاهل قصة/حالة: ${msg.from}`);
          return;
        }
        // تجاهل قوائم البث (@broadcast)
        if (msg.from && msg.from.includes("@broadcast") && !msg.from.includes("status@broadcast")) {
          console.log(`[${accountId}] تجاهل رسالة broadcast: ${msg.from}`);
          return;
        }
        // تجاهل رسائل الفيسبوك/الميتا (تبدأ بـ fb: أو meta:)
        if (msg.from && (msg.from.startsWith("fb:") || msg.from.startsWith("meta:") || msg.from.includes("@facebook"))) {
          console.log(`[${accountId}] تجاهل رسالة فيسبوك/ميتا: ${msg.from}`);
          return;
        }
        // استخراج رقم المرسل
        const rawPhone = msg.from.replace("@c.us", "").replace("@s.whatsapp.net", "");
        // محاولة جلب اسم جهة الاتصال
        let contactName: string | undefined;
        try {
          const contact = await msg.getContact();
          contactName = contact.pushname || contact.name || undefined;
        } catch { /* تجاهل */ }

        let mediaBase64: string | undefined;
        let mimetype: string | undefined;
        let filename: string | undefined;

        if (msg.hasMedia) {
          try {
            const media = await msg.downloadMedia();
            if (media) {
              mediaBase64 = media.data;
              mimetype = media.mimetype;
              filename = media.filename || undefined;
            }
          } catch { /* تجاهل خطأ تحميل الوسائط */ }
        }

        const _handler = getIncomingHandler();
        if (_handler) {
          await _handler({
            accountId,
            phone: rawPhone,
            contactName,
            message: msg.body || "",
            hasMedia: msg.hasMedia,
            mediaBase64,
            mimetype,
            filename,
          });
        }
      } catch (err) {
        console.error(`[${accountId}] خطأ في معالجة رسالة واردة:`, err);
      }
    });

    session.client.initialize().catch((err: Error) => {
      if (!err.message.includes("Target closed")) {
        session.status = "error";
        session.lastError = err.message;
      }
      session.isInitializing = false;
    });

    // فحص دوري كل 5 ثوانٍ لاكتشاف الاتصال إذا فات حدث ready/authenticated
    const statusChecker = setInterval(() => {
      try {
        if (!session.client) { clearInterval(statusChecker); return; }
        if (session.status === 'connected') { clearInterval(statusChecker); return; }
        const clientAny = session.client as any;
        if (clientAny.pupPage && !clientAny.pupPage.isClosed()) {
          clientAny.getState?.().then((state: string) => {
            if (state === 'CONNECTED' && session.status !== 'connected') {
              session.status = 'connected';
              session.qrDataUrl = null;
              session.isInitializing = false;
              clearInterval(statusChecker);
              console.log(`[${accountId}] ✅ تم اكتشاف الاتصال عبر الفحص الدوري`);
            }
          }).catch(() => {});
        }
      } catch { /* تجاهل */ }
    }, 5000);
    // إيقاف الفحص بعد 3 دقائق
    setTimeout(() => clearInterval(statusChecker), 180000);

    // لا ننتظر - نبدأ في الخلفية ونرجع فوراً
    // الـ UI يتابع الحالة عبر allStatus query كل 2 ثانية
    return { status: "initializing" as WaStatus };
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

export type SendMediaResult = {
  success: boolean;
  phone: string;
  error?: string;
};

// إرسال صورة أو ملف عبر واتساب
export async function sendWhatsAppMedia(
  phone: string,
  mediaBase64: string,
  mimetype: string,
  filename: string,
  caption: string = "",
  accountId = DEFAULT_ACCOUNT
): Promise<SendMediaResult> {
  let resolvedAccountId = accountId;
  let session = getSession(accountId);

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
      return { success: false, phone, error: `لا يوجد حساب واتساب متصل` };
    }
  }

  try {
    const wweb = await import("whatsapp-web.js");
    const { MessageMedia } = (wweb.default || wweb) as typeof wweb.default;
    const media = new MessageMedia(mimetype, mediaBase64, filename);
    // إذا كان الرقم بصيغة LID أرسله مباشرة
    if (phone.includes("@lid") || phone.includes("@c.us") || phone.includes("@s.whatsapp.net")) {
      await session.client.sendMessage(phone, media, { caption });
      return { success: true, phone };
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    let intlPhone: string;
    if (cleanPhone.startsWith("00")) {
      intlPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith("0") && cleanPhone.length <= 10) {
      intlPhone = "966" + cleanPhone.slice(1);
    } else if (cleanPhone.length <= 9) {
      intlPhone = "966" + cleanPhone;
    } else {
      intlPhone = cleanPhone;
    }
    let chatId: string;
    try {
      const numberId = await session.client.getNumberId(intlPhone);
      if (numberId) {
        chatId = numberId._serialized;
      } else {
        return { success: false, phone, error: `الرقم ${phone} غير مسجل على واتساب` };
      }
    } catch {
      chatId = intlPhone + "@c.us";
    }
    await session.client.sendMessage(chatId, media, { caption });
    return { success: true, phone };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { success: false, phone, error: errMsg };
  }
}

// نوع callback لمعالجة الرسائل الواردة
export type IncomingMessageHandler = (params: {
  accountId: string;
  phone: string;
  contactName?: string;
  message: string;
  hasMedia: boolean;
  mediaBase64?: string;
  mimetype?: string;
  filename?: string;
}) => Promise<void>;

// نستخدم global variable لكل من incomingMessageHandler و processedMessageIds
// لتبقى بين HMR reloads وتمنع تكرار المعالجة
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _globalAny = global as any;
if (!_globalAny.__waProcessedMsgIds) _globalAny.__waProcessedMsgIds = new Set<string>();
const processedMessageIds: Set<string> = _globalAny.__waProcessedMsgIds;

// incomingMessageHandler كـ global لتبقى بين HMR reloads
function getIncomingHandler(): IncomingMessageHandler | null {
  return _globalAny.__waIncomingHandler ?? null;
}
const PROCESSED_MSG_TTL = 30000; // 30 ثانية

function markMessageProcessed(msgId: string): boolean {
  if (processedMessageIds.has(msgId)) return false; // تم معالجتها مسبقاً
  processedMessageIds.add(msgId);
  // حذف الـ ID بعد 30 ثانية لتجنب تراكم الذاكرة
  setTimeout(() => processedMessageIds.delete(msgId), PROCESSED_MSG_TTL);
  return true; // أول معالجة
}

export function setIncomingMessageHandler(handler: IncomingMessageHandler) {
  _globalAny.__waIncomingHandler = handler;
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
    // إذا كان الرقم بصيغة LID (مثل 237164554141949@lid) أرسله مباشرة
    if (phone.includes("@lid") || phone.includes("@c.us") || phone.includes("@s.whatsapp.net")) {
      await session.client.sendMessage(phone, message);
      return { success: true, phone };
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    // تنسيق الرقم بشكل صحيح:
    // - إذا بدأ بـ 00 أزل الأصفار (00966... تصبح 966...)
    // - إذا بدأ بصفر واحد فقط (محلي) أضف 966
    // - إذا كان أقل من 10 أرقام فهو رقم سعودي محلي أضف 966
    // - في جميع الحالات الأخرى احتفظ بالرقم كما هو
    let intlPhone: string;
    if (cleanPhone.startsWith("00")) {
      intlPhone = cleanPhone.slice(2);
    } else if (cleanPhone.startsWith("0") && cleanPhone.length <= 10) {
      intlPhone = "966" + cleanPhone.slice(1);
    } else if (cleanPhone.length <= 9) {
      intlPhone = "966" + cleanPhone;
    } else {
      intlPhone = cleanPhone;
    }
    // استخدام getNumberId للحصول على chatId الصحيح وتجنب خطأ "No LID for user"
    let chatId: string;
    try {
      const numberId = await session.client.getNumberId(intlPhone);
      if (numberId) {
        chatId = numberId._serialized;
      } else {
        return { success: false, phone, error: `الرقم ${phone} غير مسجل على واتساب` };
      }
    } catch {
      // fallback: استخدام التنسيق اليدوي إذا فشل getNumberId
      chatId = intlPhone + "@c.us";
    }
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
