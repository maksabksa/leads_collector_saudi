/**
 * Activation Router - تنشيط التواصل بين الأرقام المربوطة
 * يجعل الأرقام ترسل رسائل طبيعية لبعضها البعض لإبقاء الأرقام نشطة
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { activationSettings, activationMessages, whatsappAccounts } from "../../drizzle/schema";
import { eq, desc, and, gte, count, sql } from "drizzle-orm";
import { getAllSessionsStatus, sendWhatsAppMessage } from "../whatsappAutomation";

// ===== رسائل طبيعية متنوعة للتنشيط =====
const CASUAL_MESSAGES = [
  "السلام عليكم، كيف الحال؟",
  "وعليكم السلام، الحمد لله بخير. وأنت؟",
  "أهلاً، كيف أحوالك؟",
  "بخير الحمد لله، إن شاء الله أنت بخير",
  "مرحبا، كل شي تمام؟",
  "الحمد لله، كيف العمل؟",
  "بخير، شكراً. كيف أنت؟",
  "تمام الحمد لله، ما أخبارك؟",
  "أهلاً وسهلاً، كيف الصحة؟",
  "الله يسلمك، كل شي تمام",
  "بخير بخير، شكراً على السؤال",
  "الحمد لله، إن شاء الله أنت بخير",
  "مرحبا، ما في جديد؟",
  "تمام، الحمد لله. وأنت؟",
  "بخير، كيف الأسرة؟",
  "الحمد لله، ما شاء الله",
  "أهلاً، كيف الأحوال؟",
  "بخير، شكراً. كيف حالك؟",
  "الله يسلمك، كيف الصحة؟",
  "تمام، إن شاء الله أنت بخير",
  "مرحبا، كيف العمل؟",
  "بخير الحمد لله، ما أخبارك؟",
  "أهلاً وسهلاً، كيف الحال؟",
  "الحمد لله، كل شي تمام",
  "بخير، شكراً على التواصل",
  "مرحبا، إن شاء الله بخير",
  "تمام الحمد لله، كيف أنت؟",
  "الله يسلمك، ما في جديد؟",
  "بخير، كيف الأسرة والأهل؟",
  "الحمد لله على كل حال",
];

const BUSINESS_MESSAGES = [
  "مرحبا، هل أنت متاح الآن؟",
  "أهلاً، أريد التنسيق معك",
  "السلام عليكم، هل وصلك الملف؟",
  "مرحبا، تم الانتهاء من المهمة",
  "أهلاً، هل راجعت الطلب؟",
  "مرحبا، موعدنا غداً إن شاء الله",
  "أهلاً، شكراً على المتابعة",
  "مرحبا، تم التحديث",
  "أهلاً، هل هناك أي تعديلات؟",
  "مرحبا، الأمور تسير بشكل جيد",
];

// ===== حالة التنشيط في الذاكرة =====
let activationTimer: ReturnType<typeof setInterval> | null = null;
let isActivationRunning = false;
let messagesTodayCount: Record<string, number> = {};
let lastResetDate = new Date().toDateString();

function getRandomMessage(style: string): string {
  const messages = style === "business" ? BUSINESS_MESSAGES
    : style === "mixed" ? [...CASUAL_MESSAGES, ...BUSINESS_MESSAGES]
    : CASUAL_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
}

function resetDailyCountIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    messagesTodayCount = {};
    lastResetDate = today;
  }
}

async function runActivationCycle() {
  try {
    const db = await getDb();
    if (!db) return;

    const [settings] = await db.select().from(activationSettings).limit(1);
    if (!settings || !settings.isActive) return;

    // فحص ساعات العمل
    const now = new Date();
    const hour = now.getHours();
    if (hour < settings.startHour || hour >= settings.endHour) return;

    // إعادة تعيين العداد اليومي إذا لزم
    resetDailyCountIfNeeded();

    // جلب الحسابات المتصلة
    const connectedSessions = getAllSessionsStatus().filter(s => s.status === "connected");
    if (connectedSessions.length < 2) return; // نحتاج حسابين على الأقل

    // اختيار حساب مرسِل عشوائي
    const senderIdx = Math.floor(Math.random() * connectedSessions.length);
    const sender = connectedSessions[senderIdx];

    // فحص الحد اليومي
    const todayCount = messagesTodayCount[sender.accountId] || 0;
    if (todayCount >= settings.messagesPerDay) return;

    // اختيار حساب مستقبِل مختلف
    const receivers = connectedSessions.filter(s => s.accountId !== sender.accountId);
    if (receivers.length === 0) return;
    const receiver = receivers[Math.floor(Math.random() * receivers.length)];

    // جلب رقم هاتف الحساب المستقبِل
    const [receiverAccount] = await db.select()
      .from(whatsappAccounts)
      .where(eq(whatsappAccounts.accountId, receiver.accountId))
      .limit(1);

    if (!receiverAccount?.phoneNumber) return;

    // توليد رسالة
    const message = getRandomMessage(settings.messageStyle);

    // إرسال الرسالة
    const result = await sendWhatsAppMessage(
      receiverAccount.phoneNumber,
      message,
      sender.accountId
    );

    // تسجيل الرسالة
    await db.insert(activationMessages).values({
      fromAccountId: sender.accountId,
      toAccountId: receiver.accountId,
      message,
      status: result.success ? "sent" : "failed",
      errorMessage: result.error || null,
    });

    // تحديث العداد
    messagesTodayCount[sender.accountId] = todayCount + 1;

    if (result.success) {
      console.log(`[Activation] ✅ رسالة تنشيط من ${sender.accountId} إلى ${receiverAccount.phoneNumber}`);
    } else {
      console.log(`[Activation] ❌ فشل إرسال رسالة تنشيط: ${result.error}`);
    }
  } catch (err) {
    console.error("[Activation] خطأ في دورة التنشيط:", err);
  }
}

async function startActivationLoop(minDelay: number, maxDelay: number) {
  if (isActivationRunning) return;
  isActivationRunning = true;

  const scheduleNext = async () => {
    if (!isActivationRunning) return;
    await runActivationCycle();
    const delay = (minDelay + Math.random() * (maxDelay - minDelay)) * 1000;
    activationTimer = setTimeout(scheduleNext, delay) as unknown as ReturnType<typeof setInterval>;
  };

  await scheduleNext();
}

function stopActivationLoop() {
  isActivationRunning = false;
  if (activationTimer) {
    clearTimeout(activationTimer as unknown as ReturnType<typeof setTimeout>);
    activationTimer = null;
  }
}

// ===== Router =====
export const activationRouter = router({
  // جلب الإعدادات الحالية
  getSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [settings] = await db.select().from(activationSettings).limit(1);
    return settings || null;
  }),

  // حفظ الإعدادات وبدء/إيقاف التنشيط
  saveSettings: protectedProcedure
    .input(z.object({
      isActive: z.boolean(),
      minDelaySeconds: z.number().min(30).max(3600),
      maxDelaySeconds: z.number().min(60).max(7200),
      messagesPerDay: z.number().min(1).max(100),
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(1).max(24),
      messageStyle: z.enum(["casual", "business", "mixed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [existing] = await db.select().from(activationSettings).limit(1);

      if (existing) {
        await db.update(activationSettings).set(input).where(eq(activationSettings.id, existing.id));
      } else {
        await db.insert(activationSettings).values(input);
      }

      // بدء أو إيقاف الحلقة
      if (input.isActive) {
        stopActivationLoop();
        await startActivationLoop(input.minDelaySeconds, input.maxDelaySeconds);
      } else {
        stopActivationLoop();
      }

      return { success: true };
    }),

  // جلب إحصائيات التنشيط
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalResult] = await db.select({ count: count() }).from(activationMessages);
    const [todayResult] = await db.select({ count: count() }).from(activationMessages)
      .where(gte(activationMessages.sentAt, today));
    const [successResult] = await db.select({ count: count() }).from(activationMessages)
      .where(eq(activationMessages.status, "sent"));

    const recentMessages = await db.select().from(activationMessages)
      .orderBy(desc(activationMessages.sentAt))
      .limit(20);

    return {
      total: totalResult.count,
      today: todayResult.count,
      success: successResult.count,
      isRunning: isActivationRunning,
      recentMessages,
    };
  }),

  // مسح السجل
  clearLog: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    await db.delete(activationMessages);
    return { success: true };
  }),

  // إرسال رسالة تنشيط يدوية فورية
  sendNow: protectedProcedure.mutation(async () => {
    await runActivationCycle();
    return { success: true };
  }),
});
