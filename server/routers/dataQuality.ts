import { protectedProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";

// دالة مساعدة لتنفيذ raw SQL مع إعادة الاتصال
async function rawQuery<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await conn.execute(query, params) as [T[], unknown];
    return rows;
  } finally {
    await conn.end();
  }
}

export const dataQualityRouter = router({
  // إحصائيات جودة البيانات الشاملة - استعلام واحد سريع
  stats: protectedProcedure.query(async () => {
    // استعلام واحد يجمع كل الإحصائيات
    const rows = await rawQuery<{
      total: number;
      withPhone: number;
      withWebsite: number;
      withGoogleMaps: number;
      withInstagram: number;
      withSnapchat: number;
      withTiktok: number;
      withWhatsapp: number;
      withAnalysis: number;
    }>(`
      SELECT
        count(*) as total,
        sum(case when verifiedPhone is not null and verifiedPhone != '' then 1 else 0 end) as withPhone,
        sum(case when website is not null and website != '' then 1 else 0 end) as withWebsite,
        sum(case when googleMapsUrl is not null and googleMapsUrl != '' then 1 else 0 end) as withGoogleMaps,
        sum(case when instagramUrl is not null and instagramUrl != '' then 1 else 0 end) as withInstagram,
        sum(case when snapchatUrl is not null and snapchatUrl != '' then 1 else 0 end) as withSnapchat,
        sum(case when tiktokUrl is not null and tiktokUrl != '' then 1 else 0 end) as withTiktok,
        sum(case when hasWhatsapp = 'yes' then 1 else 0 end) as withWhatsapp,
        sum(case when analysisStatus = 'completed' then 1 else 0 end) as withAnalysis
      FROM leads
    `);

    const r = rows[0];
    const total = Number(r?.total ?? 0);

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

    const withPhone = Number(r.withPhone ?? 0);
    const withWebsite = Number(r.withWebsite ?? 0);
    const withGoogleMaps = Number(r.withGoogleMaps ?? 0);
    const withInstagram = Number(r.withInstagram ?? 0);
    const withSnapchat = Number(r.withSnapchat ?? 0);
    const withTiktok = Number(r.withTiktok ?? 0);
    const withWhatsapp = Number(r.withWhatsapp ?? 0);
    const withAnalysis = Number(r.withAnalysis ?? 0);

    // استعلامات موازية للبيانات التفصيلية
    const [byCityRaw, byBusinessTypeRaw, byStageRaw, monthlyRaw, qualityRaw] = await Promise.all([
      rawQuery<{city: string; total: number; withPhone: number; withWebsite: number}>(
        `SELECT city,
          count(*) as total,
          sum(case when verifiedPhone is not null and verifiedPhone != '' then 1 else 0 end) as withPhone,
          sum(case when website is not null and website != '' then 1 else 0 end) as withWebsite
         FROM leads GROUP BY city ORDER BY total desc LIMIT 10`
      ),
      rawQuery<{businessType: string; total: number; withPhone: number}>(
        `SELECT businessType,
          count(*) as total,
          sum(case when verifiedPhone is not null and verifiedPhone != '' then 1 else 0 end) as withPhone
         FROM leads GROUP BY businessType ORDER BY total desc LIMIT 10`
      ),
      rawQuery<{stage: string; count: number}>(
        `SELECT stage, count(*) as count FROM leads GROUP BY stage ORDER BY count desc`
      ),
      rawQuery<{month: string; cnt: number; withPhone: number}>(
        `SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, count(*) as cnt,
         sum(case when verifiedPhone is not null and verifiedPhone != '' then 1 else 0 end) as withPhone
         FROM leads WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(createdAt, '%Y-%m') ORDER BY month asc`
      ),
      rawQuery<{score: number; cnt: number}>(
        `SELECT (
          case when verifiedPhone is not null and verifiedPhone != '' then 1 else 0 end +
          case when website is not null and website != '' then 1 else 0 end +
          case when googleMapsUrl is not null and googleMapsUrl != '' then 1 else 0 end +
          case when instagramUrl is not null and instagramUrl != '' then 1 else 0 end +
          case when snapchatUrl is not null and snapchatUrl != '' then 1 else 0 end +
          case when tiktokUrl is not null and tiktokUrl != '' then 1 else 0 end
        ) as score, count(*) as cnt
        FROM leads
        GROUP BY score`
      ),
    ]);

    // توزيع الجودة
    let excellent = 0, good = 0, fair = 0, poor = 0;
    for (const row of qualityRaw) {
      const s = Number(row.score);
      const c = Number(row.cnt);
      if (s >= 5) excellent += c;
      else if (s >= 3) good += c;
      else if (s >= 1) fair += c;
      else poor += c;
    }

    // درجة الاكتمال الإجمالية
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
      byCity: byCityRaw.map(r => ({
        city: r.city,
        total: Number(r.total),
        withPhone: Number(r.withPhone),
        withWebsite: Number(r.withWebsite),
        phoneRate: Number(r.total) > 0 ? Math.round((Number(r.withPhone) / Number(r.total)) * 100) : 0,
      })),
      byBusinessType: byBusinessTypeRaw.map(r => ({
        businessType: r.businessType,
        total: Number(r.total),
        withPhone: Number(r.withPhone),
        phoneRate: Number(r.total) > 0 ? Math.round((Number(r.withPhone) / Number(r.total)) * 100) : 0,
      })),
      byStage: byStageRaw.map(r => ({ stage: r.stage, count: Number(r.count) })),
      phoneByCity: byCityRaw.map(row => ({
        city: row.city,
        phoneRate: Number(row.total) > 0 ? Math.round((Number(row.withPhone) / Number(row.total)) * 100) : 0,
        total: Number(row.total),
      })),
      monthlyAdded: monthlyRaw.map(r => ({
        month: r.month,
        count: Number(r.cnt),
        withPhone: Number(r.withPhone),
      })),
      qualityDistribution: { excellent, good, fair, poor },
    };
  }),


  // قائمة العملاء بدون أرقام هواتف
  leadsWithoutPhone: protectedProcedure.query(async () => {
    const rows = await rawQuery<{
      id: number; companyName: string; businessType: string;
      city: string; googleMapsUrl: string; instagramUrl: string; createdAt: string;
    }>(
      `SELECT id, companyName, businessType, city, googleMapsUrl, instagramUrl, createdAt
       FROM leads
       WHERE verifiedPhone IS NULL OR verifiedPhone = ''
       ORDER BY createdAt DESC
       LIMIT 50`
    );
    return rows;
  }),
});
