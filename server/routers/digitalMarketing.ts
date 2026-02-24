import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

export const digitalMarketingRouter = router({
  // إحصائيات عامة للتسويق الرقمي
  getOverviewStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const mysql = db as any;
    
    // إحصائيات العملاء
    const [leadsStats] = await mysql.execute(`
      SELECT 
        COUNT(*) as totalLeads,
        SUM(CASE WHEN analysisStatus='completed' THEN 1 ELSE 0 END) as analyzedLeads,
        SUM(CASE WHEN leadPriorityScore >= 8 THEN 1 ELSE 0 END) as hotLeads,
        SUM(CASE WHEN leadPriorityScore >= 6 AND leadPriorityScore < 8 THEN 1 ELSE 0 END) as warmLeads,
        SUM(CASE WHEN leadPriorityScore < 6 OR leadPriorityScore IS NULL THEN 1 ELSE 0 END) as coldLeads,
        AVG(leadPriorityScore) as avgScore,
        SUM(CASE WHEN website IS NOT NULL AND website != '' THEN 1 ELSE 0 END) as hasWebsite,
        SUM(CASE WHEN instagramUrl IS NOT NULL AND instagramUrl != '' THEN 1 ELSE 0 END) as hasInstagram,
        SUM(CASE WHEN hasWhatsapp = 1 THEN 1 ELSE 0 END) as hasWhatsapp
      FROM leads
    `);
    
    // إحصائيات المحادثات
    const [chatsStats] = await mysql.execute(`
      SELECT 
        COUNT(*) as totalChats,
        SUM(unreadCount) as totalUnread,
        SUM(CASE WHEN aiAutoReplyEnabled = 1 THEN 1 ELSE 0 END) as aiEnabled,
        SUM(CASE WHEN closedAt IS NOT NULL THEN 1 ELSE 0 END) as closedDeals
      FROM whatsapp_chats
    `);
    
    // إحصائيات الرسائل آخر 30 يوم
    const [msgsStats] = await mysql.execute(`
      SELECT 
        COUNT(*) as totalMessages,
        COUNT(DISTINCT phone) as uniqueContacts
      FROM whatsapp_chat_messages
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);
    
    // أنواع الأعمال
    const [businessTypes] = await mysql.execute(`
      SELECT businessType, COUNT(*) as count 
      FROM leads 
      WHERE businessType IS NOT NULL AND businessType != ''
      GROUP BY businessType 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    // توزيع المناطق
    const [zones] = await mysql.execute(`
      SELECT zoneName, COUNT(*) as count 
      FROM leads 
      WHERE zoneName IS NOT NULL AND zoneName != ''
      GROUP BY zoneName 
      ORDER BY count DESC 
      LIMIT 10
    `);
    
    return {
      leads: leadsStats[0],
      chats: chatsStats[0],
      messages: msgsStats[0],
      businessTypes,
      zones,
    };
  }),

  // تحليل الرسائل اليومية آخر 14 يوم
  getDailyMessageStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const mysql = db as any;
    
    const [rows] = await mysql.execute(`
      SELECT 
        DATE(sentAt) as date,
        COUNT(*) as total,
        SUM(CASE WHEN messageType = 'ai_reply' OR messageType = 'auto_reply' THEN 1 ELSE 0 END) as aiMessages,
        COUNT(DISTINCT phone) as uniqueContacts
      FROM whatsapp_chat_messages
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE(sentAt)
      ORDER BY date ASC
    `);
    
    return rows.map((r: any) => ({
      date: r.date ? new Date(r.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '',
      total: Number(r.total),
      aiMessages: Number(r.aiMessages),
      uniqueContacts: Number(r.uniqueContacts),
    }));
  }),

  // تحليل فجوات التسويق الرقمي
  getMarketingGaps: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const mysql = db as any;
    
    const [gaps] = await mysql.execute(`
      SELECT 
        SUM(CASE WHEN website IS NULL OR website = '' THEN 1 ELSE 0 END) as noWebsite,
        SUM(CASE WHEN instagramUrl IS NULL OR instagramUrl = '' THEN 1 ELSE 0 END) as noInstagram,
        SUM(CASE WHEN twitterUrl IS NULL OR twitterUrl = '' THEN 1 ELSE 0 END) as noTwitter,
        SUM(CASE WHEN snapchatUrl IS NULL OR snapchatUrl = '' THEN 1 ELSE 0 END) as noSnapchat,
        SUM(CASE WHEN tiktokUrl IS NULL OR tiktokUrl = '' THEN 1 ELSE 0 END) as noTiktok,
        SUM(CASE WHEN facebookUrl IS NULL OR facebookUrl = '' THEN 1 ELSE 0 END) as noFacebook,
        SUM(CASE WHEN hasWhatsapp = 0 OR hasWhatsapp IS NULL THEN 1 ELSE 0 END) as noWhatsapp,
        COUNT(*) as total
      FROM leads
    `);
    
    return gaps[0];
  }),

  // أفضل العملاء بالأولوية
  getTopLeads: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const mysql = db as any;
      
      const [rows] = await mysql.execute(`
        SELECT 
          id, companyName, businessType, city, district,
          leadPriorityScore, biggestMarketingGap, suggestedSalesEntryAngle,
          website, instagramUrl, hasWhatsapp, analysisStatus,
          stage, priority
        FROM leads
        WHERE leadPriorityScore IS NOT NULL
        ORDER BY leadPriorityScore DESC
        LIMIT ?
      `, [input.limit]);
      
      return rows;
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
      const mysql = db as any;
      
      // جلب بيانات ملخصة
      const filter = input.businessType ? `WHERE businessType = '${input.businessType}'` : '';
      const [summary] = await mysql.execute(`
        SELECT 
          COUNT(*) as total,
          AVG(leadPriorityScore) as avgScore,
          SUM(CASE WHEN website IS NOT NULL AND website != '' THEN 1 ELSE 0 END) as hasWebsite,
          SUM(CASE WHEN instagramUrl IS NOT NULL AND instagramUrl != '' THEN 1 ELSE 0 END) as hasInstagram,
          SUM(CASE WHEN hasWhatsapp = 1 THEN 1 ELSE 0 END) as hasWhatsapp,
          GROUP_CONCAT(DISTINCT businessType SEPARATOR ', ') as types
        FROM leads ${filter}
      `);
      
      const data = summary[0];
      const prompt = `أنت خبير تسويق رقمي متخصص في السوق السعودي.
بناءً على البيانات التالية لعملاء محتملين:
- إجمالي العملاء: ${data.total}
- متوسط درجة الأولوية: ${Number(data.avgScore).toFixed(1)}/10
- لديهم موقع إلكتروني: ${data.hasWebsite} (${Math.round(data.hasWebsite/data.total*100)}%)
- لديهم إنستغرام: ${data.hasInstagram} (${Math.round(data.hasInstagram/data.total*100)}%)
- لديهم واتساب: ${data.hasWhatsapp} (${Math.round(data.hasWhatsapp/data.total*100)}%)
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
    const mysql = db as any;
    
    const [campaigns] = await mysql.execute(`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM whatsapp_messages
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `).catch(() => [[]]);
    
    return (campaigns as any[]).map((r: any) => ({
      date: r.date ? new Date(r.date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }) : '',
      sent: Number(r.sent),
      delivered: Number(r.delivered),
      failed: Number(r.failed),
    }));
  }),
});
