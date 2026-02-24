import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getWeeklyReports, getWeeklyReportById, createWeeklyReport, updateWeeklyReport,
  getReminders
} from "../db";
import { invokeLLM } from "../_core/llm";

export const weeklyReportsRouter = router({
  // قائمة التقارير
  list: protectedProcedure.query(async () => {
    return getWeeklyReports();
  }),

  // تفاصيل تقرير
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getWeeklyReportById(input.id);
    }),

  // توليد تقرير أسبوعي جديد
  generate: protectedProcedure
    .input(z.object({
      weekStart: z.string().optional(), // ISO date string, defaults to last Monday
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { leads, whatsappMessages, whatsappChatMessages } = await import("../../drizzle/schema");
      const { sql, and, gte, lt, count, eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      // حساب نطاق الأسبوع
      const now = new Date();
      let weekStart: Date;
      if (input.weekStart) {
        weekStart = new Date(input.weekStart);
      } else {
        // الاثنين الماضي
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        weekStart = new Date(now.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
      }
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      // جمع الإحصائيات
      const allLeads = await db.select().from(leads);
      const totalLeads = allLeads.length;
      const newLeads = allLeads.filter(l =>
        l.createdAt >= weekStart && l.createdAt < weekEnd
      ).length;
      const analyzedLeads = allLeads.filter(l => l.analysisStatus === "completed").length;

      // رسائل الأسبوع
      const sentMsgs = await db.select().from(whatsappMessages)
        .where(and(gte(whatsappMessages.sentAt, weekStart), lt(whatsappMessages.sentAt, weekEnd)));
      const messagesSent = sentMsgs.length;

      // رسائل واردة
      const receivedMsgs = await db.select().from(whatsappChatMessages)
        .where(and(
          eq(whatsappChatMessages.direction, "incoming"),
          gte(whatsappChatMessages.sentAt, weekStart),
          lt(whatsappChatMessages.sentAt, weekEnd)
        ));
      const messagesReceived = receivedMsgs.length;

      // معدل الاستجابة
      const responseRate = messagesSent > 0
        ? Math.round((messagesReceived / messagesSent) * 100 * 10) / 10
        : 0;

      // عملاء ساخنون (score >= 8)
      const hotLeads = allLeads.filter(l => (l.leadPriorityScore ?? 0) >= 8).length;

      // التذكيرات
      const allReminders = await getReminders();
      const completedReminders = allReminders.filter(r =>
        r.status === "done" && r.completedAt && r.completedAt >= weekStart && r.completedAt < weekEnd
      ).length;
      const pendingReminders = allReminders.filter(r => r.status === "pending").length;

      // أكثر المدن
      const cityMap: Record<string, number> = {};
      allLeads.forEach(l => { cityMap[l.city] = (cityMap[l.city] || 0) + 1; });
      const topCities = Object.entries(cityMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }));

      // أكثر الأنشطة
      const typeMap: Record<string, number> = {};
      allLeads.forEach(l => { typeMap[l.businessType] = (typeMap[l.businessType] || 0) + 1; });
      const topBusinessTypes = Object.entries(typeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      // توليد ملخص AI
      let summaryText = "";
      try {
        const aiResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "أنت محلل تسويق رقمي محترف. اكتب ملخصاً موجزاً وعملياً للتقرير الأسبوعي باللغة العربية."
            },
            {
              role: "user",
              content: `ملخص أسبوع ${weekStart.toLocaleDateString('ar-SA')} - ${weekEnd.toLocaleDateString('ar-SA')}:
- إجمالي العملاء: ${totalLeads} (جديد هذا الأسبوع: ${newLeads})
- رسائل مرسلة: ${messagesSent} | ردود مستلمة: ${messagesReceived} | معدل الاستجابة: ${responseRate}%
- عملاء ساخنون: ${hotLeads}
- تذكيرات مكتملة: ${completedReminders} | معلقة: ${pendingReminders}
- أكثر المدن: ${topCities.slice(0, 3).map(c => c.city).join(', ')}

اكتب ملخصاً من 3-4 جمل يبرز الإنجازات والتحديات والتوصيات للأسبوع القادم.`
            }
          ]
        });
        summaryText = (aiResponse as any)?.choices?.[0]?.message?.content || "";
      } catch (e) {
        summaryText = `تقرير أسبوع ${weekStart.toLocaleDateString('ar-SA')}: تم إرسال ${messagesSent} رسالة، معدل الاستجابة ${responseRate}%، ${newLeads} عميل جديد.`;
      }

      // حفظ التقرير
      const report = await createWeeklyReport({
        weekStart,
        weekEnd,
        totalLeads,
        newLeads,
        analyzedLeads,
        messagesSent,
        messagesReceived,
        responseRate,
        hotLeads,
        completedReminders,
        pendingReminders,
        topCities,
        topBusinessTypes,
        summaryText,
      });

      return report;
    }),

  // إرسال التقرير عبر واتساب
  sendViaWhatsapp: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      const report = await getWeeklyReportById(input.reportId);
      if (!report) throw new Error("التقرير غير موجود");

      const { sendWhatsAppMessage } = await import("../whatsappAutomation");
      const { ENV } = await import("../_core/env");

      // بناء رسالة التقرير
      const weekLabel = `${new Date(report.weekStart).toLocaleDateString('ar-SA')} - ${new Date(report.weekEnd).toLocaleDateString('ar-SA')}`;
      const message = `📊 *التقرير الأسبوعي*\n📅 ${weekLabel}\n\n` +
        `👥 إجمالي العملاء: *${report.totalLeads}* (جديد: ${report.newLeads})\n` +
        `📤 رسائل مرسلة: *${report.messagesSent}*\n` +
        `📥 ردود مستلمة: *${report.messagesReceived}*\n` +
        `📈 معدل الاستجابة: *${report.responseRate}%*\n` +
        `🔥 عملاء ساخنون: *${report.hotLeads}*\n` +
        `✅ تذكيرات مكتملة: *${report.completedReminders}*\n` +
        `⏰ تذكيرات معلقة: *${report.pendingReminders}*\n\n` +
        (report.summaryText ? `💡 *الملخص:*\n${report.summaryText}` : "");

      // إرسال للمالك
      const ownerPhone = ENV.ownerOpenId || "";
      if (!ownerPhone) {
        return { success: false, error: "لم يُحدد رقم المالك" };
      }

      try {
        await sendWhatsAppMessage(ownerPhone, message);
        await updateWeeklyReport(input.reportId, { sentViaWhatsapp: true, sentAt: new Date() });
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),
});
