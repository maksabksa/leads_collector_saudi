import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { sql, isNotNull, isNull, and, ne } from "drizzle-orm";

export const dataQualityRouter = router({
  // إحصائيات جودة البيانات الشاملة
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    // الإجمالي
    const [totalRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads);
    const total = totalRow?.count ?? 0;

    if (total === 0) {
      return {
        total: 0,
        withPhone: 0, withoutPhone: 0, phoneRate: 0,
        withWebsite: 0, websiteRate: 0,
        withGoogleMaps: 0, googleMapsRate: 0,
        withInstagram: 0, instagramRate: 0,
        withSnapchat: 0, snapchatRate: 0,
        withTiktok: 0, tiktokRate: 0,
        withWhatsapp: 0, whatsappRate: 0,
        withAnalysis: 0, analysisRate: 0,
        completenessScore: 0,
        byCity: [],
        byBusinessType: [],
        byStage: [],
        phoneByCity: [],
        monthlyAdded: [],
        qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      };
    }

    // أرقام الهواتف
    const [withPhoneRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.verifiedPhone), ne(leads.verifiedPhone, "")));
    const withPhone = withPhoneRow?.count ?? 0;

    // المواقع الإلكترونية
    const [withWebsiteRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.website), ne(leads.website, "")));
    const withWebsite = withWebsiteRow?.count ?? 0;

    // Google Maps
    const [withGoogleMapsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.googleMapsUrl), ne(leads.googleMapsUrl, "")));
    const withGoogleMaps = withGoogleMapsRow?.count ?? 0;

    // Instagram
    const [withInstagramRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.instagramUrl), ne(leads.instagramUrl, "")));
    const withInstagram = withInstagramRow?.count ?? 0;

    // Snapchat
    const [withSnapchatRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.snapchatUrl), ne(leads.snapchatUrl, "")));
    const withSnapchat = withSnapchatRow?.count ?? 0;

    // TikTok
    const [withTiktokRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(isNotNull(leads.tiktokUrl), ne(leads.tiktokUrl, "")));
    const withTiktok = withTiktokRow?.count ?? 0;

    // واتساب مؤكد
    const [withWhatsappRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(sql`${leads.hasWhatsapp} = 'yes'`);
    const withWhatsapp = withWhatsappRow?.count ?? 0;

    // تحليل مكتمل
    const [withAnalysisRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(sql`${leads.analysisStatus} = 'completed'`);
    const withAnalysis = withAnalysisRow?.count ?? 0;

    // توزيع حسب المدينة
    const byCity = await db
      .select({
        city: leads.city,
        total: sql<number>`count(*)`,
        withPhone: sql<number>`sum(case when ${leads.verifiedPhone} is not null and ${leads.verifiedPhone} != '' then 1 else 0 end)`,
        withWebsite: sql<number>`sum(case when ${leads.website} is not null and ${leads.website} != '' then 1 else 0 end)`,
      })
      .from(leads)
      .groupBy(leads.city)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // توزيع حسب نوع النشاط
    const byBusinessType = await db
      .select({
        businessType: leads.businessType,
        total: sql<number>`count(*)`,
        withPhone: sql<number>`sum(case when ${leads.verifiedPhone} is not null and ${leads.verifiedPhone} != '' then 1 else 0 end)`,
      })
      .from(leads)
      .groupBy(leads.businessType)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    // توزيع حسب المرحلة
    const byStage = await db
      .select({
        stage: leads.stage,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .groupBy(leads.stage)
      .orderBy(sql`count(*) desc`);

    // نسبة الأرقام حسب المدينة (للمخطط البياني)
    const phoneByCity = byCity.map(row => ({
      city: row.city,
      phoneRate: row.total > 0 ? Math.round((Number(row.withPhone) / Number(row.total)) * 100) : 0,
      total: Number(row.total),
    }));

    // الإضافات الشهرية (آخر 12 شهر)
    const monthlyAdded = await db
      .select({
        month: sql<string>`DATE_FORMAT(${leads.createdAt}, '%Y-%m')`,
        count: sql<number>`count(*)`,
        withPhone: sql<number>`sum(case when ${leads.verifiedPhone} is not null and ${leads.verifiedPhone} != '' then 1 else 0 end)`,
      })
      .from(leads)
      .where(sql`${leads.createdAt} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`)
      .groupBy(sql`DATE_FORMAT(${leads.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${leads.createdAt}, '%Y-%m') asc`);

    // توزيع جودة البيانات (عدد الحقول المكتملة)
    const qualityRows = await db
      .select({
        score: sql<number>`(
          case when ${leads.verifiedPhone} is not null and ${leads.verifiedPhone} != '' then 1 else 0 end +
          case when ${leads.website} is not null and ${leads.website} != '' then 1 else 0 end +
          case when ${leads.googleMapsUrl} is not null and ${leads.googleMapsUrl} != '' then 1 else 0 end +
          case when ${leads.instagramUrl} is not null and ${leads.instagramUrl} != '' then 1 else 0 end +
          case when ${leads.snapchatUrl} is not null and ${leads.snapchatUrl} != '' then 1 else 0 end +
          case when ${leads.tiktokUrl} is not null and ${leads.tiktokUrl} != '' then 1 else 0 end
        )`,
        count: sql<number>`count(*)`,
      })
      .from(leads)
      .groupBy(sql`(
        case when ${leads.verifiedPhone} is not null and ${leads.verifiedPhone} != '' then 1 else 0 end +
        case when ${leads.website} is not null and ${leads.website} != '' then 1 else 0 end +
        case when ${leads.googleMapsUrl} is not null and ${leads.googleMapsUrl} != '' then 1 else 0 end +
        case when ${leads.instagramUrl} is not null and ${leads.instagramUrl} != '' then 1 else 0 end +
        case when ${leads.snapchatUrl} is not null and ${leads.snapchatUrl} != '' then 1 else 0 end +
        case when ${leads.tiktokUrl} is not null and ${leads.tiktokUrl} != '' then 1 else 0 end
      )`);

    let excellent = 0, good = 0, fair = 0, poor = 0;
    for (const row of qualityRows) {
      const s = Number(row.score);
      const c = Number(row.count);
      if (s >= 5) excellent += c;
      else if (s >= 3) good += c;
      else if (s >= 1) fair += c;
      else poor += c;
    }

    // درجة الاكتمال الإجمالية (متوسط مرجّح)
    const completenessScore = total > 0
      ? Math.round(
          ((withPhone * 30 + withWebsite * 15 + withGoogleMaps * 15 +
            withInstagram * 10 + withSnapchat * 10 + withTiktok * 10 + withWhatsapp * 10) /
            (total * 100)) * 100
        )
      : 0;

    return {
      total,
      withPhone, withoutPhone: total - withPhone,
      phoneRate: Math.round((withPhone / total) * 100),
      withWebsite, websiteRate: Math.round((withWebsite / total) * 100),
      withGoogleMaps, googleMapsRate: Math.round((withGoogleMaps / total) * 100),
      withInstagram, instagramRate: Math.round((withInstagram / total) * 100),
      withSnapchat, snapchatRate: Math.round((withSnapchat / total) * 100),
      withTiktok, tiktokRate: Math.round((withTiktok / total) * 100),
      withWhatsapp, whatsappRate: Math.round((withWhatsapp / total) * 100),
      withAnalysis, analysisRate: Math.round((withAnalysis / total) * 100),
      completenessScore,
      byCity: byCity.map(r => ({
        city: r.city,
        total: Number(r.total),
        withPhone: Number(r.withPhone),
        withWebsite: Number(r.withWebsite),
        phoneRate: Number(r.total) > 0 ? Math.round((Number(r.withPhone) / Number(r.total)) * 100) : 0,
      })),
      byBusinessType: byBusinessType.map(r => ({
        businessType: r.businessType,
        total: Number(r.total),
        withPhone: Number(r.withPhone),
        phoneRate: Number(r.total) > 0 ? Math.round((Number(r.withPhone) / Number(r.total)) * 100) : 0,
      })),
      byStage: byStage.map(r => ({ stage: r.stage, count: Number(r.count) })),
      phoneByCity,
      monthlyAdded: monthlyAdded.map(r => ({
        month: r.month,
        count: Number(r.count),
        withPhone: Number(r.withPhone),
      })),
      qualityDistribution: { excellent, good, fair, poor },
    };
  }),

  // قائمة العملاء بدون أرقام هواتف
  leadsWithoutPhone: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select({
        id: leads.id,
        companyName: leads.companyName,
        businessType: leads.businessType,
        city: leads.city,
        googleMapsUrl: leads.googleMapsUrl,
        instagramUrl: leads.instagramUrl,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(sql`(${leads.verifiedPhone} is null or ${leads.verifiedPhone} = '')`)
      .orderBy(sql`${leads.createdAt} desc`)
      .limit(50);
  }),
});
