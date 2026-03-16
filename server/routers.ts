import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllZones, getZoneById, createZone, updateZone, deleteZone,
  getAllLeads, getLeadById, createLead, updateLead, deleteLead, getLeadsStats, bulkDeleteLeads,
  getWebsiteAnalysisByLeadId, createWebsiteAnalysis,
  getSocialAnalysesByLeadId, createSocialAnalysis,
  getTopGaps, getDb,
  createSearchJob, getSearchJobById, getAllSearchJobs, updateSearchJob, deleteSearchJob, checkLeadDuplicate,
  createInstagramSearch, updateInstagramSearch, getAllInstagramSearches,
  getInstagramSearchById, createInstagramAccounts, getInstagramAccountsBySearchId,
  markInstagramAccountAsLead,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { dataSettings, aiSettings } from "../drizzle/schema";
import { eq, and, asc, sql, desc, like, or, gte, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invitationsRouter } from "./routers/invitations";
import { aiSettingsRouter } from "./routers/aiSettings";
import { brightDataSearchRouter } from "./routers/brightDataSearch";
import { googleSearchRouter } from "./routers/googleSearch";
import { socialSearchRouter } from "./routers/socialSearch";
import { segmentsRouter } from "./routers/segments";
import { companySettingsRouter } from "./routers/companySettings";
import { digitalMarketingRouter } from "./routers/digitalMarketing";
import { staffAuthRouter } from "./routers/staffAuth";
import { auditLogRouter } from "./routers/auditLog";
import { remindersRouter } from "./routers/reminders";
import { labelsRouter } from "./routers/labels";
import { interestKwRouter } from "./routers/interestKw";
import { ragKnowledgeRouter } from "./routers/ragKnowledge";
import { dataQualityRouter } from "./routers/dataQuality";
import { campaignsRouter } from "./routers/campaigns";
import { behaviorAnalysisRouter } from "./routers/behaviorAnalysis";
import { reportRouter } from "./routers/report";
import { weeklyReportsRouter } from "./routers/weeklyReports";
import { inboxRouter } from "./routers/inbox";
import { whatsappRouter } from "./routers/whatsapp";
import { waAccountsRouter } from "./routers/waAccounts";
import { wautoRouter } from "./routers/wauto";
import { numberHealthRouter } from "./routers/numberHealth";
import { activationRouter } from "./routers/activation";
import { followUpRouter } from "./routers/followUp";
import { searchBehaviorRouter } from "./routers/searchBehavior";
import { reportSchedulerRouter } from "./routers/reportScheduler";
import { deduplicationRouter } from "./routers/deduplication";
import { sectorAnalysisRouter } from "./routers/sectorAnalysis";
import { pdfReportRouter } from "./routers/pdfReport";
import { bulkAnalysisRouter } from "./routers/bulkAnalysis";
import { analysisSettingsRouter } from "./routers/analysisSettings";
import { scrapeWebsite, scrapeInstagram, scrapeLinkedIn, scrapeTwitter, scrapeTikTok, formatScrapedDataForLLM } from "./lib/brightDataScraper";
import { fetchSocialPlatformData, extractSocialStats } from "./lib/brightDataSocialDatasets";
import { brightDataAnalysisRouter } from "./routers/brightDataAnalysis";
import { aiAgentRouter } from "./routers/aiAgent";
import { serpQueueRouter } from "./routers/serpQueue";
import { seasonsRouter } from "./routers/seasons";
import { reportStyleRouter } from "./routers/reportStyle";
import { leadIntelligenceRouter } from "./routers/leadIntelligence";
import { whatchimpRouter } from "./routers/whatchimp";

// ===== ZONES ROUTER =====
const zonesRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllZones();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const zone = await getZoneById(input.id);
      if (!zone) throw new TRPCError({ code: "NOT_FOUND", message: "المنطقة غير موجودة" });
      return zone;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      nameEn: z.string().optional(),
      region: z.string().min(1),
      targetLeads: z.number().default(20),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createZone(input);
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameEn: z.string().optional(),
      region: z.string().optional(),
      status: z.enum(["not_started", "in_progress", "completed"]).optional(),
      targetLeads: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateZone(id, data);
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteZone(input.id);
      return { success: true };
    }),

  seed: protectedProcedure.mutation(async () => {
    const defaultZones = [
      // الرياض
      { name: "شمال الرياض", nameEn: "North Riyadh", region: "الرياض", targetLeads: 20 },
      { name: "جنوب الرياض", nameEn: "South Riyadh", region: "الرياض", targetLeads: 20 },
      { name: "شرق الرياض", nameEn: "East Riyadh", region: "الرياض", targetLeads: 20 },
      { name: "غرب الرياض", nameEn: "West Riyadh", region: "الرياض", targetLeads: 20 },
      { name: "وسط الرياض", nameEn: "Central Riyadh", region: "الرياض", targetLeads: 20 },
      // جدة
      { name: "شمال جدة", nameEn: "North Jeddah", region: "جدة", targetLeads: 15 },
      { name: "جنوب جدة", nameEn: "South Jeddah", region: "جدة", targetLeads: 15 },
      { name: "وسط جدة", nameEn: "Central Jeddah", region: "جدة", targetLeads: 15 },
      // مكة المكرمة
      { name: "مكة المكرمة", nameEn: "Makkah", region: "مكة المكرمة", targetLeads: 15 },
      { name: "الطائف", nameEn: "Taif", region: "مكة المكرمة", targetLeads: 10 },
      // المدينة المنورة
      { name: "المدينة المنورة", nameEn: "Madinah", region: "المدينة المنورة", targetLeads: 15 },
      // المنطقة الشرقية
      { name: "الدمام", nameEn: "Dammam", region: "المنطقة الشرقية", targetLeads: 15 },
      { name: "الخبر", nameEn: "Khobar", region: "المنطقة الشرقية", targetLeads: 15 },
      { name: "الأحساء", nameEn: "Al-Ahsa", region: "المنطقة الشرقية", targetLeads: 10 },
      // القصيم
      { name: "بريدة", nameEn: "Buraydah", region: "القصيم", targetLeads: 10 },
      { name: "عنيزة", nameEn: "Unaizah", region: "القصيم", targetLeads: 10 },
      // حائل
      { name: "حائل", nameEn: "Hail", region: "حائل", targetLeads: 10 },
      // تبوك
      { name: "تبوك", nameEn: "Tabuk", region: "تبوك", targetLeads: 10 },
      // أبها
      { name: "أبها", nameEn: "Abha", region: "عسير", targetLeads: 10 },
      { name: "خميس مشيط", nameEn: "Khamis Mushait", region: "عسير", targetLeads: 10 },
      // نجران
      { name: "نجران", nameEn: "Najran", region: "نجران", targetLeads: 8 },
      // جازان
      { name: "جازان", nameEn: "Jazan", region: "جازان", targetLeads: 8 },
    ];
    const existing = await getAllZones();
    if (existing.length > 0) return { message: "المناطق موجودة بالفعل", count: existing.length };
    for (const zone of defaultZones) {
      await createZone(zone);
    }
    return { message: "تم إنشاء المناطق بنجاح", count: defaultZones.length };
  }),
});

// ===== LEADS ROUTER =====

// ===== LEADS ROUTER =====
const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      zoneId: z.number().optional(),
      city: z.string().optional(),
      businessType: z.string().optional(),
      analysisStatus: z.string().optional(),
      search: z.string().optional(),
      hasWhatsapp: z.enum(["yes", "no", "unknown"]).optional(),
      hasPhone: z.boolean().optional(),
      stage: z.enum(["new", "contacted", "interested", "price_offer", "meeting", "won", "lost"]).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      ownerUserId: z.number().optional(),
      sentToWhatchimp: z.enum(["yes", "no"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      return getAllLeads(input ?? {});
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.id);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      return lead;
    }),

  getNames: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { leads: leadsTable } = await import('../drizzle/schema');
    const rows = await db
      .select({
        name: leadsTable.companyName,
        phone: leadsTable.verifiedPhone,
        instagram: leadsTable.instagramUrl,
        twitter: leadsTable.twitterUrl,
        tiktok: leadsTable.tiktokUrl,
      })
      .from(leadsTable);
    return rows;
  }),

  create: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1),
      businessType: z.string().min(1),
      city: z.string().min(1),
      country: z.string().optional(),
      district: z.string().optional(),
      zoneId: z.number().optional(),
      zoneName: z.string().optional(),
      verifiedPhone: z.string().optional(),
      website: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      instagramUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      snapchatUrl: z.string().optional(),
      tiktokUrl: z.string().optional(),
      facebookUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      crNumber: z.string().optional(),
      reviewCount: z.number().optional(),
      socialSince: z.string().optional(),
      notes: z.string().optional(),
      hasWhatsapp: z.enum(["yes", "no", "unknown"]).optional(),
      stage: z.enum(["new", "contacted", "interested", "price_offer", "meeting", "won", "lost"]).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      nextStep: z.string().optional(),
      nextFollowup: z.number().optional(),
      ownerUserId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createLead(input);

      // تشغيل التحليل التلقائي في الخلفية بعد الحفظ مباشرة
      setImmediate(async () => {
        try {
          const socialPlatforms: Array<{ field: keyof typeof input; platform: "instagram" | "twitter" | "snapchat" | "tiktok" | "facebook" }> = [
            { field: "instagramUrl", platform: "instagram" },
            { field: "snapchatUrl", platform: "snapchat" },
            { field: "tiktokUrl", platform: "tiktok" },
            { field: "facebookUrl", platform: "facebook" },
            { field: "twitterUrl", platform: "twitter" },
          ];

          const hasSocial = socialPlatforms.some(p => input[p.field]);
          const hasWebsite = !!input.website;

          if (!hasWebsite && !hasSocial) {
            // لا يوجد بيانات للتحليل — نشغّل تحليل ذكاء اصطناعي عام بناءً على الاسم والنشاط
            await updateLead(id, { analysisStatus: "analyzing" });
            const prompt = `أنت خبير تحليل تسويق رقمي في السوق السعودي.
قيّم الحضور الرقمي لهذا النشاط بناءً على معرفتك بالسوق:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- المدينة: ${input.city}
- لا يوجد موقع إلكتروني أو حسابات سوشيال مسجلة

أجب بـ JSON فقط:
{
  "biggestMarketingGap": "أكبر ثغرة تسويقية متوقعة",
  "revenueOpportunity": "فرصة الإيراد المتاحة",
  "suggestedSalesEntryAngle": "زاوية الدخول البيعية المقترحة",
  "leadPriorityScore": 6
}`;
            const resp = await invokeLLM({
              messages: [
                { role: "system", content: "أنت محلل تسويقي. أجب بـ JSON فقط." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" } as any,
            });
            const raw = resp.choices[0]?.message?.content;
            const txt = typeof raw === "string" ? raw : "{}";
            let r: any = {};
            try { r = JSON.parse(txt); } catch { r = {}; }
            await updateLead(id, {
              analysisStatus: "completed",
              biggestMarketingGap: r.biggestMarketingGap,
              revenueOpportunity: r.revenueOpportunity,
              suggestedSalesEntryAngle: r.suggestedSalesEntryAngle,
              leadPriorityScore: r.leadPriorityScore,
            });
            return;
          }

          await updateLead(id, { analysisStatus: "analyzing" });

          // تحليل الموقع إن وجد
          if (hasWebsite) {
            const websitePrompt = `أنت خبير تحليل تسويق رقمي متخصص في السوق السعودي.
قم بتحليل الموقع الإلكتروني: ${input.website}
اسم النشاط: ${input.companyName} | نوع: ${input.businessType} | مدينة: ${input.city}

أجب بـ JSON فقط:
{
  "hasWebsite": true, "loadSpeedScore": 7, "mobileExperienceScore": 6, "seoScore": 5,
  "contentQualityScore": 6, "designScore": 7, "offerClarityScore": 5,
  "hasSeasonalPage": false, "hasOnlineBooking": false, "hasPaymentOptions": false, "hasDeliveryInfo": false,
  "technicalGaps": [], "contentGaps": [], "overallScore": 6,
  "summary": "ملخص", "recommendations": [],
  "biggestMarketingGap": "الثغرة", "revenueOpportunity": "الفرصة", "suggestedSalesEntryAngle": "زاوية الدخول"
}`;
            const wr = await invokeLLM({
              messages: [
                { role: "system", content: "أجب بـ JSON فقط." },
                { role: "user", content: websitePrompt },
              ],
              response_format: { type: "json_object" } as any,
            });
            const wRaw = wr.choices[0]?.message?.content;
            const wTxt = typeof wRaw === "string" ? wRaw : "{}";
            let wa: any = {};
            try { wa = JSON.parse(wTxt); } catch { wa = {}; }
            await createWebsiteAnalysis({
              leadId: id, url: input.website!,
              hasWebsite: wa.hasWebsite ?? true,
              loadSpeedScore: wa.loadSpeedScore, mobileExperienceScore: wa.mobileExperienceScore,
              seoScore: wa.seoScore, contentQualityScore: wa.contentQualityScore,
              designScore: wa.designScore, offerClarityScore: wa.offerClarityScore,
              hasSeasonalPage: wa.hasSeasonalPage ?? false, hasOnlineBooking: wa.hasOnlineBooking ?? false,
              hasPaymentOptions: wa.hasPaymentOptions ?? false, hasDeliveryInfo: wa.hasDeliveryInfo ?? false,
              technicalGaps: wa.technicalGaps ?? [], contentGaps: wa.contentGaps ?? [],
              overallScore: wa.overallScore, summary: wa.summary,
              recommendations: wa.recommendations ?? [], rawAnalysis: wTxt,
            });
            await updateLead(id, {
              biggestMarketingGap: wa.biggestMarketingGap,
              revenueOpportunity: wa.revenueOpportunity,
              suggestedSalesEntryAngle: wa.suggestedSalesEntryAngle,
              brandingQualityScore: wa.designScore,
              leadPriorityScore: wa.overallScore,
            });
          }

          // تحليل حسابات السوشيال إن وجدت
          for (const { field, platform } of socialPlatforms) {
            const url = input[field] as string | undefined;
            if (!url) continue;
            const platformNames: Record<string, string> = {
              instagram: "إنستغرام", twitter: "تويتر/X",
              snapchat: "سناب شات", tiktok: "تيك توك", facebook: "فيسبوك",
            };
            const socialPrompt = `حلّل حساب ${platformNames[platform]}: ${url}
نشاط: ${input.companyName} (${input.businessType}) في ${input.city}
أجب بـ JSON فقط:
{
  "hasAccount": true, "postingFrequencyScore": 6, "engagementScore": 5, "contentQualityScore": 6,
  "hasSeasonalContent": false, "hasPricingContent": false, "hasCallToAction": false,
  "contentStrategyScore": 5, "digitalPresenceScore": 6,
  "gaps": [], "overallScore": 5.5, "summary": "ملخص", "recommendations": []
}`;
            const sr = await invokeLLM({
              messages: [
                { role: "system", content: "أجب بـ JSON فقط." },
                { role: "user", content: socialPrompt },
              ],
              response_format: { type: "json_object" } as any,
            });
            const sRaw = sr.choices[0]?.message?.content;
            const sTxt = typeof sRaw === "string" ? sRaw : "{}";
            let sa: any = {};
            try { sa = JSON.parse(sTxt); } catch { sa = {}; }
            await createSocialAnalysis({
              leadId: id, platform, profileUrl: url,
              hasAccount: sa.hasAccount ?? true,
              postingFrequencyScore: sa.postingFrequencyScore, engagementScore: sa.engagementScore,
              contentQualityScore: sa.contentQualityScore,
              hasSeasonalContent: sa.hasSeasonalContent ?? false, hasPricingContent: sa.hasPricingContent ?? false,
              hasCallToAction: sa.hasCallToAction ?? false,
              contentStrategyScore: sa.contentStrategyScore, digitalPresenceScore: sa.digitalPresenceScore,
              gaps: sa.gaps ?? [], overallScore: sa.overallScore,
              summary: sa.summary, recommendations: sa.recommendations ?? [], rawAnalysis: sTxt,
            });
          }

          await updateLead(id, { analysisStatus: "completed" });
        } catch (err) {
          console.error("[Auto-Analysis] فشل التحليل التلقائي:", err);
          await updateLead(id, { analysisStatus: "failed" });
        }
      });

      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      companyName: z.string().optional(),
      businessType: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      zoneId: z.number().optional(),
      zoneName: z.string().optional(),
      verifiedPhone: z.string().optional(),
      website: z.string().optional(),
      googleMapsUrl: z.string().optional(),
      instagramUrl: z.string().optional(),
      twitterUrl: z.string().optional(),
      snapchatUrl: z.string().optional(),
      tiktokUrl: z.string().optional(),
      facebookUrl: z.string().optional(),
      linkedinUrl: z.string().optional(),
      reviewCount: z.number().optional(),
      brandingQualityScore: z.number().optional(),
      seasonalReadinessScore: z.number().optional(),
      leadPriorityScore: z.number().optional(),
      biggestMarketingGap: z.string().optional(),
      revenueOpportunity: z.string().optional(),
      suggestedSalesEntryAngle: z.string().optional(),
      analysisStatus: z.enum(["pending", "analyzing", "completed", "failed"]).optional(),
      notes: z.string().optional(),
      crNumber: z.string().optional(),
      clientLogoUrl: z.string().optional(),
      stage: z.enum(["new", "contacted", "interested", "price_offer", "meeting", "won", "lost"]).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      nextStep: z.string().optional(),
      nextFollowup: z.number().optional(),
      ownerUserId: z.number().optional(),
      customRecommendations: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateLead(id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLead(input.id);
      return { success: true };
    }),

  fetchClientLogo: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      website: z.string().optional(),
      instagramUrl: z.string().optional(),
      companyName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { leadId, website, instagramUrl, companyName } = input;

      // محاولة 1: جلب الشعار من الموقع عبر Google Favicon Service
      if (website) {
        try {
          const domain = new URL(website.startsWith('http') ? website : 'https://' + website).hostname;
          // نجرب Google Favicon API
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
          // نتحقق من أن الصورة موجودة
          const checkRes = await fetch(faviconUrl, { method: 'HEAD' });
          if (checkRes.ok) {
            await updateLead(leadId, { clientLogoUrl: faviconUrl });
            return { success: true, logoUrl: faviconUrl, source: 'favicon' };
          }
        } catch (e) {
          // استمر للمحاولة التالية
        }
      }

      // محاولة 2: جلب الشعار من Clearbit Logo API
      if (website || companyName) {
        try {
          const domain = website
            ? new URL(website.startsWith('http') ? website : 'https://' + website).hostname
            : null;
          if (domain) {
            const clearbitUrl = `https://logo.clearbit.com/${domain}`;
            const checkRes = await fetch(clearbitUrl, { method: 'HEAD' });
            if (checkRes.ok) {
              await updateLead(leadId, { clientLogoUrl: clearbitUrl });
              return { success: true, logoUrl: clearbitUrl, source: 'clearbit' };
            }
          }
        } catch (e) {
          // استمر
        }
      }

      // محاولة 3: استخدام Google Favicon بحجم أصغر كبديل
      if (website) {
        try {
          const domain = new URL(website.startsWith('http') ? website : 'https://' + website).hostname;
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
          await updateLead(leadId, { clientLogoUrl: faviconUrl });
          return { success: true, logoUrl: faviconUrl, source: 'google_favicon_64' };
        } catch (e) {
          // فشل
        }
      }

      return { success: false, logoUrl: null, source: null };
    }),

  // جلب صور المكان من Google Maps وتخزينها
  fetchPlacePhotos: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      googleMapsUrl: z.string().optional(),
      placeId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { leadId, googleMapsUrl, placeId } = input;
      const { makeRequest } = await import("./_core/map");

      // استخراج place_id من الرابط إذا لم يُعطَ مباشرة
      let resolvedPlaceId = placeId;
      if (!resolvedPlaceId && googleMapsUrl) {
        const m = googleMapsUrl.match(/place_id[=:]([A-Za-z0-9_-]+)/) ||
                  googleMapsUrl.match(/\/place\/[^/]+\/([A-Za-z0-9_-]{20,})/);
        if (m) resolvedPlaceId = m[1];
      }

      if (!resolvedPlaceId) {
        return { success: false, photos: [], message: 'لم يتم العثور على place_id' };
      }

      try {
        const data = await makeRequest<{
          result: {
            photos?: Array<{ photo_reference: string; height: number; width: number }>;
            name?: string;
          };
          status: string;
        }>("/maps/api/place/details/json", {
          place_id: resolvedPlaceId,
          fields: "photos,name",
          language: "ar",
        });

        if (data.status !== "OK" || !data.result.photos?.length) {
          return { success: false, photos: [], message: 'لا توجد صور لهذا المكان' };
        }

        // بناء روابط الصور عبر Google Maps Photo API
        const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
        const photoUrls = data.result.photos.slice(0, 10).map(
          (p) => `${baseUrl}/api/maps-photo?photo_reference=${encodeURIComponent(p.photo_reference)}&maxwidth=800`
        );

        // تخزين الصور في قاعدة البيانات
        await updateLead(leadId, { placePhotos: photoUrls } as any);

        // إذا لم يكن هناك لوجو محدد، استخدم أول صورة كشعار
        const lead = await getLeadById(leadId);
        if (!lead?.clientLogoUrl && photoUrls.length > 0) {
          await updateLead(leadId, { clientLogoUrl: photoUrls[0] } as any);
        }

        return { success: true, photos: photoUrls, count: photoUrls.length };
      } catch (err: any) {
        return { success: false, photos: [], message: err.message };
      }
    }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const result = await bulkDeleteLeads(input.ids);
      return { success: true, deleted: result.deleted };
    }),
  bulkUpdateStage: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(500),
      stage: z.enum(["new", "contacted", "interested", "price_offer", "meeting", "won", "lost"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const { leads: leadsTable } = await import("../drizzle/schema");
      await db.update(leadsTable).set({ stage: input.stage }).where(inArray(leadsTable.id, input.ids));
      return { success: true, updated: input.ids.length };
    }),

  stats: protectedProcedure.query(async () => {
    return getLeadsStats();
  }),

  getFullDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.id);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const websiteAnalysis = await getWebsiteAnalysisByLeadId(input.id);
      const socialAnalysesList = await getSocialAnalysesByLeadId(input.id);
      return { lead, websiteAnalysis, socialAnalyses: socialAnalysesList };
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      leads: z.array(z.object({
        companyName: z.string().min(1),
        businessType: z.string().min(1),
        city: z.string().min(1),
        country: z.string().optional(),
        district: z.string().optional(),
        verifiedPhone: z.string().optional(),
        website: z.string().optional(),
        googleMapsUrl: z.string().optional(),
        instagramUrl: z.string().optional(),
        twitterUrl: z.string().optional(),
        snapchatUrl: z.string().optional(),
        tiktokUrl: z.string().optional(),
        facebookUrl: z.string().optional(),
        reviewCount: z.number().optional(),
        notes: z.string().optional(),
        hasWhatsapp: z.enum(["yes", "no", "unknown"]).optional(),
      })).max(1000),
    }))
    .mutation(async ({ input }) => {
      let created = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const leadData of input.leads) {
        try {
          await createLead(leadData);
          created++;
        } catch (e) {
          failed++;
          errors.push(`${leadData.companyName}: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`);
        }
      }
      return { created, failed, errors };
    }),

  // ===== تحليل البايو بالذكاء الاصطناعي =====
  analyzeFromBio: protectedProcedure
    .input(z.object({
      bio: z.string().optional(),
      companyName: z.string().optional(),
      platform: z.string().optional(),
      username: z.string().optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { bio, companyName, platform, username, city } = input;
      if (!bio && !companyName) {
        return { businessType: null, city: null, phone: null, website: null, district: null, confidence: 0 };
      }

      const contextParts: string[] = [];
      if (companyName) contextParts.push(`اسم النشاط: ${companyName}`);
      if (platform) contextParts.push(`المنصة: ${platform}`);
      if (username) contextParts.push(`اسم المستخدم: @${username}`);
      if (city) contextParts.push(`المدينة المعروفة: ${city}`);
      if (bio) contextParts.push(`البيو / الوصف:\n${bio.substring(0, 500)}`);

      const prompt = `أنت خبير تحليل بيانات الأعمال في السوق السعودي والخليجي.
حلّل المعلومات التالية واستخرج منها البيانات المطلوبة:

${contextParts.join('\n')}

استخرج:
1. نوع النشاط التجاري (مثل: مطعم، صالون، متجر ملابس، عيادة، شركة مقاولات، إلخ) - اختر الأدق والأكثر تحديداً
2. المدينة (إذا ذُكرت صراحةً أو يمكن استنتاجها بثقة عالية)
3. رقم الهاتف السعودي (إذا وُجد في النص - ابحث عن أرقام تبدأ بـ 05 أو +966 أو 966)
4. الموقع الإلكتروني (إذا وُجد في النص)
5. الحي أو المنطقة (إذا ذُكرت)

قواعد مهمة:
- لا تخترع بيانات غير موجودة في النص
- إذا لم تكن متأكداً من قيمة، اجعلها null
- confidence: نسبة ثقتك في نوع النشاط (0-100)
- businessType يجب أن يكون بالعربية وموجزاً (1-3 كلمات)
- city يجب أن تكون مدينة سعودية أو خليجية معروفة

أجب بـ JSON فقط:
{
  "businessType": "نوع النشاط أو null",
  "city": "المدينة أو null",
  "phone": "رقم الهاتف أو null",
  "website": "الموقع أو null",
  "district": "الحي أو null",
  "confidence": 85
}`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت محلل بيانات أعمال خبير في السوق السعودي. أجب دائماً بـ JSON صحيح فقط بدون أي نص إضافي." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });
        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : "{}";
        let result: any = {};
        try { result = JSON.parse(content); } catch { result = {}; }
        return {
          businessType: result.businessType || null,
          city: result.city || null,
          phone: result.phone || null,
          website: result.website || null,
          district: result.district || null,
          confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        };
      } catch (e) {
        console.error('[analyzeFromBio] LLM error:', e);
        return { businessType: null, city: null, phone: null, website: null, district: null, confidence: 0 };
      }
    }),

  getCompetitors: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      businessType: z.string(),
      city: z.string(),
      limit: z.number().optional().default(5),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { leads: leadsTable } = await import('../drizzle/schema');

      // خوارزمية مطابقة نوع النشاط الصارمة
      // تصنيف الأنشطة في فئات متمايزة - لا يجوز الخلط بين الفئات
      const CATEGORY_KEYWORDS: Record<string, string[]> = {
        'ملابس': ['ملابس', 'أزياء', 'بوتيك', 'عبايا', 'خياط', 'موضة', 'فاشون', 'clothing', 'fashion', 'apparel', 'wear'],
        'أطفال': ['أطفال', 'طفل', 'kids', 'children', 'baby', 'بيبي'],
        'مطعم': ['مطعم', 'restaurant', 'كافيه', 'مقهى', 'cafe', 'وجبات', 'food', 'فطور', 'حلويات', 'مطبخ'],
        'لحوم': ['ملحمة', 'لحوم', 'قصاب', 'ذبائح', 'لحم'],
        'صالون': ['صالون', 'تجميل', 'حلاقة', 'سبا', 'بشرة', 'شعر', 'salon', 'beauty'],
        'عقار': ['عقار', 'شقق', 'فلل', 'بيوت', 'مكاتب', 'وساطة', 'real estate'],
        'سيارات': ['سيارة', 'سيارات', 'مركبات', 'معرض', 'تأجير', 'غيار', 'car', 'auto'],
        'تعليم': ['تعليم', 'مدرسة', 'أكاديمية', 'دروس', 'تدريب', 'كورس', 'school', 'academy'],
        'طب': ['طب', 'عيادة', 'مستشفى', 'صيدلية', 'دكتور', 'صحة', 'dental', 'clinic', 'dentist'],
        'تقنية': ['تقنية', 'الكترونيك', 'برمجة', 'موبايل', 'كمبيوتر', 'صيانة', 'tech', 'software'],
        'شواء': ['شواء', 'شوارم', 'مشوي', 'كباب', 'برغر', 'grill'],
        'دليل': ['دليل', 'guide', 'directory', 'استعراض', 'مطاعم الرياض'],
        'نادي': ['نادي', 'night_club', 'club', 'ملهى'],
        'تأسيس': ['تأسيس', 'استشارات', 'شركات', 'point_of_interest'],
      };

      // دالة تحديد الفئة
      function detectCategory(bt: string): string[] {
        const btLower = (bt || '').toLowerCase();
        const matched: string[] = [];
        for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
          if (kws.some(kw => btLower.includes(kw.toLowerCase()))) {
            matched.push(cat);
          }
        }
        return matched;
      }

      const selectFields = {
        id: leadsTable.id,
        companyName: leadsTable.companyName,
        businessType: leadsTable.businessType,
        city: leadsTable.city,
        website: leadsTable.website,
        instagramUrl: leadsTable.instagramUrl,
        twitterUrl: leadsTable.twitterUrl,
        tiktokUrl: leadsTable.tiktokUrl,
        facebookUrl: leadsTable.facebookUrl,
        snapchatUrl: leadsTable.snapchatUrl,
        linkedinUrl: leadsTable.linkedinUrl,
        reviewCount: leadsTable.reviewCount,
        leadPriorityScore: leadsTable.leadPriorityScore,
        dataQualityScore: leadsTable.dataQualityScore,
        analysisStatus: leadsTable.analysisStatus,
      };

      const myCategories = detectCategory(input.businessType);
      const allLeads = await db
        .select(selectFields)
        .from(leadsTable)
        .where(sql`${leadsTable.id} != ${input.leadId}`)
        .orderBy(desc(leadsTable.leadPriorityScore))
        .limit(200);

      // فلترة: نفس الفئة فقط (لا خلط بين ملابس ولحوم)
      let sameCategory: typeof allLeads = [];
      if (myCategories.length > 0) {
        sameCategory = allLeads.filter(lead => {
          const theirCats = detectCategory(lead.businessType || '');
          // يجب أن يشتركا في فئة واحدة على الأقل
          return theirCats.some(c => myCategories.includes(c));
        });
      }

      // المرحلة 1: نفس الفئة + نفس المدينة
      const phase1 = sameCategory.filter(l =>
        input.city && input.city !== 'جميع المدن'
          ? (l.city || '').includes(input.city) || input.city.includes(l.city || '')
          : true
      );
      if (phase1.length >= 2) return phase1.slice(0, input.limit);

      // المرحلة 2: نفس الفئة بدون شرط المدينة
      if (sameCategory.length >= 2) return sameCategory.slice(0, input.limit);

      // المرحلة 3: بحث بالكلمات المشتركة في نوع النشاط (بدون المدينة)
      // فقط إذا لم تُحدَّد فئة واضحة
      const btWords = (input.businessType || '').split(/[\s،,]+/).filter(w => w.length > 2);
      const wordMatches = allLeads.filter(lead => {
        const theirBt = (lead.businessType || '').toLowerCase();
        return btWords.some(w => theirBt.includes(w.toLowerCase()));
      });
      if (wordMatches.length > 0) return wordMatches.slice(0, input.limit);

      // المرحلة 4: لا منافسين مناسبين — أعد مصفوفة فارغة بدلاً من أي عميل عشوائي
      return [];
    }),

});

// ===== ANALYSIS ROUTER =====
const analysisRouter = router({
  analyzeWebsite: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      url: z.string(),
      companyName: z.string(),
      businessType: z.string(),
    }))
    .mutation(async ({ input }) => {
      await updateLead(input.leadId, { analysisStatus: "analyzing" });
      try {
        const prompt = `أنت خبير تحليل تسويق رقمي متخصص في السوق السعودي.

قم بتحليل الموقع الإلكتروني التالي لنشاط تجاري سعودي:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الموقع: ${input.url}

قدم تحليلاً شاملاً بصيغة JSON فقط (بدون أي نص خارج JSON) وفق الهيكل التالي:
{
  "hasWebsite": true,
  "loadSpeedScore": 7,
  "mobileExperienceScore": 6,
  "seoScore": 5,
  "contentQualityScore": 6,
  "designScore": 7,
  "offerClarityScore": 5,
  "hasSeasonalPage": false,
  "hasOnlineBooking": false,
  "hasPaymentOptions": false,
  "hasDeliveryInfo": false,
  "technicalGaps": ["لا يوجد SSL", "سرعة تحميل بطيئة"],
  "contentGaps": ["لا يوجد قسم للأسعار", "لا يوجد محتوى موسمي"],
  "overallScore": 6,
  "summary": "ملخص تحليلي واضح في سطرين",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "biggestMarketingGap": "وصف تفصيلي للثغرة التسويقية الأكبر في سطرين على الأقل",
  "revenueOpportunity": "كيف يمكن زيادة الإيراد فعلياً في سطرين على الأقل",
  "suggestedSalesEntryAngle": "زاوية الدخول البيعية المخصصة لهذا النشاط تحديداً"
}

ملاحظة: قيّم الموقع بناءً على المعرفة العامة بمواقع هذا النوع من الأنشطة في السعودية إذا لم تتمكن من الوصول المباشر.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "أنت محلل تسويق رقمي خبير. أجب دائماً بـ JSON صحيح فقط." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent : "{}";
        let analysis: any = {};
        try { analysis = JSON.parse(content); } catch { analysis = {}; }

        const analysisId = await createWebsiteAnalysis({
          leadId: input.leadId,
          url: input.url,
          hasWebsite: analysis.hasWebsite ?? true,
          loadSpeedScore: analysis.loadSpeedScore,
          mobileExperienceScore: analysis.mobileExperienceScore,
          seoScore: analysis.seoScore,
          contentQualityScore: analysis.contentQualityScore,
          designScore: analysis.designScore,
          offerClarityScore: analysis.offerClarityScore,
          hasSeasonalPage: analysis.hasSeasonalPage ?? false,
          hasOnlineBooking: analysis.hasOnlineBooking ?? false,
          hasPaymentOptions: analysis.hasPaymentOptions ?? false,
          hasDeliveryInfo: analysis.hasDeliveryInfo ?? false,
          technicalGaps: analysis.technicalGaps ?? [],
          contentGaps: analysis.contentGaps ?? [],
          overallScore: analysis.overallScore,
          summary: analysis.summary,
          recommendations: analysis.recommendations ?? [],
          rawAnalysis: content,
        });

        await updateLead(input.leadId, {
          analysisStatus: "completed",
          biggestMarketingGap: analysis.biggestMarketingGap,
          revenueOpportunity: analysis.revenueOpportunity,
          suggestedSalesEntryAngle: analysis.suggestedSalesEntryAngle,
          brandingQualityScore: analysis.designScore,
          leadPriorityScore: analysis.overallScore,
        });

        return { success: true, analysisId };
      } catch (error) {
        await updateLead(input.leadId, { analysisStatus: "failed" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل التحليل" });
      }
    }),

  analyzeSocial: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      platform: z.enum(["instagram", "twitter", "snapchat", "tiktok", "facebook"]),
      profileUrl: z.string(),
      companyName: z.string(),
      businessType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const platformNames: Record<string, string> = {
        instagram: "إنستغرام",
        twitter: "تويتر/X",
        snapchat: "سناب شات",
        tiktok: "تيك توك",
        facebook: "فيسبوك",
      };

      // ===== جلب البيانات الحقيقية من Bright Data Dataset API =====
      let realDataContext = "";
      let realStats: any = {};
      if (["tiktok", "snapchat", "twitter", "facebook"].includes(input.platform)) {
        try {
          console.log(`[analyzeSocial] Fetching real data for ${input.platform}: ${input.profileUrl}`);
          const datasetResult = await fetchSocialPlatformData(
            input.platform as "tiktok" | "snapchat" | "twitter" | "facebook",
            input.profileUrl
          );
          if (datasetResult.success && datasetResult.data && datasetResult.data.length > 0) {
            realStats = extractSocialStats(datasetResult.platform, datasetResult.data);
            const statsLines = [
              realStats.followersCount ? `عدد المتابعين: ${realStats.followersCount.toLocaleString("ar")}` : "",
              realStats.postsCount ? `عدد المنشورات/الفيديوهات: ${realStats.postsCount}` : "",
              realStats.engagementRate ? `معدل التفاعل: ${realStats.engagementRate}%` : "",
              realStats.avgLikes ? `متوسط الإعجابات: ${realStats.avgLikes.toLocaleString("ar")}` : "",
              realStats.avgViews ? `متوسط المشاهدات: ${realStats.avgViews.toLocaleString("ar")}` : "",
              realStats.bio ? `البيو: ${realStats.bio.substring(0, 150)}` : "",
              realStats.isVerified ? `الحساب موثق: نعم` : "",
              realStats.profileName ? `اسم الحساب: ${realStats.profileName}` : "",
            ].filter(Boolean).join("\n");
            if (statsLines) {
              realDataContext = `\n\nبيانات حقيقية من Bright Data Dataset API:\n${statsLines}`;
              if (realStats.recentPosts && realStats.recentPosts.length > 0) {
                const postsPreview = realStats.recentPosts.slice(0, 3).map((p: any, i: number) =>
                  `منشور ${i+1}: ${(p.content || "").substring(0, 80)}${p.likes ? ` (${p.likes} إعجاب)` : ""}${p.views ? ` (${p.views} مشاهدة)` : ""}`
                ).join("\n");
                realDataContext += `\n\nآخر المنشورات:\n${postsPreview}`;
              }
            }
          }
        } catch (err: any) {
          console.warn(`[analyzeSocial] Dataset API failed for ${input.platform}:`, err.message);
          // استمر بالتحليل بدون بيانات حقيقية
        }
      }

      const prompt = `أنت خبير تحليل سوشيال ميديا متخصص في السوق السعودي.

قم بتحليل حساب ${platformNames[input.platform]} التالي:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}${realDataContext}

قدم تحليلاً بصيغة JSON فقط:
{
  "hasAccount": true,
  "postingFrequencyScore": 6,
  "engagementScore": 5,
  "contentQualityScore": 6,
  "hasSeasonalContent": false,
  "hasPricingContent": false,
  "hasCallToAction": false,
  "contentStrategyScore": 5,
  "digitalPresenceScore": 6,
  "followersCount": 0,
  "gaps": ["لا يوجد محتوى موسمي", "لا يوجد وضوح في الأسعار"],
  "overallScore": 5.5,
  "summary": "ملخص تحليلي في سطرين بناءً على البيانات الحقيقية",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل سوشيال ميديا خبير. أجب دائماً بـ JSON صحيح فقط. استخدم البيانات الحقيقية المقدمة لتحليل دقيق." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent2 = response.choices[0]?.message?.content;
      const content = typeof rawContent2 === 'string' ? rawContent2 : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      // دمج البيانات الحقيقية مع تحليل AI
      const finalFollowersCount = realStats.followersCount ?? analysis.followersCount ?? 0;
      const finalEngagementRate = realStats.engagementRate ?? null;

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: input.platform,
        profileUrl: input.profileUrl,
        hasAccount: analysis.hasAccount ?? true,
        followersCount: finalFollowersCount,
        engagementRate: finalEngagementRate,
        postsCount: realStats.postsCount ?? null,
        postingFrequencyScore: analysis.postingFrequencyScore,
        engagementScore: analysis.engagementScore,
        contentQualityScore: analysis.contentQualityScore,
        hasSeasonalContent: analysis.hasSeasonalContent ?? false,
        hasPricingContent: analysis.hasPricingContent ?? false,
        hasCallToAction: analysis.hasCallToAction ?? false,
        contentStrategyScore: analysis.contentStrategyScore,
        digitalPresenceScore: analysis.digitalPresenceScore,
        gaps: analysis.gaps ?? [],
        overallScore: analysis.overallScore,
        summary: analysis.summary,
        recommendations: analysis.recommendations ?? [],
        rawAnalysis: content,
        analysisText: analysis.summary,
      });

      return {
        success: true,
        analysisId,
        realDataFetched: !!realDataContext,
        stats: realStats,
      };
    }),

  getWebsiteAnalysis: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return getWebsiteAnalysisByLeadId(input.leadId);
    }),

  getSocialAnalyses: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return getSocialAnalysesByLeadId(input.leadId);
    }),

  topGaps: protectedProcedure.query(async () => {
    return getTopGaps();
  }),

  generateFullReport: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const websiteAnalysis = await getWebsiteAnalysisByLeadId(input.leadId);
      const socialAnalysesList = await getSocialAnalysesByLeadId(input.leadId);

      const prompt = `أنت خبير تسويق رقمي واستراتيجي مبيعات في السوق السعودي.

بناءً على البيانات التالية، أنشئ تقريراً تسويقياً شاملاً:

النشاط: ${lead.companyName}
النوع: ${lead.businessType}
المدينة: ${lead.city}
الهاتف: ${lead.verifiedPhone || "غير متوفر"}
الموقع: ${lead.website || "غير متوفر"}

تحليل الموقع: ${websiteAnalysis ? `درجة إجمالية ${websiteAnalysis.overallScore}/10 - ${websiteAnalysis.summary}` : "لا يوجد موقع"}
تحليل السوشيال: ${socialAnalysesList.length > 0 ? socialAnalysesList.map(s => `${s.platform}: ${s.overallScore}/10`).join(', ') : "لا توجد حسابات محللة"}

أنشئ تقريراً بصيغة JSON:
{
  "executiveSummary": "ملخص تنفيذي شامل في 3 جمل",
  "digitalPresenceScore": 6,
  "keyStrengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "criticalGaps": ["ثغرة حرجة 1", "ثغرة حرجة 2", "ثغرة حرجة 3"],
  "immediateOpportunities": ["فرصة فورية 1", "فرصة فورية 2"],
  "seasonalOpportunity": "تقييم فرصة الموسم (عيد الأضحى وغيره)",
  "recommendedActions": ["إجراء 1", "إجراء 2", "إجراء 3", "إجراء 4"],
  "salesScript": "نص مقترح لأول تواصل مع العميل",
  "priorityLevel": "high"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي. أجب بـ JSON فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent3 = response.choices[0]?.message?.content;
      const content = typeof rawContent3 === 'string' ? rawContent3 : "{}";
      let report: any = {};
      try { report = JSON.parse(content); } catch { report = {}; }

      if (report.leadPriorityScore) {
        await updateLead(input.leadId, { leadPriorityScore: report.digitalPresenceScore });
      }

      return report;
    }),
  // ===== تحليل جماعي بضغطة واحدة =====
  bulkAnalyze: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not ready" });
      let queued = 0;
      let skipped = 0;
      for (const leadId of input.leadIds) {
        const lead = await getLeadById(leadId);
        if (!lead) { skipped++; continue; }
        // تحديث حالة التحليل إلى "جاري التحليل"
        await updateLead(leadId, { analysisStatus: "analyzing" });
        // تشغيل التحليل في الخلفية (non-blocking)
        (async () => {
          try {
            // تحليل الموقع إذا وجد
            if (lead.website) {
              const { invokeLLM } = await import("./_core/llm");
              const websitePrompt = `أنت خبير تحليل مواقع ويب للسوق السعودي. حلل الموقع التالي:
الشركة: ${lead.companyName}\nنوع النشاط: ${lead.businessType}\nالموقع: ${lead.website}\nالمدينة: ${lead.city}\n\nقدم تحليلاً شاملاً يتضمن:\n1. الدرجة الكلية (0-10)\n2. سرعة التحميل (0-10)\n3. تجربة الجوال (0-10)\n4. SEO (0-10)\n5. جودة المحتوى (0-10)\n6. التصميم (0-10)\n7. أكبر ثغرة تسويقية\n8. فرصة الإيراد\n9. ملخص التحليل`;
              const resp = await invokeLLM({
                messages: [
                  { role: "system", content: "أنت خبير تحليل مواقع ويب وتسويق رقمي في السوق السعودي. أجب بـ JSON فقط." },
                  { role: "user", content: websitePrompt },
                ],
                response_format: { type: "json_schema", json_schema: { name: "website_analysis", strict: true, schema: { type: "object", properties: { overallScore: { type: "number" }, loadSpeed: { type: "number" }, mobileExperience: { type: "number" }, seoScore: { type: "number" }, contentQuality: { type: "number" }, designScore: { type: "number" }, biggestGap: { type: "string" }, revenueOpportunity: { type: "string" }, summary: { type: "string" } }, required: ["overallScore", "loadSpeed", "mobileExperience", "seoScore", "contentQuality", "designScore", "biggestGap", "revenueOpportunity", "summary"], additionalProperties: false } } },
              });
              const raw = resp.choices[0]?.message?.content;
              const analysis = typeof raw === "string" ? JSON.parse(raw) : {};
              const { createWebsiteAnalysis } = await import("./db");
              await createWebsiteAnalysis({
                leadId,
                url: lead.website!,
                overallScore: analysis.overallScore,
                loadSpeedScore: analysis.loadSpeed,
                mobileExperienceScore: analysis.mobileExperience,
                seoScore: analysis.seoScore,
                contentQualityScore: analysis.contentQuality,
                designScore: analysis.designScore,
                summary: analysis.summary,
                rawAnalysis: JSON.stringify({ biggestGap: analysis.biggestGap, revenueOpportunity: analysis.revenueOpportunity }),
              });
              await updateLead(leadId, {
                biggestMarketingGap: analysis.biggestGap,
                suggestedSalesEntryAngle: analysis.revenueOpportunity,
                analysisStatus: "completed",
              });
            } else {
              await updateLead(leadId, { analysisStatus: "completed" });
            }
          } catch {
            await updateLead(leadId, { analysisStatus: "failed" });
          }
        })();
        queued++;
      }
      return { queued, skipped };
    }),
});
// ===== AI SYSTEM INSIGHTS =====

// ===== AI REPORT ROUTER =====
const aiReportRouter = router({
  getSystemInsights: protectedProcedure
    .input(z.object({ period: z.number().min(7).max(90).default(30) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'قاعدة البيانات غير متاحة' });

      // جلب إحصائيات العملاء باستخدام Drizzle ORM
      const { leads: leadsTable } = await import('../drizzle/schema');
      const { count, sum, countDistinct } = await import('drizzle-orm');

      const totalLeads = await db.select({ c: sql<number>`count(*)` }).from(leadsTable);
      const stageGroups = await db.select({
        stage: leadsTable.stage,
        c: sql<number>`count(*)`
      }).from(leadsTable).groupBy(leadsTable.stage);
      const withPhone = await db.select({ c: sql<number>`count(*)` }).from(leadsTable).where(sql`${leadsTable.verifiedPhone} IS NOT NULL AND ${leadsTable.verifiedPhone} != ''`);
      const withWebsite = await db.select({ c: sql<number>`count(*)` }).from(leadsTable).where(sql`${leadsTable.website} IS NOT NULL AND ${leadsTable.website} != ''`);

      const stageMap: Record<string, number> = {};
      for (const row of stageGroups) { stageMap[row.stage] = Number(row.c); }

      const leads = {
        total: Number(totalLeads[0]?.c) || 0,
        new: stageMap['new'] || 0,
        contacted: stageMap['contacted'] || 0,
        interested: stageMap['interested'] || 0,
        offer: (stageMap['price_offer'] || 0),
        meeting: stageMap['meeting'] || 0,
        client: stageMap['won'] || 0,
        lost: stageMap['lost'] || 0,
        withPhone: Number(withPhone[0]?.c) || 0,
        withWebsite: Number(withWebsite[0]?.c) || 0,
      };

      const systemSummary = {
        leads: {
          total: Number(leads.total) || 0,
          new: Number(leads.new) || 0,
          contacted: Number(leads.contacted) || 0,
          interested: Number(leads.interested) || 0,
          offer: Number(leads.offer) || 0,
          meeting: Number(leads.meeting) || 0,
          client: Number(leads.client) || 0,
          lost: Number(leads.lost) || 0,
          withPhone: Number(leads.withPhone) || 0,
          withWebsite: Number(leads.withWebsite) || 0,
          conversionRate: Number(leads.total) > 0 ? Math.round((Number(leads.client) / Number(leads.total)) * 100) : 0,
        },
        period: input.period,
      };

      const prompt = `أنت محلل أعمال خبير متخصص في السوق السعودي.
بيانات نظام CRM واتساب لآخر ${input.period} يوماً:
${JSON.stringify(systemSummary, null, 2)}

قدم تحليلاً شاملاً بصيغة JSON فقط:
{
  "overallScore": 7,
  "summary": "ملخص تنفيذي في 3 أسطر",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "urgentActions": [
    { "title": "إجراء عاجل", "description": "وصف تفصيلي", "impact": "high", "effort": "low" }
  ],
  "improvements": [
    { "title": "تحسين", "description": "وصف تفصيلي", "category": "leads", "impact": "medium", "effort": "medium" }
  ],
  "conversionAnalysis": "تحليل معدل التحويل",
  "pipelineHealth": "تحليل صحة المسار البيعي",
  "nextWeekFocus": ["أولوية 1", "أولوية 2"],
  "kpis": [
    { "name": "KPI", "current": "قيمة", "target": "هدف", "status": "good" }
  ]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل CRM خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === 'string' ? rawContent : "{}";
      let insights: any = {};
      try { insights = JSON.parse(content); } catch { insights = { summary: "تعذر تحليل البيانات" }; }

      return { insights, systemSummary };
    }),
});

// ===== EXPORT ROUTER ======

// ===== EXPORT ROUTER =====
const exportRouter = router({
  exportCSV: protectedProcedure
    .input(z.object({
      zoneId: z.number().optional(),
      city: z.string().optional(),
      analysisStatus: z.string().optional(),
      includeAnalysis: z.boolean().optional().default(true),
    }).optional())
    .mutation(async ({ input }) => {
      const allLeads = await getAllLeads(input ?? {});
      const includeAnalysis = input?.includeAnalysis !== false;

      // Fetch analysis data for all leads if requested
      let analysisMap: Record<number, { website?: any; social?: any[] }> = {};
      if (includeAnalysis) {
        for (const lead of allLeads) {
          const website = await getWebsiteAnalysisByLeadId(lead.id);
          const social = await getSocialAnalysesByLeadId(lead.id);
          analysisMap[lead.id] = { website, social };
        }
      }

      const headers = [
        // Basic info
        "الاسم", "نوع النشاط", "المدينة", "الحي", "المنطقة",
        "الهاتف", "الموقع", "إنستغرام", "تويتر", "سناب شات", "تيك توك", "فيسبوك",
        "عدد التقييمات", "درجة الجودة", "درجة الأولوية",
        "أكبر ثغرة تسويقية", "فرصة الإيراد", "زاوية الدخول",
        // Website analysis
        "تحليل الموقع - الدرجة الكلية", "سرعة التحميل", "تجربة الجوال", "سيو",
        "جودة المحتوى", "التصميم", "وضوح العروض",
        "الثغرات التقنية", "ثغرات المحتوى", "ملخص تحليل الموقع",
        // Social analysis
        "تحليل سوشيال - أفضل منصة", "درجة التفاعل", "جودة المحتوى السوشيال",
        "ثغرات السوشيال", "ملخص تحليل السوشيال",
        "تاريخ الإضافة",
        // PDF Report
        "رابط تقرير PDF"
      ];

      const rows = allLeads.map(lead => {
        const analysis = analysisMap[lead.id];
        const wa = analysis?.website;
        const bestSocial = analysis?.social?.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))[0];
        return [
          // Basic
          lead.companyName, lead.businessType, lead.city, lead.district || "",
          lead.zoneName || "", lead.verifiedPhone || "", lead.website || "",
          lead.instagramUrl || "", lead.twitterUrl || "", lead.snapchatUrl || "",
          lead.tiktokUrl || "", lead.facebookUrl || "",
          lead.reviewCount || 0, lead.brandingQualityScore || "",
          lead.leadPriorityScore || "", lead.biggestMarketingGap || "",
          lead.revenueOpportunity || "", lead.suggestedSalesEntryAngle || "",
          // Website analysis
          wa?.overallScore || "", wa?.loadSpeedScore || "", wa?.mobileExperienceScore || "",
          wa?.seoScore || "", wa?.contentQualityScore || "", wa?.designScore || "", wa?.offerClarityScore || "",
          Array.isArray(wa?.technicalGaps) ? wa.technicalGaps.join(" | ") : "",
          Array.isArray(wa?.contentGaps) ? wa.contentGaps.join(" | ") : "",
          wa?.summary || "",
          // Social analysis
          bestSocial?.platform || "", bestSocial?.engagementScore || "",
          bestSocial?.contentQualityScore || "",
          Array.isArray(bestSocial?.gaps) ? bestSocial.gaps.join(" | ") : "",
          bestSocial?.summary || "",
          new Date(lead.createdAt).toLocaleDateString("ar-SA"),
          // PDF report link
          lead.pdfFileUrl || "",
        ];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      return { csv: "\uFEFF" + csvContent, count: allLeads.length };
    }),
});

// ===== SEARCH ROUTER (Google Places) =====

// ===== SEARCH ROUTER =====
const searchRouter = router({
  // Text search: returns list of places matching query + city
  searchPlaces: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      city: z.string().optional(),
      country: z.string().optional(),
      pagetoken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { makeRequest } = await import("./_core/map");
      const countryPart = input.country || "السعودية";
      const cityPart = input.city ? ` في ${input.city}` : "";
      const searchQuery = `${input.query}${cityPart} ${countryPart}`;
      const params: Record<string, unknown> = {
        query: searchQuery,
        language: "ar",
        region: "SA",
      };
      if (input.pagetoken) params.pagetoken = input.pagetoken;
      const data = await makeRequest<{
        results: Array<{
          place_id: string;
          name: string;
          formatted_address: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          business_status?: string;
          types?: string[];
        }>;
        status: string;
        next_page_token?: string;
        error_message?: string;
      }>("/maps/api/place/textsearch/json", params);
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Google Places Error: ${data.status} - ${data.error_message || ""}`,
        });
      }
      return {
        results: data.results || [],
        nextPageToken: data.next_page_token || null,
        total: data.results?.length || 0,
      };
    }),

  // Get full details for a specific place (phone, website, etc.)
  getPlaceDetails: protectedProcedure
    .input(z.object({ placeId: z.string() }))
    .query(async ({ input }) => {
      const { makeRequest } = await import("./_core/map");
      const data = await makeRequest<{
        result: {
          place_id: string;
          name: string;
          formatted_address: string;
          formatted_phone_number?: string;
          international_phone_number?: string;
          website?: string;
          rating?: number;
          user_ratings_total?: number;
          geometry: { location: { lat: number; lng: number } };
          types?: string[];
          opening_hours?: { open_now: boolean; weekday_text: string[] };
          reviews?: Array<{ author_name: string; rating: number; text: string }>;
          url?: string;
          photos?: Array<{ photo_reference: string; height: number; width: number }>;
        };
        status: string;
        error_message?: string;
      }>("/maps/api/place/details/json", {
        place_id: input.placeId,
        fields: "place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,geometry,types,opening_hours,url,photos",
        language: "ar",
      });
      if (data.status !== "OK") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Place not found: ${data.status}`,
        });
      }
      // تحويل photo_reference إلى روابط مباشرة
      const photoUrls = (data.result.photos || []).slice(0, 10).map(
        (p) => `/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}`
      );
      return { ...data.result, photoUrls };
    }),

  // استخراج بيانات الأنشطة التجارية من رابط مخصص
  scrapeUrl: protectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      // جلب محتوى الصفحة
      let pageContent = "";
      try {
        const res = await fetch(input.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ar,en;q=0.9",
          },
          signal: AbortSignal.timeout(15000),
        });
        const html = await res.text();
        // استخراج النص من HTML
        pageContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل جلب الصفحة: ${err.message}` });
      }
      // استخدام الذكاء الاصطناعي لاستخراج بيانات الأنشطة التجارية
      const aiRes = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت محلل بيانات متخصص في استخراج بيانات الأنشطة التجارية السعودية. استخرج كل نشاط تجاري من النص وأرجع JSON array. كل عنصر يحتوي: name (اسم النشاط), businessType (نوع النشاط), city (المدينة), phone (رقم الهاتف), website (الموقع), instagram (حساب انستغرام), description (وصف مختصر). إذا لم تجد بيانات كافية أرجع [].`
          },
          {
            role: "user",
            content: `استخرج الأنشطة التجارية من هذا النص:\n\n${pageContent}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "businesses",
            strict: true,
            schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      businessType: { type: "string" },
                      city: { type: "string" },
                      phone: { type: "string" },
                      website: { type: "string" },
                      instagram: { type: "string" },
                      description: { type: "string" },
                    },
                    required: ["name", "businessType", "city", "phone", "website", "instagram", "description"],
                    additionalProperties: false,
                  }
                }
              },
              required: ["results"],
              additionalProperties: false,
            }
          }
        }
      });
      let results: any[] = [];
      try {
        const parsed = JSON.parse(aiRes.choices[0].message.content as string);
        results = parsed.results || [];
      } catch {
        results = [];
      }
      return { results, url: input.url, count: results.length };
    }),
  // Check if a place already exists as a lead (by name + phone)
  // فحص تكرار متعدد دفعة واحدة لفلترة نتائج البحث
  checkBulkDuplicates: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        name: z.string(),
        phone: z.string().optional(),
      }))
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { duplicates: [] };
      const { leads } = await import("../drizzle/schema");
      const { or, eq, like } = await import("drizzle-orm");
      const duplicateKeys: string[] = [];
      for (const item of input.items) {
        const conditions = [like(leads.companyName, `%${item.name}%`)];
        if (item.phone) conditions.push(eq(leads.verifiedPhone, item.phone));
        const existing = await db.select({ id: leads.id })
          .from(leads)
          .where(or(...conditions))
          .limit(1);
        if (existing.length > 0) {
          duplicateKeys.push(item.phone || item.name);
        }
      }
      return { duplicates: duplicateKeys };
    }),

  checkDuplicate: protectedProcedure
    .input(z.object({ companyName: z.string(), phone: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { isDuplicate: false, existingId: null };
      const { leads } = await import("../drizzle/schema");
      const { or, eq, like } = await import("drizzle-orm");
      const conditions = [like(leads.companyName, `%${input.companyName}%`)];
      if (input.phone) conditions.push(eq(leads.verifiedPhone, input.phone));
      const existing = await db.select({ id: leads.id, companyName: leads.companyName })
        .from(leads)
        .where(or(...conditions))
        .limit(1);
      return {
        isDuplicate: existing.length > 0,
        existingId: existing[0]?.id || null,
        existingName: existing[0]?.companyName || null,
      };
    }),

  // ===== بحث جغرافي بالإحداثيات والنطاق =====
  // يستخدم Google Places Nearby Search API
  searchByRadius: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      radiusKm: z.number().min(0.5).max(50).default(5),
      pagetoken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { makeRequest } = await import("./_core/map");
      const radiusMeters = Math.round(input.radiusKm * 1000);
      const params: Record<string, unknown> = {
        keyword: input.keyword,
        location: `${input.lat},${input.lng}`,
        radius: radiusMeters,
        language: "ar",
        region: "SA",
      };
      if (input.pagetoken) params.pagetoken = input.pagetoken;
      const data = await makeRequest<{
        results: Array<{
          place_id: string;
          name: string;
          formatted_address?: string;
          vicinity?: string;
          geometry: { location: { lat: number; lng: number } };
          rating?: number;
          user_ratings_total?: number;
          business_status?: string;
          types?: string[];
          opening_hours?: { open_now: boolean };
          photos?: Array<{ photo_reference: string }>;
        }>;
        status: string;
        next_page_token?: string;
        error_message?: string;
      }>("/maps/api/place/nearbysearch/json", params);
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Google Nearby Search Error: ${data.status} - ${data.error_message || ""}`,
        });
      }
      // تحويل النتائج لنفس تنسيق searchPlaces
      const results = (data.results || []).map(r => ({
        place_id: r.place_id,
        name: r.name,
        formatted_address: r.formatted_address || r.vicinity || "",
        geometry: r.geometry,
        rating: r.rating,
        user_ratings_total: r.user_ratings_total,
        business_status: r.business_status,
        types: r.types,
        opening_hours: r.opening_hours,
      }));
      return {
        results,
        nextPageToken: data.next_page_token || null,
        total: results.length,
        searchCenter: { lat: input.lat, lng: input.lng },
        radiusKm: input.radiusKm,
      };
    }),

  // بحث Google Maps Scraping المباشر (بيانات أكثر من Places API)
  scrapeGoogleMaps: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      location: z.string().min(1),
      preferScraping: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const { scrapeGoogleMaps } = await import("./lib/googleMapsScraper");
      return scrapeGoogleMaps(input.query, input.location, input.preferScraping);
    }),

  // تحويل اسم المدينة أو العنوان إلى إحداثيات جغرافية
  geocodeAddress: protectedProcedure
    .input(z.object({
      address: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const { makeRequest } = await import("./_core/map");
      const data = await makeRequest<{
        results: Array<{
          geometry: { location: { lat: number; lng: number } };
          formatted_address: string;
        }>;
        status: string;
        error_message?: string;
      }>("/maps/api/geocode/json", {
        address: input.address,
        language: "ar",
        region: "SA",
      });
      if (data.status !== "OK" || !data.results?.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `لم يتم العثور على الإحداثيات لـ: ${input.address}`,
        });
      }
      const loc = data.results[0].geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        formattedAddress: data.results[0].formatted_address,
      };
    }),
});

// ===== SEARCH JOBS ROUTER =====
// خريطة المهام الجارية في الذاكرة (jobId -> AbortController)
const runningJobs = new Map<number, { abort: boolean }>();


// ===== SEARCH JOBS ROUTER =====
const searchJobsRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllSearchJobs();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const job = await getSearchJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      return job;
    }),

  create: protectedProcedure
    .input(z.object({
      jobName: z.string().min(1),
      country: z.string().min(1),
      city: z.string().min(1),
      businessType: z.string().min(1),
      targetCount: z.number().min(1).max(500).default(50),
    }))
    .mutation(async ({ input }) => {
      // توليد كلمات بحث متعددة بناءً على نوع النشاط
      const keywords = generateSearchKeywords(input.businessType, input.city, input.country);
      const id = await createSearchJob({
        jobName: input.jobName,
        country: input.country,
        city: input.city,
        businessType: input.businessType,
        searchKeywords: keywords,
        targetCount: input.targetCount,
        status: "pending",
        totalSearched: 0,
        totalFound: 0,
        totalDuplicates: 0,
        totalAdded: 0,
        currentPage: 0,
        log: [],
      });
      return { id, keywords };
    }),

  start: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const job = await getSearchJobById(input.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND" });
      if (job.status === "running") return { message: "المهمة تعمل بالفعل" };
      
      // تشغيل المهمة في الخلفية بدون انتظار
      runSearchJobInBackground(input.id).catch(console.error);
      return { message: "تم بدء المهمة" };
    }),

  pause: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const ctrl = runningJobs.get(input.id);
      if (ctrl) ctrl.abort = true;
      await updateSearchJob(input.id, { status: "paused" });
      return { message: "تم إيقاف المهمة مؤقتاً" };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const ctrl = runningJobs.get(input.id);
      if (ctrl) ctrl.abort = true;
      runningJobs.delete(input.id);
      await deleteSearchJob(input.id);
      return { success: true };
    }),
});

// ===== دالة توليد كلمات البحث الذكية =====
function generateSearchKeywords(businessType: string, city: string, country: string): string[] {
  const base = businessType.trim();
  const keywords: string[] = [
    base,
    `${base} ${city}`,
    `محل ${base}`,
    `مؤسسة ${base}`,
    `شركة ${base}`,
  ];
  // إضافة مرادفات شائعة
  const synonyms: Record<string, string[]> = {
    "ملحمة": ["جزارة", "لحوم", "محل لحوم", "لحم طازج"],
    "أغنام": ["خراف", "ماعز", "مزرعة أغنام", "بيع أغنام"],
    "مطعم": ["مطعم شعبي", "مطعم مشاوي", "مطعم سمك", "كافتيريا"],
    "صيدلية": ["دواء", "صيدلانية", "مستلزمات طبية"],
    "بقالة": ["سوبرماركت", "تموينات", "هايبر"],
    "مقهى": ["كافيه", "قهوة", "كوفي"],
    "صالون": ["حلاق", "حلاقة", "تجميل"],
  };
  for (const [key, syns] of Object.entries(synonyms)) {
    if (base.includes(key)) {
      keywords.push(...syns.map(s => `${s} ${city}`));
      break;
    }
  }
  return Array.from(new Set(keywords)).slice(0, 8); // حد أقصى 8 كلمات بحث
}

// ===== محرك البحث الخلفي الذكي =====
async function runSearchJobInBackground(jobId: number): Promise<void> {
  const ctrl = { abort: false };
  runningJobs.set(jobId, ctrl);

  const addLog = async (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    const job = await getSearchJobById(jobId);
    if (!job) return;
    const currentLog = (job.log as any[]) || [];
    const newEntry = { time: new Date().toISOString(), message, type };
    const updatedLog = [...currentLog.slice(-49), newEntry]; // احتفظ بآخر 50 رسالة
    await updateSearchJob(jobId, { log: updatedLog as any });
  };

  try {
    await updateSearchJob(jobId, { status: "running", startedAt: new Date() });
    await addLog("🚀 بدأ محرك البحث الذكي", "info");

    const job = await getSearchJobById(jobId);
    if (!job) return;

    const keywords = (job.searchKeywords as string[]) || [job.businessType];
    let totalAdded = 0;
    let totalDuplicates = 0;
    let totalSearched = 0;

    for (const keyword of keywords) {
      if (ctrl.abort) break;
      if (totalAdded >= job.targetCount) break;

      await addLog(`🔍 البحث عن: "${keyword}" في ${job.city}`, "info");
      await updateSearchJob(jobId, { currentKeyword: keyword });

      let nextPageToken: string | undefined = undefined;
      let pageNum = 0;

      do {
        if (ctrl.abort) break;
        if (totalAdded >= job.targetCount) break;

        // تأخير بشري عشوائي بين الطلبات (2-5 ثوانٍ)
        const delay = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, delay));

        try {
          const { makeRequest } = await import("./_core/map");
          
          const searchQuery = `${keyword} في ${job.city}`;
          const params: Record<string, string> = {
            query: searchQuery,
            language: "ar",
            region: "SA",
          };
          if (nextPageToken) params.pagetoken = nextPageToken;

          const data = await makeRequest<{
            results: Array<{
              place_id: string;
              name: string;
              formatted_address: string;
              rating?: number;
              user_ratings_total?: number;
              types?: string[];
              geometry?: { location: { lat: number; lng: number } };
            }>;
            next_page_token?: string;
            status: string;
          }>("/maps/api/place/textsearch/json", params);

          if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
            await addLog(`⚠️ خطأ في البحث: ${data.status}`, "warning");
            break;
          }

          const results = data.results || [];
          totalSearched += results.length;
          await updateSearchJob(jobId, { totalSearched });
          await addLog(`📋 وجد ${results.length} نتيجة في الصفحة ${pageNum + 1}`, "info");

          for (const place of results) {
            if (ctrl.abort) break;
            if (totalAdded >= job.targetCount) break;

            // تأخير إضافي بين جلب التفاصيل (1-2 ثانية)
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

            try {
              // جلب تفاصيل المكان (الهاتف والموقع)
              const details = await makeRequest<{
                result: {
                  name: string;
                  formatted_phone_number?: string;
                  international_phone_number?: string;
                  website?: string;
                  formatted_address?: string;
                  url?: string;
                };
                status: string;
              }>("/maps/api/place/details/json", {
                place_id: place.place_id,
                fields: "name,formatted_phone_number,international_phone_number,website,formatted_address,url",
                language: "ar",
              });

              if (details.status !== "OK") continue;

              const d = details.result;
              const phone = d.formatted_phone_number || d.international_phone_number || "";

              // فحص التكرار
              const isDuplicate = phone ? await checkLeadDuplicate(phone, d.name) : false;
              if (isDuplicate) {
                totalDuplicates++;
                await updateSearchJob(jobId, { totalDuplicates });
                await addLog(`⚡ مكرر: ${d.name}`, "warning");
                continue;
              }

              // إضافة Lead جديد
              await createLead({
                companyName: d.name || place.name,
                businessType: job.businessType,
                country: job.country,
                city: job.city,
                verifiedPhone: phone || undefined,
                website: d.website || undefined,
                googleMapsUrl: d.url || undefined,
                district: d.formatted_address || place.formatted_address || undefined,
                reviewCount: place.user_ratings_total || 0,
                analysisStatus: "pending",
                sourceJobId: jobId,
              });

              totalAdded++;
              await updateSearchJob(jobId, { totalAdded, totalFound: totalAdded + totalDuplicates });
              await addLog(`✅ أُضيف: ${d.name || place.name}${phone ? ` (${phone})` : " (بدون هاتف)"}`, "success");

            } catch (detailErr) {
              await addLog(`❌ فشل جلب تفاصيل: ${place.name}`, "error");
            }
          }

          nextPageToken = data.next_page_token;
          pageNum++;

          // Google Places يتطلب انتظار 2 ثانية قبل استخدام next_page_token
          if (nextPageToken) await new Promise(resolve => setTimeout(resolve, 2500));

        } catch (searchErr) {
          await addLog(`❌ خطأ في البحث: ${String(searchErr)}`, "error");
          break;
        }

      } while (nextPageToken && !ctrl.abort && totalAdded < job.targetCount);
    }

    const finalStatus = ctrl.abort ? "paused" : "completed";
    await updateSearchJob(jobId, {
      status: finalStatus,
      completedAt: new Date(),
      totalAdded,
      totalDuplicates,
      totalSearched,
    });
    await addLog(
      finalStatus === "completed"
        ? `🎉 اكتملت المهمة! تم إضافة ${totalAdded} عميل جديد`
        : `⏸️ تم إيقاف المهمة. أُضيف ${totalAdded} عميل`,
      finalStatus === "completed" ? "success" : "warning"
    );

  } catch (err) {
    await updateSearchJob(jobId, { status: "failed", errorMessage: String(err) });
  } finally {
    runningJobs.delete(jobId);
  }
}

// ===== MAIN ROUTER =====
// ====== AI Search Assistant Router ======

// ===== AI SEARCH ROUTER =====
const aiSearchRouter = router({
  // يولد استراتيجية بحث ذكية مخصصة لكل منصة ونشاط
  generateStrategy: protectedProcedure
    .input(z.object({
      platform: z.string(),
      businessType: z.string(),
      city: z.string(),
      country: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const platformNames: Record<string, string> = {
        snapchat: "سناب شات",
        instagram: "إنستغرام",
        tiktok: "تيك توك",
        facebook: "فيسبوك",
        maroof: "منصة معروف السعودية",
      };
      const platformAr = platformNames[input.platform] || input.platform;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت خبير استراتيجي في التسويق الرقمي والبحث عن الأنشطة التجارية في السوق السعودي والخليجي. مهمتك توليد استراتيجيات بحث دقيقة ومخصصة لكل منصة.`,
          },
          {
            role: "user",
            content: `أريد البحث عن نشاط تجاري من نوع "${input.businessType}" في مدينة "${input.city}" عبر منصة "${platformAr}".

أعطني:
1. أفضل 8-10 كلمات بحث وهاشتاقات مناسبة لهذه المنصة
2. استراتيجية البحث المثلى (كيف تبحث خطوة بخطوة)
3. علامات تدل على أن الحساب نشاط تجاري حقيقي وليس شخصي
4. البيانات التي يجب استخراجها من كل حساب
5. زاوية التواصل المقترحة مع هذا النوع من الأنشطة

أجب بصيغة JSON منظمة.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "search_strategy",
            strict: true,
            schema: {
              type: "object",
              properties: {
                keywords: { type: "array", items: { type: "string" }, description: "كلمات البحث والهاشتاقات" },
                strategy: { type: "string", description: "استراتيجية البحث خطوة بخطوة" },
                qualitySignals: { type: "array", items: { type: "string" }, description: "علامات الحساب التجاري الحقيقي" },
                dataToExtract: { type: "array", items: { type: "string" }, description: "البيانات المطلوب استخراجها" },
                contactAngle: { type: "string", description: "زاوية التواصل المقترحة" },
                platformTips: { type: "string", description: "نصائح خاصة بهذه المنصة" },
              },
              required: ["keywords", "strategy", "qualitySignals", "dataToExtract", "contactAngle", "platformTips"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("لم يتم توليد الاستراتيجية");
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    }),

  // يقيّم جودة العميل المدخل يدوياً
  evaluateLead: protectedProcedure
    .input(z.object({
      companyName: z.string(),
      platform: z.string(),
      businessType: z.string(),
      profileUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت محلل تسويقي متخصص في تقييم جودة العملاء المحتملين في السوق السعودي.`,
          },
          {
            role: "user",
            content: `قيّم هذا العميل المحتمل:
- الاسم: ${input.companyName}
- المنصة: ${input.platform}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl || "غير متاح"}
- ملاحظات: ${input.notes || "لا يوجد"}

أعطني تقييماً سريعاً يشمل: درجة الجودة (1-10)، مستوى الاهتمام المتوقع، أفضل وقت للتواصل، وأبرز نقطة ضعف تسويقية يمكن استغلالها.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "lead_evaluation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                qualityScore: { type: "number", description: "درجة الجودة من 1 إلى 10" },
                interestLevel: { type: "string", description: "مستوى الاهتمام المتوقع: منخفض/متوسط/عالي" },
                bestContactTime: { type: "string", description: "أفضل وقت للتواصل" },
                mainWeakness: { type: "string", description: "أبرز نقطة ضعف تسويقية" },
                recommendation: { type: "string", description: "توصية سريعة للتواصل" },
              },
              required: ["qualityScore", "interestLevel", "bestContactTime", "mainWeakness", "recommendation"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("لم يتم التقييم");
      return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    }),
});

// ===== WHATSAPP ROUTER =====

// ===== INSTAGRAM ROUTER =====
const instagramRouter = router({
  // جلب كل عمليات البحث
  listSearches: protectedProcedure.query(async () => {
    return getAllInstagramSearches();
  }),

  // بدء بحث جديد بالهاشتاق
  startSearch: protectedProcedure
    .input(z.object({
      hashtag: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      // قراءة credentials من قاعدة البيانات أولاً، ثم متغيرات البيئة كبديل
      const db = await getDb();
      let token: string | null = null;
      let appId: string | null = null;
      if (db) {
        const [settings] = await db.select().from(aiSettings).limit(1);
        if (settings?.instagramApiEnabled && settings?.instagramAccessToken && settings?.instagramAppId) {
          token = settings.instagramAccessToken;
          appId = settings.instagramAppId;
        }
      }
      // بديل: متغيرات البيئة
      if (!token) token = process.env.INSTAGRAM_ACCESS_TOKEN || null;
      if (!appId) appId = process.env.INSTAGRAM_APP_ID || null;
      // إذا لا توجد credentials → رفض الطلب بدون توليد بيانات وهمية
      if (!token || !appId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "يجب إضافة Instagram Access Token وApp ID في إعدادات AI لتفعيل البحث في إنستجرام. لا يمكن عرض نتائج بدون مصدر حقيقي.",
        });
      }
      // تنظيف الهاشتاق وإنشاء سجل البحث
      const hashtag = input.hashtag.replace(/^#/, "").trim();
      const searchId = await createInstagramSearch({ hashtag, status: "running", resultsCount: 0 });
      try {
        // الخطوة 1: الحصول على معرف الهاشتاق
        const hashtagRes = await fetch(
          `https://graph.facebook.com/v18.0/ig_hashtag_search?user_id=${appId}&q=${encodeURIComponent(hashtag)}&access_token=${token}`
        );
        const hashtagData = await hashtagRes.json() as any;

        if (!hashtagData.data || hashtagData.data.length === 0) {
          await updateInstagramSearch(searchId, { status: "error", errorMsg: "لم يُعثر على الهاشتاق" });
          return { searchId, status: "error", error: "لم يُعثر على الهاشتاق" };
        }

        const hashtagId = hashtagData.data[0].id;

        // الخطوة 2: جلب المنشورات الحديثة بهذا الهاشتاق
        const postsRes = await fetch(
          `https://graph.facebook.com/v18.0/${hashtagId}/recent_media?user_id=${appId}&fields=id,caption,media_type,timestamp,owner&access_token=${token}&limit=50`
        );
        const postsData = await postsRes.json() as any;

        if (!postsData.data || postsData.data.length === 0) {
          await updateInstagramSearch(searchId, { status: "done", resultsCount: 0 });
          return { searchId, status: "done", count: 0 };
        }

        // الخطوة 3: جلب تفاصيل كل حساب
        const ownerIds = Array.from(new Set((postsData.data as any[]).map((p: any) => p.owner?.id).filter(Boolean))) as string[];
        const accounts: any[] = [];

        for (const ownerId of ownerIds.slice(0, 30)) {
          try {
            const profileRes = await fetch(
              `https://graph.facebook.com/v18.0/${ownerId}?fields=id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url,is_business_account,category&access_token=${token}`
            );
            const profile = await profileRes.json() as any;

            if (profile.username) {
              // استخراج الهاتف والإيميل من البيو
              const bio = profile.biography || "";
              const phoneMatch = bio.match(/(?:\+966|966|05|5)[0-9\s\-]{8,12}/);
              const emailMatch = bio.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

              accounts.push({
                searchId,
                username: profile.username,
                fullName: profile.name || null,
                bio: bio || null,
                website: profile.website || null,
                followersCount: profile.followers_count || 0,
                followingCount: profile.follows_count || 0,
                postsCount: profile.media_count || 0,
                profilePicUrl: profile.profile_picture_url || null,
                isBusinessAccount: profile.is_business_account || false,
                businessCategory: profile.category || null,
                phone: phoneMatch ? phoneMatch[0].replace(/\s/g, "") : null,
                email: emailMatch ? emailMatch[0] : null,
                city: null,
              });
            }
          } catch {
            // تجاهل الحسابات التي لا يمكن جلبها
          }
        }

        if (accounts.length > 0) {
          await createInstagramAccounts(accounts);
        }

        await updateInstagramSearch(searchId, { status: "done", resultsCount: accounts.length });
        return { searchId, status: "done", count: accounts.length };

      } catch (err: any) {
        await updateInstagramSearch(searchId, { status: "error", errorMsg: err.message });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  // جلب حسابات بحث معين
  getAccounts: protectedProcedure
    .input(z.object({ searchId: z.number() }))
    .query(async ({ input }) => {
      return getInstagramAccountsBySearchId(input.searchId);
    }),

  // إضافة حساب كـ lead
  addAsLead: protectedProcedure
    .input(z.object({
      accountId: z.number(),
      companyName: z.string(),
      businessType: z.string(),
      city: z.string().optional(),
      instagramUrl: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { accountId, ...leadData } = input;
        const leadId = await createLead({
          companyName: leadData.companyName,
          businessType: leadData.businessType,
          city: leadData.city || "غير محدد",
          instagramUrl: leadData.instagramUrl || null,
          verifiedPhone: leadData.phone || null,
          website: leadData.website || null,
          notes: leadData.notes || null,
          country: "السعودية",
        });
      await markInstagramAccountAsLead(accountId, leadId);
      return { success: true, leadId };
    }),

  // ===== جلب بيانات الاتصال بـ Instagram =====
  getCredentials: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { appId: "", appSecret: "", accessToken: "" };
    const [settings] = await db.select().from(aiSettings).limit(1);
    return {
      appId: settings?.instagramAppId || "",
      appSecret: settings?.instagramAppSecret || "",
      accessToken: settings?.instagramAccessToken || "",
    };
  }),

  // ===== حفظ بيانات الاتصال بـ Instagram =====
  saveCredentials: protectedProcedure
    .input(z.object({
      appId: z.string(),
      appSecret: z.string(),
      accessToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [existing] = await db.select().from(aiSettings).limit(1);
      if (existing) {
        await db.update(aiSettings).set({
          instagramAppId: input.appId || null,
          instagramAppSecret: input.appSecret || null,
          instagramAccessToken: input.accessToken || null,
          instagramApiEnabled: !!(input.accessToken),
        });
      } else {
        await db.insert(aiSettings).values({
          instagramAppId: input.appId || null,
          instagramAppSecret: input.appSecret || null,
          instagramAccessToken: input.accessToken || null,
          instagramApiEnabled: !!(input.accessToken),
        });
      }
      return { success: true };
    }),

  // ===== اختبار الاتصال بـ Instagram =====
  testConnection: protectedProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [settings] = await db.select().from(aiSettings).limit(1);
      const token = settings?.instagramAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN;
      if (!token) {
        return { success: false, error: "لا يوجد Access Token محفوظ" };
      }
      try {
        const res = await fetch(
          `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`
        );
        const data = await res.json() as any;
        if (data.error) {
          return { success: false, error: data.error.message };
        }
        // جلب تفاصيل حساب Instagram
        const igRes = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`
        );
        const igData = await igRes.json() as any;
        let igAccount = null;
        if (igData.data && igData.data.length > 0) {
          const pageId = igData.data[0].id;
          const pageToken = igData.data[0].access_token;
          const igPageRes = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
          );
          const igPageData = await igPageRes.json() as any;
          if (igPageData.instagram_business_account) {
            const igId = igPageData.instagram_business_account.id;
            const profileRes = await fetch(
              `https://graph.facebook.com/v18.0/${igId}?fields=username,name,followers_count,media_count&access_token=${pageToken}`
            );
            igAccount = await profileRes.json() as any;
          }
        }
        return {
          success: true,
          account: igAccount || { username: data.name, name: data.name, followers: 0, mediaCount: 0 },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),

  // اقتراح هاشتاقات بالذكاء الاصطناعي
  suggestHashtags: protectedProcedure
    .input(z.object({ niche: z.string() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت خبير في التسويق الرقمي السعودي. مهمتك اقتراح هاشتاقات إنستغرام للبحث عن أنشطة تجارية سعودية."
          },
          {
            role: "user",
            content: `اقترح 10 هاشتاقات إنستغرام باللغة العربية للبحث عن: ${input.niche}\n\nأرجع JSON فقط: { "hashtags": ["هاشتاق1", "هاشتاق2", ...] }`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "hashtags_response",
            strict: true,
            schema: {
              type: "object",
              properties: {
                hashtags: { type: "array", items: { type: "string" } }
              },
              required: ["hashtags"],
              additionalProperties: false
            }
          }
        }
      });
      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return parsed.hashtags as string[];
    }),
});

// ===== DATA SETTINGS ROUTER =====

// ===== DATA SETTINGS ROUTER =====
const dataSettingsRouter = router({
  // جلب خيارات فئة معينة
  getByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db!.select().from(dataSettings)
        .where(and(eq(dataSettings.category, input.category), eq(dataSettings.isActive, true)))
        .orderBy(asc(dataSettings.sortOrder), asc(dataSettings.label));
    }),
  // جلب كل الفئات
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    return db!.select().from(dataSettings)
      .where(eq(dataSettings.isActive, true))
      .orderBy(asc(dataSettings.category), asc(dataSettings.sortOrder));
  }),
  // إضافة خيار جديد
  create: protectedProcedure
    .input(z.object({
      category: z.enum(["businessType", "city", "district", "source", "tag"]),
      value: z.string().min(1).max(200),
      label: z.string().min(1).max(200),
      parentValue: z.string().optional(),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.insert(dataSettings).values({
        category: input.category,
        value: input.value,
        label: input.label,
        parentValue: input.parentValue,
        sortOrder: input.sortOrder,
        isActive: true,
      });
      return { success: true };
    }),
  // تعديل خيار
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().min(1).max(200).optional(),
      sortOrder: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...rest } = input;
      await db!.update(dataSettings).set(rest).where(eq(dataSettings.id, id));
      return { success: true };
    }),
  // حذف خيار
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db!.delete(dataSettings).where(eq(dataSettings.id, input.id));
      return { success: true };
    }),
  // تحديث ترتيب الخيارات
  reorder: protectedProcedure
    .input(z.array(z.object({ id: z.number(), sortOrder: z.number() })))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await Promise.all(input.map(item =>
        db!.update(dataSettings).set({ sortOrder: item.sortOrder }).where(eq(dataSettings.id, item.id))
      ));
      return { success: true };
    }),
});
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  zones: zonesRouter,
  leads: leadsRouter,
  analysis: analysisRouter,
  aiReport: aiReportRouter,
  export: exportRouter,
  search: searchRouter,
  searchJobs: searchJobsRouter,
  aiSearch: aiSearchRouter,
  instagram: instagramRouter,
  dataSettings: dataSettingsRouter,
  invitations: invitationsRouter,
  aiConfig: aiSettingsRouter,
  brightDataSearch: brightDataSearchRouter,
  brightDataAnalysis: brightDataAnalysisRouter,
  aiAgent: aiAgentRouter,
  googleSearch: googleSearchRouter,
  socialSearch: socialSearchRouter,
  segments: segmentsRouter,
  companySettings: companySettingsRouter,
  digitalMarketing: digitalMarketingRouter,
  staffAuth: staffAuthRouter,
  auditLog: auditLogRouter,
  reminders: remindersRouter,
  labels: labelsRouter,
  interestKw: interestKwRouter,
  ragKnowledge: ragKnowledgeRouter,
  dataQuality: dataQualityRouter,
  campaigns: campaignsRouter,
  behaviorAnalysis: behaviorAnalysisRouter,
  report: reportRouter,
  weeklyReports: weeklyReportsRouter,
  inbox: inboxRouter,
  whatsapp: whatsappRouter,
  waAccounts: waAccountsRouter,
  wauto: wautoRouter,
  numberHealth: numberHealthRouter,
  activation: activationRouter,
  followUp: followUpRouter,
  searchBehavior: searchBehaviorRouter,
  reportScheduler: reportSchedulerRouter,
  deduplication: deduplicationRouter,
  sectorAnalysis: sectorAnalysisRouter,
  pdfReport: pdfReportRouter,
  bulkAnalysis: bulkAnalysisRouter,
  analysisSettings: analysisSettingsRouter,
  serpQueue: serpQueueRouter,
  seasons: seasonsRouter,
  reportStyle: reportStyleRouter,
  leadIntelligence: leadIntelligenceRouter,
  whatchimp: whatchimpRouter,
});
export type AppRouter = typeof appRouter;
