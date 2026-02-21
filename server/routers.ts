import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllZones, getZoneById, createZone, updateZone, deleteZone,
  getAllLeads, getLeadById, createLead, updateLead, deleteLead, getLeadsStats,
  getWebsiteAnalysisByLeadId, createWebsiteAnalysis,
  getSocialAnalysesByLeadId, createSocialAnalysis,
  getTopGaps, getDb,
  createSearchJob, getSearchJobById, getAllSearchJobs, updateSearchJob, deleteSearchJob, checkLeadDuplicate,
  createInstagramSearch, updateInstagramSearch, getAllInstagramSearches,
  getInstagramSearchById, createInstagramAccounts, getInstagramAccountsBySearchId,
  markInstagramAccountAsLead,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { whatsappMessages } from "../drizzle/schema";
import { nanoid } from "nanoid";
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
      notes: z.string().optional(),
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
const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      zoneId: z.number().optional(),
      city: z.string().optional(),
      businessType: z.string().optional(),
      analysisStatus: z.string().optional(),
      search: z.string().optional(),
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
      reviewCount: z.number().optional(),
      socialSince: z.string().optional(),
      notes: z.string().optional(),
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
      reviewCount: z.number().optional(),
      brandingQualityScore: z.number().optional(),
      seasonalReadinessScore: z.number().optional(),
      leadPriorityScore: z.number().optional(),
      biggestMarketingGap: z.string().optional(),
      revenueOpportunity: z.string().optional(),
      suggestedSalesEntryAngle: z.string().optional(),
      analysisStatus: z.enum(["pending", "analyzing", "completed", "failed"]).optional(),
      notes: z.string().optional(),
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

      const prompt = `أنت خبير تحليل سوشيال ميديا متخصص في السوق السعودي.

قم بتحليل حساب ${platformNames[input.platform]} التالي:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}

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
  "gaps": ["لا يوجد محتوى موسمي", "لا يوجد وضوح في الأسعار"],
  "overallScore": 5.5,
  "summary": "ملخص تحليلي في سطرين",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"]
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل سوشيال ميديا خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent2 = response.choices[0]?.message?.content;
      const content = typeof rawContent2 === 'string' ? rawContent2 : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: input.platform,
        profileUrl: input.profileUrl,
        hasAccount: analysis.hasAccount ?? true,
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
      });

      return { success: true, analysisId };
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
});

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
        "تاريخ الإضافة"
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
        ];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");
      return { csv: "\uFEFF" + csvContent, count: allLeads.length };
    }),
});

// ===== SEARCH ROUTER (Google Places) =====
const searchRouter = router({
  // Text search: returns list of places matching query + city
  searchPlaces: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      city: z.string().min(1),
      pagetoken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { makeRequest } = await import("./_core/map");
      const searchQuery = `${input.query} في ${input.city} السعودية`;
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
        };
        status: string;
        error_message?: string;
      }>("/maps/api/place/details/json", {
        place_id: input.placeId,
        fields: "place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,geometry,types,opening_hours,url",
        language: "ar",
      });
      if (data.status !== "OK") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Place not found: ${data.status}`,
        });
      }
      return data.result;
    }),

  // Check if a place already exists as a lead (by name + phone)
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
});

// ===== SEARCH JOBS ROUTER =====
// خريطة المهام الجارية في الذاكرة (jobId -> AbortController)
const runningJobs = new Map<number, { abort: boolean }>();

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
const whatsappRouter = router({
  // ===== TEMPLATES =====
  // جلب كل القوالب
  listTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { whatsappTemplates } = await import("../drizzle/schema");
    const { desc } = await import("drizzle-orm");
    return db.select().from(whatsappTemplates).orderBy(desc(whatsappTemplates.isDefault), desc(whatsappTemplates.usageCount));
  }),

  // إنشاء قالب جديد
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      content: z.string().min(1),
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { whatsappTemplates } = await import("../drizzle/schema");
      const [result] = await db.insert(whatsappTemplates).values(input);
      return { id: (result as any).insertId };
    }),

  // تحديث قالب
  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      content: z.string().optional(),
      tone: z.enum(["formal", "friendly", "direct"]).optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { whatsappTemplates } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const { id, ...data } = input;
      await db.update(whatsappTemplates).set({ ...data, updatedAt: new Date() }).where(eq(whatsappTemplates.id, id));
      return { success: true };
    }),

  // حذف قالب
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { whatsappTemplates } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, input.id));
      return { success: true };
    }),

  // توليد قالب بالذكاء الاصطناعي
  generateTemplate: protectedProcedure
    .input(z.object({
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
      businessType: z.string().optional(),
      serviceType: z.string().optional(),
      senderName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `أنت خبير تسويق رقمي سعودي. اكتب قالب رسالة واتساب احترافي لبيع خدمات التسويق الرقمي.

الأسلوب: ${input.tone === "formal" ? "رسمي محترم" : input.tone === "friendly" ? "ودي ومحفّز" : "مباشر وواضح"}
${input.businessType ? `نوع النشاط المستهدف: ${input.businessType}` : ""}
${input.serviceType ? `الخدمة المقدمة: ${input.serviceType}` : ""}

استخدم هذه المتغيرات في القالب:
- {{اسم_النشاط}} = اسم الشركة/النشاط
- {{نوع_النشاط}} = نوع العمل
- {{المدينة}} = المدينة
- {{اسمي}} = اسم المرسل
- {{شركتي}} = اسم شركة المرسل
- {{الثغرة}} = الثغرة التسويقية المكتشفة

القالب يجب أن:
- يكون بين 80-150 كلمة
- يبدأ بتحية مناسبة
- يذكر قيمة محددة أو فرصة
- ينتهي بدعوة للتواصل
- يكون باللغة العربية

أعطني القالب فقط بدون أي شرح.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي متخصص في كتابة رسائل مبيعات فعّالة." },
          { role: "user", content: prompt },
        ],
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل توليد القالب" });
      return { content: typeof content === "string" ? content : JSON.stringify(content) };
    }),

  // تطبيق قالب على عميل (استبدال المتغيرات)
  applyTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      leadId: z.number(),
      senderName: z.string().optional(),
      senderCompany: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { whatsappTemplates } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [template] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, input.templateId));
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "القالب غير موجود" });
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      let message = template.content
        .replace(/\{\{اسم_النشاط\}\}/g, lead.companyName)
        .replace(/\{\{نوع_النشاط\}\}/g, lead.businessType)
        .replace(/\{\{المدينة\}\}/g, lead.city)
        .replace(/\{\{اسمي\}\}/g, input.senderName || "")
        .replace(/\{\{شركتي\}\}/g, input.senderCompany || "")
        .replace(/\{\{الثغرة\}\}/g, lead.biggestMarketingGap || "");
      // زيادة عداد الاستخدام
      await db.update(whatsappTemplates).set({ usageCount: template.usageCount + 1 }).where(eq(whatsappTemplates.id, input.templateId));
      const phone = (lead.verifiedPhone || "").replace(/[^0-9]/g, "");
      return { message, phone, waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` };
    }),

  // تطبيق قالب على قائمة عملاء (مجمع)
  bulkApplyTemplate: protectedProcedure
    .input(z.object({
      templateId: z.number(),
      leadIds: z.array(z.number()),
      senderName: z.string().optional(),
      senderCompany: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { whatsappTemplates } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [template] = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, input.templateId));
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const results: Array<{ leadId: number; companyName: string; phone: string; message: string; waUrl: string }> = [];
      for (const leadId of input.leadIds) {
        const lead = await getLeadById(leadId);
        if (!lead || !lead.verifiedPhone) continue;
        const message = template.content
          .replace(/\{\{اسم_النشاط\}\}/g, lead.companyName)
          .replace(/\{\{نوع_النشاط\}\}/g, lead.businessType)
          .replace(/\{\{المدينة\}\}/g, lead.city)
          .replace(/\{\{اسمي\}\}/g, input.senderName || "")
          .replace(/\{\{شركتي\}\}/g, input.senderCompany || "")
          .replace(/\{\{الثغرة\}\}/g, lead.biggestMarketingGap || "");
        const phone = lead.verifiedPhone.replace(/[^0-9]/g, "");
        results.push({ leadId, companyName: lead.companyName, phone, message, waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}` });
      }
      await db.update(whatsappTemplates).set({ usageCount: template.usageCount + results.length }).where(eq(whatsappTemplates.id, input.templateId));
      return { results };
    }),

  // فحص وجود واتساب لرقم هاتف
  check: protectedProcedure
    .input(z.object({ leadId: z.number(), phone: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // نحدّث حالة الواتساب في قاعدة البيانات
      // الفحص الفعلي يتم من المتصفح عبر wa.me - هنا نسجّل النتيجة
      const { leads } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(leads)
        .set({ whatsappCheckedAt: new Date() })
        .where(eq(leads.id, input.leadId));
      return { phone: input.phone, waUrl: `https://wa.me/${input.phone.replace(/[^0-9]/g, "")}` };
    }),

  // تحديث حالة واتساب بعد الفحص اليدوي
  updateStatus: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      hasWhatsapp: z.enum(["yes", "no", "unknown"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { leads } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(leads)
        .set({ hasWhatsapp: input.hasWhatsapp, whatsappCheckedAt: new Date() })
        .where(eq(leads.id, input.leadId));
      return { success: true };
    }),

  // توليد رسالة واتساب مخصصة بالذكاء الاصطناعي
  generateMessage: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      companyName: z.string(),
      businessType: z.string(),
      city: z.string(),
      biggestGap: z.string().optional(),
      salesAngle: z.string().optional(),
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
    }))
    .mutation(async ({ input }) => {
      const prompt = `أنت خبير تسويق رقمي سعودي. اكتب رسالة واتساب احترافية وقصيرة (لا تتجاوز 150 كلمة) لصاحب النشاط التالي:

اسم النشاط: ${input.companyName}
نوع النشاط: ${input.businessType}
المدينة: ${input.city}
${input.biggestGap ? `أبرز ثغرة تسويقية: ${input.biggestGap}` : ""}
${input.salesAngle ? `زاوية البيع المقترحة: ${input.salesAngle}` : ""}

الأسلوب المطلوب: ${input.tone === "formal" ? "رسمي محترم" : input.tone === "friendly" ? "ودي ومحفّز" : "مباشر وواضح"}

الرسالة يجب أن:
- تبدأ بالسلام والتعريف بنفسك كمزود خدمات تسويق رقمي
- تذكر ثغرة محددة أو فرصة تحسين
- تنتهي بدعوة واضحة للتواصل
- تكون باللغة العربية الفصحى السهلة

أعطني الرسالة فقط بدون أي مقدمات أو شرح.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي متخصص في السوق السعودي." },
          { role: "user", content: prompt },
        ],
      });
      const message = response.choices[0]?.message?.content;
      if (!message) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل توليد الرسالة" });
      return { message: typeof message === "string" ? message : JSON.stringify(message) };
    }),

  // تسجيل رسالة مُرسلة
  logMessage: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      phone: z.string(),
      message: z.string(),
      messageType: z.enum(["individual", "bulk"]).default("individual"),
      bulkJobId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { leads } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.insert(whatsappMessages).values({
        leadId: input.leadId,
        phone: input.phone,
        message: input.message,
        messageType: input.messageType,
        bulkJobId: input.bulkJobId,
        status: "sent",
      });
      await db.update(leads)
        .set({ lastWhatsappSentAt: new Date() })
        .where(eq(leads.id, input.leadId));
      return { success: true };
    }),

  // جلب سجل الرسائل لعميل معين
  getMessages: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { eq, desc } = await import("drizzle-orm");
      return db.select().from(whatsappMessages)
        .where(eq(whatsappMessages.leadId, input.leadId))
        .orderBy(desc(whatsappMessages.sentAt))
        .limit(20);
    }),

  // إرسال مجمع: توليد رسائل لقائمة عملاء
  bulkGenerate: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()),
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
      customTemplate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const results: Array<{ leadId: number; companyName: string; phone: string; message: string; waUrl: string }> = [];
      for (const leadId of input.leadIds) {
        const lead = await getLeadById(leadId);
        if (!lead || !lead.verifiedPhone) continue;
        let message = input.customTemplate || "";
        if (!message) {
          const prompt = `اكتب رسالة واتساب قصيرة (80-100 كلمة) لـ ${lead.companyName} (${lead.businessType}) في ${lead.city}. ${lead.biggestMarketingGap ? `الثغرة: ${lead.biggestMarketingGap}` : ""}. الأسلوب: ${input.tone === "formal" ? "رسمي" : input.tone === "friendly" ? "ودي" : "مباشر"}. أعطني الرسالة فقط.`;
          const resp = await invokeLLM({
            messages: [{ role: "user", content: prompt }],
          });
          const content = resp.choices[0]?.message?.content;
          message = typeof content === "string" ? content : "";
        } else {
          message = message
            .replace("{{اسم_النشاط}}", lead.companyName)
            .replace("{{نوع_النشاط}}", lead.businessType)
            .replace("{{المدينة}}", lead.city);
        }
        const phone = lead.verifiedPhone.replace(/[^0-9]/g, "");
        results.push({
          leadId,
          companyName: lead.companyName,
          phone,
          message,
          waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        });
        // تأخير بشري بين الطلبات
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
      }
      return { results, bulkJobId: nanoid(10) };
    }),
});

// ===== WHATSAPP AUTOMATION ROUTER =====
const whatsappAutomationRouter = router({
  // جلب حالة الجلسة
  status: protectedProcedure.query(async () => {
    const { getSessionStatus } = await import("./whatsappAutomation");
    return getSessionStatus();
  }),

  // بدء جلسة واتساب (يفتح المتصفح ويعرض QR)
  startSession: protectedProcedure.mutation(async () => {
    const { startWhatsAppSession } = await import("./whatsappAutomation");
    return startWhatsAppSession();
  }),

  // قطع الاتصال
  disconnect: protectedProcedure.mutation(async () => {
    const { disconnectWhatsApp } = await import("./whatsappAutomation");
    await disconnectWhatsApp();
    return { success: true };
  }),

  // إرسال رسالة لرقم واحد
  sendOne: protectedProcedure
    .input(z.object({
      phone: z.string(),
      message: z.string(),
      leadId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { sendWhatsAppMessage } = await import("./whatsappAutomation");
      const result = await sendWhatsAppMessage(input.phone, input.message);
      // تسجيل في قاعدة البيانات إذا نجح
      if (result.success && input.leadId) {
        const db = await getDb();
        if (db) {
          const { whatsappMessages } = await import("../drizzle/schema");
          await db.insert(whatsappMessages).values({
            leadId: input.leadId,
            phone: input.phone,
            message: input.message,
            messageType: "individual",
            status: "sent",
          });
        }
      }
      return result;
    }),

  // إرسال مجمع تلقائي
  sendBulk: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        phone: z.string(),
        message: z.string(),
        leadId: z.number(),
        companyName: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { sendBulkMessages } = await import("./whatsappAutomation");
      const results = await sendBulkMessages(input.messages);
      // تسجيل النتائج في قاعدة البيانات
      const db = await getDb();
      if (db) {
        const { whatsappMessages } = await import("../drizzle/schema");
        const bulkJobId = nanoid(10);
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const m = input.messages[i];
          await db.insert(whatsappMessages).values({
            leadId: m.leadId,
            phone: m.phone,
            message: m.message,
            messageType: "bulk",
            bulkJobId,
            status: r.success ? "sent" : "failed",
          });
        }
      }
      return { results };
    }),
});

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
      const token = process.env.INSTAGRAM_ACCESS_TOKEN;
      const appId = process.env.INSTAGRAM_APP_ID;

      if (!token || !appId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "يجب إضافة INSTAGRAM_ACCESS_TOKEN و INSTAGRAM_APP_ID في إعدادات المشروع",
        });
      }

      // تنظيف الهاشتاق
      const hashtag = input.hashtag.replace(/^#/, "").trim();

      // إنشاء سجل البحث
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
  export: exportRouter,
   search: searchRouter,
  searchJobs: searchJobsRouter,
  aiSearch: aiSearchRouter,
  whatsapp: whatsappRouter,
  wauto: whatsappAutomationRouter,
  instagram: instagramRouter,
});
export type AppRouter = typeof appRouter;
