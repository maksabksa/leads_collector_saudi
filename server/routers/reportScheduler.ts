import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getReportSchedule, upsertReportSchedule } from "../db";

// ===== Router إعدادات الجدولة =====
export const reportSchedulerRouter = router({
  // جلب إعدادات الجدولة الحالية
  getSchedule: protectedProcedure.query(async () => {
    return getReportSchedule();
  }),

  // حفظ / تحديث إعدادات الجدولة
  saveSchedule: protectedProcedure
    .input(z.object({
      isEnabled: z.boolean(),
      dayOfWeek: z.number().min(0).max(6),          // 0=الأحد ... 6=السبت
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
      timezone: z.string().default("Asia/Riyadh"),
      whatsappAccountId: z.string().optional(),
      recipientPhone: z.string().optional(),
      includeLeadsStats: z.boolean().default(true),
      includeWhatsappStats: z.boolean().default(true),
      includeEmployeeStats: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      return upsertReportSchedule(input);
    }),

  // تشغيل يدوي فوري (للاختبار)
  triggerNow: protectedProcedure.mutation(async () => {
    return runScheduledReport();
  }),

  // جلب سجل آخر إرسال
  getLastSendStatus: protectedProcedure.query(async () => {
    const schedule = await getReportSchedule();
    if (!schedule) return null;
    return {
      lastSentAt: schedule.lastSentAt,
      lastSentStatus: schedule.lastSentStatus,
      lastSentError: schedule.lastSentError,
      totalSent: schedule.totalSent,
    };
  }),
});

// ===== منطق تنفيذ التقرير المجدول =====
export async function runScheduledReport(): Promise<{ success: boolean; error?: string }> {
  try {
    const { getDb } = await import("../db");
    const { weeklyReports, leads, whatsappMessages, whatsappChatMessages, whatsappAccounts } = await import("../../drizzle/schema");
    const { and, gte, lt, eq } = await import("drizzle-orm");
    const { invokeLLM } = await import("../_core/llm");
    const { createWeeklyReport, updateWeeklyReport, upsertReportSchedule, getReportSchedule } = await import("../db");
    const { sendWhatsAppMessage } = await import("../whatsappAutomation");

    const db = await getDb();
    if (!db) return { success: false, error: "قاعدة البيانات غير متاحة" };

    const schedule = await getReportSchedule();
    if (!schedule) return { success: false, error: "لا توجد إعدادات جدولة" };

    // تحديد نطاق الأسبوع
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setHours(0, 0, 0, 0);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 7);

    // إحصائيات العملاء
    const allLeads = await db.select().from(leads);
    const totalLeads = allLeads.length;
    const newLeads = allLeads.filter(l => l.createdAt >= weekStart && l.createdAt < weekEnd).length;
    const analyzedLeads = allLeads.filter(l => l.analysisStatus === "completed").length;
    const hotLeads = allLeads.filter(l => (l.leadPriorityScore ?? 0) >= 8).length;

    // إحصائيات الرسائل
    let messagesSent = 0;
    let messagesReceived = 0;
    if (schedule.includeWhatsappStats) {
      const sentMsgs = await db.select().from(whatsappMessages)
        .where(and(gte(whatsappMessages.sentAt, weekStart), lt(whatsappMessages.sentAt, weekEnd)));
      messagesSent = sentMsgs.length;
      const receivedMsgs = await db.select().from(whatsappChatMessages)
        .where(and(eq(whatsappChatMessages.direction, "incoming"), gte(whatsappChatMessages.sentAt, weekStart), lt(whatsappChatMessages.sentAt, weekEnd)));
      messagesReceived = receivedMsgs.length;
    }
    const responseRate = messagesSent > 0 ? Math.round((messagesReceived / messagesSent) * 100 * 10) / 10 : 0;

    // توزيع المدن
    const cityMap: Record<string, number> = {};
    allLeads.forEach(l => { cityMap[l.city] = (cityMap[l.city] || 0) + 1; });
    const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, count]) => ({ city, count }));

    // توزيع الأنشطة
    const typeMap: Record<string, number> = {};
    allLeads.forEach(l => { typeMap[l.businessType] = (typeMap[l.businessType] || 0) + 1; });
    const topBusinessTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => ({ type, count }));

    // توليد ملخص AI
    let summaryText = "";
    try {
      const aiResponse = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل تسويق رقمي محترف. اكتب ملخصاً موجزاً وعملياً للتقرير الأسبوعي باللغة العربية." },
          { role: "user", content: `تقرير أسبوع ${weekStart.toLocaleDateString('ar-SA')} - ${weekEnd.toLocaleDateString('ar-SA')}:\n- إجمالي العملاء: ${totalLeads} (جديد: ${newLeads})\n- رسائل مرسلة: ${messagesSent} | ردود: ${messagesReceived} | معدل الاستجابة: ${responseRate}%\n- عملاء ساخنون: ${hotLeads}\n- أكثر المدن: ${topCities.slice(0, 3).map(c => c.city).join(', ')}\nاكتب ملخصاً من 3-4 جمل يبرز الإنجازات والتوصيات.` }
        ]
      });
      summaryText = (aiResponse as any)?.choices?.[0]?.message?.content || "";
    } catch {
      summaryText = `تقرير أسبوع ${weekStart.toLocaleDateString('ar-SA')}: تم إرسال ${messagesSent} رسالة، معدل الاستجابة ${responseRate}%، ${newLeads} عميل جديد.`;
    }

    // حفظ التقرير
    const report = await createWeeklyReport({
      weekStart, weekEnd, totalLeads, newLeads, analyzedLeads,
      messagesSent, messagesReceived, responseRate, hotLeads,
      completedReminders: 0, pendingReminders: 0,
      topCities, topBusinessTypes, summaryText,
    });

    // إرسال عبر واتساب
    const recipientPhone = schedule.recipientPhone;
    if (recipientPhone) {
      const weekLabel = `${weekStart.toLocaleDateString('ar-SA')} - ${weekEnd.toLocaleDateString('ar-SA')}`;
      const message = `📊 *التقرير الأسبوعي التلقائي*\n📅 ${weekLabel}\n\n` +
        `👥 إجمالي العملاء: *${totalLeads}* (جديد: ${newLeads})\n` +
        `📤 رسائل مرسلة: *${messagesSent}*\n` +
        `📥 ردود مستلمة: *${messagesReceived}*\n` +
        `📈 معدل الاستجابة: *${responseRate}%*\n` +
        `🔥 عملاء ساخنون: *${hotLeads}*\n\n` +
        (summaryText ? `💡 *الملخص:*\n${summaryText}` : "");

      await sendWhatsAppMessage(recipientPhone, message, schedule.whatsappAccountId || undefined);
      await updateWeeklyReport(report.id, { sentViaWhatsapp: true, sentAt: new Date() });
    }

    // تحديث سجل الجدولة
    await upsertReportSchedule({
      lastSentAt: new Date(),
      lastSentStatus: "success",
      lastSentError: null,
      totalSent: (schedule.totalSent || 0) + 1,
    });

    return { success: true };
  } catch (e: any) {
    // تسجيل الخطأ
    try {
      const { upsertReportSchedule } = await import("../db");
      await upsertReportSchedule({ lastSentStatus: "failed", lastSentError: e.message });
    } catch {}
    return { success: false, error: e.message };
  }
}

// ===== Cron Job: يعمل كل دقيقة ويفحص إذا حان وقت الإرسال =====
let cronStarted = false;

export function startReportSchedulerCron() {
  if (cronStarted) return;
  cronStarted = true;

  setInterval(async () => {
    try {
      const schedule = await getReportSchedule();
      if (!schedule || !schedule.isEnabled) return;

      // حساب الوقت الحالي في المنطقة الزمنية المحددة
      const now = new Date();
      const tzOffset = getTzOffset(schedule.timezone);
      const localNow = new Date(now.getTime() + tzOffset * 60000);

      const currentDay = localNow.getUTCDay();      // 0=الأحد
      const currentHour = localNow.getUTCHours();
      const currentMinute = localNow.getUTCMinutes();

      // هل حان الوقت المحدد؟
      if (
        currentDay === schedule.dayOfWeek &&
        currentHour === schedule.hour &&
        currentMinute === schedule.minute
      ) {
        // تحقق أننا لم نرسل خلال آخر 5 دقائق (منع التكرار)
        if (schedule.lastSentAt) {
          const minutesSinceLast = (now.getTime() - new Date(schedule.lastSentAt).getTime()) / 60000;
          if (minutesSinceLast < 5) return;
        }
        console.log("[ReportScheduler] حان وقت إرسال التقرير الأسبوعي التلقائي...");
        const result = await runScheduledReport();
        console.log("[ReportScheduler] نتيجة الإرسال:", result);
      }
    } catch (e: any) {
      console.error("[ReportScheduler] خطأ في cron:", e);
      // إعادة ضبط الاتصال عند ECONNRESET
      if (e?.code === 'ECONNRESET' || e?.cause?.code === 'ECONNRESET') {
        const { resetDbConnection } = await import("../db");
        resetDbConnection();
      }
    }
  }, 60 * 1000); // كل دقيقة

  console.log("[ReportScheduler] Cron job بدأ - يفحص كل دقيقة");
}

// حساب offset المنطقة الزمنية بالدقائق
function getTzOffset(timezone: string): number {
  const tzMap: Record<string, number> = {
    "Asia/Riyadh": 180,
    "Asia/Dubai": 240,
    "Asia/Kuwait": 180,
    "Asia/Bahrain": 180,
    "Asia/Qatar": 180,
    "Asia/Muscat": 240,
    "Africa/Cairo": 120,
    "Asia/Baghdad": 180,
    "Asia/Amman": 120,
    "Asia/Beirut": 120,
    "Africa/Tripoli": 120,
    "Africa/Tunis": 60,
    "Africa/Algiers": 60,
    "Africa/Casablanca": 0,
    "Europe/London": 0,
    "Europe/Paris": 60,
  };
  return tzMap[timezone] ?? 180;
}
