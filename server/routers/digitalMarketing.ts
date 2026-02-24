import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import { sql, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import {
  leads,
  whatsappChats,
  whatsappChatMessages,
  campaigns,
} from "../../drizzle/schema";

// دالة مساعدة لحساب التاريخ قبل X يوم بصيغة MySQL
function daysAgoStr(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

export const digitalMarketingRouter = router({
  // إحصائيات عامة للتسويق الرقمي
  getOverviewStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    // إحصائيات العملاء
    const [leadsStats] = await db.select({
      totalLeads: sql<number>`COUNT(*)`,
      analyzedLeads: sql<number>`SUM(CASE WHEN ${leads.analysisStatus}='completed' THEN 1 ELSE 0 END)`,
      hotLeads: sql<number>`SUM(CASE WHEN ${leads.leadPriorityScore} >= 8 THEN 1 ELSE 0 END)`,
      warmLeads: sql<number>`SUM(CASE WHEN ${leads.leadPriorityScore} >= 6 AND ${leads.leadPriorityScore} < 8 THEN 1 ELSE 0 END)`,
      coldLeads: sql<number>`SUM(CASE WHEN ${leads.leadPriorityScore} < 6 OR ${leads.leadPriorityScore} IS NULL THEN 1 ELSE 0 END)`,
      avgScore: sql<number>`AVG(${leads.leadPriorityScore})`,
      hasWebsite: sql<number>`SUM(CASE WHEN ${leads.website} IS NOT NULL AND ${leads.website} != '' THEN 1 ELSE 0 END)`,
      hasInstagram: sql<number>`SUM(CASE WHEN ${leads.instagramUrl} IS NOT NULL AND ${leads.instagramUrl} != '' THEN 1 ELSE 0 END)`,
      hasWhatsapp: sql<number>`SUM(CASE WHEN ${leads.hasWhatsapp} = 1 THEN 1 ELSE 0 END)`,
    }).from(leads);

    // إحصائيات المحادثات
    const [chatsStats] = await db.select({
      totalChats: sql<number>`COUNT(*)`,
      totalUnread: sql<number>`SUM(${whatsappChats.unreadCount})`,
      aiEnabled: sql<number>`SUM(CASE WHEN ${whatsappChats.aiAutoReplyEnabled} = 1 THEN 1 ELSE 0 END)`,
      closedDeals: sql<number>`SUM(CASE WHEN ${whatsappChats.closedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
    }).from(whatsappChats);

    // إحصائيات الرسائل (آخر 30 يوم)
    const startDate30 = daysAgoStr(30);
    const [msgsStats] = await db.select({
      totalMessages: sql<number>`COUNT(*)`,
      uniqueContacts: sql<number>`COUNT(DISTINCT ${whatsappChatMessages.chatId})`,
    }).from(whatsappChatMessages)
      .where(sql`${whatsappChatMessages.sentAt} >= ${startDate30}`);

    // أنواع الأعمال الأكثر شيوعاً
    const businessTypes = await db.select({
      businessType: leads.businessType,
      count: sql<number>`COUNT(*)`,
    }).from(leads)
      .where(sql`${leads.businessType} IS NOT NULL AND ${leads.businessType} != ''`)
      .groupBy(leads.businessType)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // المناطق الأكثر شيوعاً
    const zones = await db.select({
      zoneName: leads.zoneName,
      count: sql<number>`COUNT(*)`,
    }).from(leads)
      .where(sql`${leads.zoneName} IS NOT NULL AND ${leads.zoneName} != ''`)
      .groupBy(leads.zoneName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return {
      leads: leadsStats,
      chats: chatsStats,
      messages: msgsStats,
      businessTypes,
      zones,
    };
  }),

  // تحليل الرسائل اليومية آخر 14 يوم
  getDailyMessageStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const startDate14 = daysAgoStr(14);
    const rows = await db.select({
      msgDate: sql<string>`DATE(${whatsappChatMessages.sentAt})`,
      total: sql<number>`COUNT(*)`,
      aiMessages: sql<number>`SUM(CASE WHEN ${whatsappChatMessages.isAutoReply} = 1 THEN 1 ELSE 0 END)`,
      uniqueContacts: sql<number>`COUNT(DISTINCT ${whatsappChatMessages.chatId})`,
    }).from(whatsappChatMessages)
      .where(sql`${whatsappChatMessages.sentAt} >= ${startDate14}`)
      .groupBy(sql`DATE(${whatsappChatMessages.sentAt})`)
      .orderBy(sql`DATE(${whatsappChatMessages.sentAt}) ASC`);

    return rows.map((r) => ({
      date: r.msgDate ? new Date(r.msgDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '',
      total: Number(r.total),
      aiMessages: Number(r.aiMessages),
      uniqueContacts: Number(r.uniqueContacts),
    }));
  }),

  // تحليل فجوات التسويق الرقمي
  getMarketingGaps: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [gaps] = await db.select({
      noWebsite: sql<number>`SUM(CASE WHEN ${leads.website} IS NULL OR ${leads.website} = '' THEN 1 ELSE 0 END)`,
      noInstagram: sql<number>`SUM(CASE WHEN ${leads.instagramUrl} IS NULL OR ${leads.instagramUrl} = '' THEN 1 ELSE 0 END)`,
      noTwitter: sql<number>`SUM(CASE WHEN ${leads.twitterUrl} IS NULL OR ${leads.twitterUrl} = '' THEN 1 ELSE 0 END)`,
      noSnapchat: sql<number>`SUM(CASE WHEN ${leads.snapchatUrl} IS NULL OR ${leads.snapchatUrl} = '' THEN 1 ELSE 0 END)`,
      noTiktok: sql<number>`SUM(CASE WHEN ${leads.tiktokUrl} IS NULL OR ${leads.tiktokUrl} = '' THEN 1 ELSE 0 END)`,
      noFacebook: sql<number>`SUM(CASE WHEN ${leads.facebookUrl} IS NULL OR ${leads.facebookUrl} = '' THEN 1 ELSE 0 END)`,
      noWhatsapp: sql<number>`SUM(CASE WHEN ${leads.hasWhatsapp} = 0 OR ${leads.hasWhatsapp} IS NULL THEN 1 ELSE 0 END)`,
      total: sql<number>`COUNT(*)`,
    }).from(leads);

    return gaps;
  }),

  // أفضل العملاء بالأولوية
  getTopLeads: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select({
        id: leads.id,
        companyName: leads.companyName,
        businessType: leads.businessType,
        city: leads.city,
        district: leads.district,
        leadPriorityScore: leads.leadPriorityScore,
        biggestMarketingGap: leads.biggestMarketingGap,
        suggestedSalesEntryAngle: leads.suggestedSalesEntryAngle,
        website: leads.website,
        instagramUrl: leads.instagramUrl,
        hasWhatsapp: leads.hasWhatsapp,
        analysisStatus: leads.analysisStatus,
        stage: leads.stage,
        priority: leads.priority,
      }).from(leads)
        .where(sql`${leads.leadPriorityScore} IS NOT NULL`)
        .orderBy(sql`${leads.leadPriorityScore} DESC`)
        .limit(input.limit);
    }),

  // تحليل AI شامل للسوق
  generateMarketInsight: protectedProcedure
    .input(z.object({
      businessType: z.string().optional(),
      zone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const conditions: ReturnType<typeof sql>[] = [];
      if (input.businessType) {
        conditions.push(sql`${leads.businessType} = ${input.businessType}`);
      }

      const [data] = await db.select({
        total: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${leads.leadPriorityScore})`,
        hasWebsite: sql<number>`SUM(CASE WHEN ${leads.website} IS NOT NULL AND ${leads.website} != '' THEN 1 ELSE 0 END)`,
        hasInstagram: sql<number>`SUM(CASE WHEN ${leads.instagramUrl} IS NOT NULL AND ${leads.instagramUrl} != '' THEN 1 ELSE 0 END)`,
        hasWhatsapp: sql<number>`SUM(CASE WHEN ${leads.hasWhatsapp} = 1 THEN 1 ELSE 0 END)`,
        types: sql<string>`GROUP_CONCAT(DISTINCT ${leads.businessType} SEPARATOR ', ')`,
      }).from(leads)
        .where(conditions.length > 0 ? and(...conditions as any) : undefined);

      const total = Number(data.total) || 1;
      const prompt = `أنت خبير تسويق رقمي متخصص في السوق السعودي.
بناءً على البيانات التالية لعملاء محتملين:
- إجمالي العملاء: ${total}
- متوسط درجة الأولوية: ${Number(data.avgScore || 0).toFixed(1)}/10
- لديهم موقع إلكتروني: ${data.hasWebsite} (${Math.round(Number(data.hasWebsite)/total*100)}%)
- لديهم إنستغرام: ${data.hasInstagram} (${Math.round(Number(data.hasInstagram)/total*100)}%)
- لديهم واتساب: ${data.hasWhatsapp} (${Math.round(Number(data.hasWhatsapp)/total*100)}%)
- أنواع الأعمال: ${data.types}
${input.businessType ? `- التركيز على: ${input.businessType}` : ''}
${input.zone ? `- المنطقة: ${input.zone}` : ''}

قدم تحليلاً تسويقياً دقيقاً يشمل:
1. أبرز الفرص التسويقية الرقمية
2. أكثر القنوات فعالية لهذا القطاع
3. أفضل رسائل البيع المناسبة
4. التوقيت الأمثل للتواصل
5. توصيات عملية قابلة للتطبيق فوراً

اجعل التحليل دقيقاً ومخصصاً للسوق السعودي.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي متخصص في السوق السعودي. قدم تحليلاً احترافياً ومفيداً." },
          { role: "user", content: prompt },
        ],
      });

      return {
        insight: response.choices[0]?.message?.content ?? "لم يتمكن النظام من توليد التحليل",
        dataUsed: data,
      };
    }),

  // إحصائيات أداء الحملات
  getCampaignStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const startDate30 = daysAgoStr(30);
    try {
      const rows = await db.select({
        msgDate: sql<string>`DATE(${campaigns.createdAt})`,
        sent: sql<number>`COUNT(*)`,
        delivered: sql<number>`SUM(CASE WHEN ${campaigns.status} = 'sent' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${campaigns.status} = 'failed' THEN 1 ELSE 0 END)`,
      }).from(campaigns)
        .where(sql`${campaigns.createdAt} >= ${startDate30}`)
        .groupBy(sql`DATE(${campaigns.createdAt})`)
        .orderBy(sql`DATE(${campaigns.createdAt}) ASC`);

      return rows.map((r) => ({
        date: r.msgDate ? new Date(r.msgDate).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '',
        sent: Number(r.sent),
        delivered: Number(r.delivered),
        failed: Number(r.failed),
      }));
    } catch {
      return [];
    }
  }),
});
