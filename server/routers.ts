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
  getTopGaps,
} from "./db";
import { invokeLLM } from "./_core/llm";

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
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createLead(input);
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
    }).optional())
    .mutation(async ({ input }) => {
      const allLeads = await getAllLeads(input ?? {});
      const headers = [
        "الاسم", "نوع النشاط", "المدينة", "الحي", "المنطقة",
        "الهاتف", "الموقع", "انستغرام", "تويتر", "سناب شات",
        "عدد التقييمات", "درجة الجودة", "درجة الأولوية",
        "أكبر ثغرة تسويقية", "فرصة الإيراد", "زاوية الدخول",
        "تاريخ الإضافة"
      ];
      const rows = allLeads.map(lead => [
        lead.companyName, lead.businessType, lead.city, lead.district || "",
        lead.zoneName || "", lead.verifiedPhone || "", lead.website || "",
        lead.instagramUrl || "", lead.twitterUrl || "", lead.snapchatUrl || "",
        lead.reviewCount || 0, lead.brandingQualityScore || "",
        lead.leadPriorityScore || "", lead.biggestMarketingGap || "",
        lead.revenueOpportunity || "", lead.suggestedSalesEntryAngle || "",
        new Date(lead.createdAt).toLocaleDateString("ar-SA"),
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      return { csv: "\uFEFF" + csvContent, count: allLeads.length };
    }),
});

// ===== MAIN ROUTER =====
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
});

export type AppRouter = typeof appRouter;
