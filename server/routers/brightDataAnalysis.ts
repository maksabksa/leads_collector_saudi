/**
 * Bright Data Analysis Router
 * تحليل حقيقي للمواقع والمنصات الاجتماعية باستخدام Bright Data
 * يجلب البيانات الحقيقية أولاً ثم يمررها للـ LLM
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  scrapeWebsite,
  scrapeInstagram,
  scrapeLinkedIn,
  scrapeTwitter,
  scrapeTikTok,
  scrapeAllPlatforms,
  formatScrapedDataForLLM,
  type TwitterScrapedData,
} from "../lib/brightDataScraper";
import {
  gatherWebsiteIntelligence,
  buildWebsiteIntelligenceContext,
} from "../lib/websiteIntelligence";
import {
  fetchInstagramViaDatasetAPI,
  formatInstagramDataForLLM,
  type InstagramDatasetProfile,
} from "../lib/brightDataInstagram";
import {
  analyzeLinkedInCompany,
  buildLinkedInSearchUrl,
  type LinkedInCompanyData,
} from "../lib/brightDataLinkedIn";
import {
  getLeadById,
  updateLead,
  createWebsiteAnalysis,
  createSocialAnalysis,
  getWebsiteAnalysisByLeadId,
  getSocialAnalysesByLeadId,
  getDb,
} from "../db";
import { leads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ===== تحليل الموقع الإلكتروني بـ Bright Data =====
const analyzeWebsiteWithBrightData = protectedProcedure
  .input(z.object({
    leadId: z.number(),
    url: z.string().url(),
    companyName: z.string(),
    businessType: z.string(),
  }))
  .mutation(async ({ input }) => {
    await updateLead(input.leadId, { analysisStatus: "analyzing" });

    try {
      // الخطوة 1: جلب بيانات الموقع الشاملة (PageSpeed + SEO + Bright Data)
      let realWebsiteContext = "";
      let scrapedPhones: string[] = [];
      let scrapedFlags = {
        hasWhatsapp: false,
        hasBooking: false,
        hasEcommerce: false,
        hasSSL: false,
      };
      let pagespeedScores = {
        performance: null as number | null,
        mobile: null as number | null,
        seo: null as number | null,
        accessibility: null as number | null,
        bestPractices: null as number | null,
        lcp: null as number | null,
        cls: null as number | null,
        fcp: null as number | null,
        ttfb: null as number | null,
      };

      try {
        // جلب كل البيانات بالتوازي: PageSpeed + SEO Intelligence
        const intelligence = await gatherWebsiteIntelligence(input.url);
        realWebsiteContext = buildWebsiteIntelligenceContext(intelligence);

        // استخراج البيانات للحفظ في قاعدة البيانات
        if (intelligence.seo.fetchedSuccessfully) {
          scrapedPhones = intelligence.seo.phones;
          scrapedFlags = {
            hasWhatsapp: intelligence.seo.hasWhatsapp,
            hasBooking: intelligence.seo.hasBooking,
            hasEcommerce: intelligence.seo.hasEcommerce,
            hasSSL: intelligence.seo.hasSSL,
          };
          // حفظ الرقم المكتشف تلقائياً
          if (intelligence.seo.phones.length > 0) {
            const lead = await getLeadById(input.leadId);
            if (lead && !lead.verifiedPhone) {
              await updateLead(input.leadId, { verifiedPhone: intelligence.seo.phones[0] });
            }
          }
        }

        if (intelligence.pagespeed.fetchedSuccessfully) {
          pagespeedScores = {
            performance: intelligence.pagespeed.performanceScore,
            mobile: intelligence.pagespeed.mobilePerformanceScore,
            seo: intelligence.pagespeed.seoScore,
            accessibility: intelligence.pagespeed.accessibilityScore,
            bestPractices: intelligence.pagespeed.bestPracticesScore,
            lcp: intelligence.pagespeed.lcp,
            cls: intelligence.pagespeed.cls,
            fcp: intelligence.pagespeed.fcp,
            ttfb: intelligence.pagespeed.ttfb,
          };
        }
      } catch (scrapeErr) {
        console.warn("[BD analyzeWebsite] Intelligence gathering failed, using AI estimation:", scrapeErr);
      }

      // الخطوة 2: تحليل بـ LLM مع البيانات الحقيقية
      const hasRealPagespeed = pagespeedScores.performance !== null;
      const prompt = `أنت خبير تحليل تسويق رقمي متخصص في السوق السعودي.
قم بتحليل الموقع الإلكتروني التالي لنشاط تجاري سعودي:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الموقع: ${input.url}
${realWebsiteContext}

تعليمات خاصة بالدرجات:
${hasRealPagespeed ? `- درجة سرعة الموقع (Desktop) من Google PageSpeed: ${pagespeedScores.performance}/100 → حولها إلى مقياس 1-10
- درجة سرعة الجوال: ${pagespeedScores.mobile}/100 → حولها إلى مقياس 1-10
- درجة SEO من PageSpeed: ${pagespeedScores.seo}/100 → حولها إلى مقياس 1-10
- درجة إمكانية الوصول: ${pagespeedScores.accessibility}/100
- درجة أفضل الممارسات: ${pagespeedScores.bestPractices}/100
- LCP (Largest Contentful Paint): ${pagespeedScores.lcp ? pagespeedScores.lcp.toFixed(1) + 'ث' : 'N/A'}
- CLS (Cumulative Layout Shift): ${pagespeedScores.cls ?? 'N/A'}
- FCP (First Contentful Paint): ${pagespeedScores.fcp ? pagespeedScores.fcp.toFixed(1) + 'ث' : 'N/A'}
- TTFB (Time to First Byte): ${pagespeedScores.ttfb ? pagespeedScores.ttfb.toFixed(0) + 'ملث' : 'N/A'}
استخدم هذه الأرقام الحقيقية لتحديد loadSpeedScore و mobileExperienceScore و seoScore.` : '- لا تتوفر بيانات PageSpeed حقيقية — قدّر الدرجات بناءً على محتوى الموقع.'}

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
  "technicalGaps": ["ثغرة تقنية حقيقية من المحتوى"],
  "contentGaps": ["ثغرة محتوى حقيقية من الموقع"],
  "overallScore": 6,
  "summary": "ملخص تحليلي واضح في سطرين بناءً على المحتوى الحقيقي",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "biggestMarketingGap": "وصف تفصيلي للثغرة التسويقية الأكبر في سطرين على الأقل",
  "revenueOpportunity": "كيف يمكن زيادة الإيراد فعلياً في سطرين على الأقل",
  "suggestedSalesEntryAngle": "زاوية الدخول البيعية المخصصة لهذا النشاط تحديداً"
}
${realWebsiteContext ? "ملاحظة: لديك بيانات حقيقية شاملة من الموقع — استخدمها لتقديم تحليل دقيق وعميق." : "ملاحظة: قيّم الموقع بناءً على المعرفة العامة بمواقع هذا النوع من الأنشطة في السعودية."}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل تسويق رقمي خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      // دمج البيانات الحقيقية مع تحليل AI
      analysis.hasOnlineBooking = analysis.hasOnlineBooking || scrapedFlags.hasBooking;
      analysis.hasPaymentOptions = analysis.hasPaymentOptions || scrapedFlags.hasEcommerce;

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

      return {
        success: true,
        analysisId,
        scrapedPhones,
        usedRealData: !!realWebsiteContext,
      };
    } catch (error) {
      await updateLead(input.leadId, { analysisStatus: "failed" });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل التحليل" });
    }
  });

// ===== تحليل إنستغرام بـ Bright Data =====
const analyzeInstagramWithBrightData = protectedProcedure
  .input(z.object({
    leadId: z.number(),
    profileUrl: z.string(),
    companyName: z.string(),
    businessType: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      // جلب البيانات الحقيقية
      let realData = "";
      let instagramStats = { followersCount: 0, postsCount: 0, isVerified: false };
      let datasetProfile: InstagramDatasetProfile | undefined;
      let dataSource = "none";

      // المحاولة الأولى: Dataset API (الأكثر موثوقية)
      try {
        console.log(`[BD Instagram] Trying Dataset API for ${input.profileUrl}`);
        const datasetResult = await fetchInstagramViaDatasetAPI(input.profileUrl);
        if (datasetResult.success && datasetResult.profile) {
          datasetProfile = datasetResult.profile;
          realData = formatInstagramDataForLLM(datasetProfile);
          instagramStats = {
            followersCount: datasetProfile.followers || 0,
            postsCount: datasetProfile.posts_count || 0,
            isVerified: datasetProfile.is_verified || false,
          };
          dataSource = "dataset_api";
          console.log(`[BD Instagram] Dataset API success: ${instagramStats.followersCount} followers`);
        } else {
          console.warn(`[BD Instagram] Dataset API failed: ${datasetResult.error}, trying scraper...`);
        }
      } catch (datasetErr) {
        console.warn(`[BD Instagram] Dataset API error: ${datasetErr}, trying scraper...`);
      }

      // المحاولة الثانية: Scraping Browser (fallback)
      if (!realData) {
        try {
          const scraped = await scrapeInstagram(input.profileUrl);
          if (scraped.loadedSuccessfully) {
            realData = `
=== بيانات إنستغرام الحقيقية (Bright Data Scraper) ===
الاسم الكامل: ${scraped.fullName}
البيو: ${scraped.bio}
المتابعون: ${scraped.followersCount.toLocaleString()}
يتابع: ${scraped.followingCount.toLocaleString()}
عدد المنشورات: ${scraped.postsCount}
موثّق: ${scraped.isVerified ? "نعم ✓" : "لا"}
=== نهاية البيانات الحقيقية ===`;

            instagramStats = {
              followersCount: scraped.followersCount,
              postsCount: scraped.postsCount,
              isVerified: scraped.isVerified,
            };
            dataSource = "scraper";
          }
        } catch (scrapeErr) {
          console.warn("[BD analyzeInstagram] Scrape also failed:", scrapeErr);
        }
      }

      const prompt = `أنت خبير تحليل سوشيال ميديا ومصمم جرافيك ومحلل نصوص تسويقية متخصص في السوق السعودي.
قم بتحليل حساب إنستغرام التالي تحليلاً عميقاً شاملاً:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}
${realData}

قدم تحليلاً بصيغة JSON فقط (بدون أي نص خارج JSON):
{
  "hasAccount": true,
  "followersCount": ${instagramStats.followersCount || 0},
  "postsCount": ${instagramStats.postsCount || 0},
  "isVerified": ${instagramStats.isVerified},
  "postingFrequencyScore": 6,
  "engagementScore": 5,
  "contentQualityScore": 6,
  "hasSeasonalContent": false,
  "hasPricingContent": false,
  "hasCallToAction": false,
  "contentStrategyScore": 5,
  "digitalPresenceScore": 6,
  "gaps": ["ثغرة حقيقية من البيانات"],
  "overallScore": 5.5,
  "summary": "ملخص تحليلي في سطرين بناءً على البيانات الحقيقية",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "designQuality": {
    "score": 6,
    "colorConsistency": "هل الألوان متناسقة ومعبّرة عن الهوية البصرية للنشاط؟ وصف تفصيلي",
    "visualIdentity": "هل يوجد هوية بصرية واضحة (لوجو، خطوط، ألوان ثابتة)؟ وصف تفصيلي",
    "imageQuality": "جودة الصور والتصاميم المستخدمة (احترافية، هاتف، مصمم، إلخ)",
    "brandingStrength": "قوة الهوية التجارية البصرية من 1-10",
    "weaknesses": ["نقطة ضعف تصميمية 1", "نقطة ضعف تصميمية 2"],
    "improvements": ["تحسين تصميمي مقترح 1", "تحسين تصميمي مقترح 2"]
  },
  "copyQuality": {
    "score": 6,
    "bioAnalysis": "تحليل البايو: هل يوضح ما يقدمه النشاط؟ هل يحتوي CTA؟ هل يذكر الموقع؟",
    "captionStyle": "أسلوب الكابشن: رسمي، عامي، ترويجي، تعليمي، إلخ",
    "ctaStrength": "قوة الـ CTA في المنشورات (ضعيف/متوسط/قوي) مع وصف",
    "languageClarity": "وضوح اللغة والرسائل التسويقية",
    "emotionalConnection": "هل النصوص تخلق ارتباطاً عاطفياً مع الجمهور؟",
    "weaknesses": ["ضعف نصي 1", "ضعف نصي 2"],
    "improvements": ["تحسين نصي مقترح 1", "تحسين نصي مقترح 2"]
  },
  "missedOpportunities": {
    "lostCustomerReasons": ["سبب خسارة عميل محتمل 1", "سبب خسارة عميل محتمل 2", "سبب خسارة عميل محتمل 3"],
    "conversionBarriers": ["عائق تحويل 1", "عائق تحويل 2"],
    "missingFeatures": ["ميزة مفقودة 1 (مثل: رابط في البايو، هايلايتس، Reels)", "ميزة مفقودة 2"],
    "audienceGaps": "شريحة جمهور لا يتم استهدافها حالياً مع وصف تفصيلي",
    "competitiveWeakness": "أين يتفوق المنافسون على هذا الحساب؟",
    "urgentFixes": ["إصلاح عاجل 1 (أكبر فرصة ضائعة)", "إصلاح عاجل 2"]
  }
}
${realData ? "ملاحظة: لديك بيانات حقيقية من الحساب — استخدمها لتقديم تحليل دقيق وعميق." : "ملاحظة: قيّم الحساب بناءً على المعرفة العامة بحسابات هذا النوع من الأنشطة في السعودية."}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل سوشيال ميديا خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      // تأكد من استخدام الأرقام الحقيقية
      if (instagramStats.followersCount > 0) {
        analysis.followersCount = instagramStats.followersCount;
      }

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: "instagram",
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

      // تحديث بيانات الـ lead ببيانات إنستغرام الحقيقية
      if (datasetProfile?.business_phone) {
        const lead = await getLeadById(input.leadId);
        if (lead && !lead.verifiedPhone) {
          await updateLead(input.leadId, { verifiedPhone: datasetProfile.business_phone });
        }
      }

      return {
        success: true,
        analysisId,
        usedRealData: !!realData,
        dataSource,
        followersCount: instagramStats.followersCount,
        postsCount: instagramStats.postsCount,
        isVerified: instagramStats.isVerified,
        businessEmail: datasetProfile?.business_email || null,
        businessPhone: datasetProfile?.business_phone || null,
        businessCategory: datasetProfile?.business_category || null,
        avgEngagement: datasetProfile?.avg_engagement || null,
        website: datasetProfile?.website || null,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل تحليل إنستغرام" });
    }
  });

// ===== تحليل لينكد إن بـ Bright Data =====
const analyzeLinkedInWithBrightData = protectedProcedure
  .input(z.object({
    leadId: z.number(),
    profileUrl: z.string(),
    companyName: z.string(),
    businessType: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      // ===== المحاولة الأولى: Bright Data LinkedIn Companies API =====
      let linkedinApiResult = await analyzeLinkedInCompany(
        input.profileUrl,
        input.companyName
      );

      // إذا فشل API، حاول بناء URL من اسم الشركة
      if (!linkedinApiResult.success && input.companyName) {
        const guessedUrl = buildLinkedInSearchUrl(input.companyName);
        console.log(`[BD analyzeLinkedIn] Trying guessed URL: ${guessedUrl}`);
        linkedinApiResult = await analyzeLinkedInCompany(guessedUrl, input.companyName);
      }

      const companyData = linkedinApiResult.companyData;
      const dataSource = linkedinApiResult.dataSource;

      // بناء context للـ LLM من البيانات الحقيقية
      let realData = "";
      if (linkedinApiResult.success && companyData) {
        realData = `
=== بيانات لينكد إن الحقيقية (Bright Data ${dataSource === "api" ? "Companies API" : "Scraper"}) ===
اسم الشركة: ${companyData.name || input.companyName}
الوصف: ${(companyData.about || companyData.description || "").slice(0, 500)}
الشعار: ${companyData.slogan || ""}
المتابعون: ${(companyData.followers || 0).toLocaleString()}
الموظفون على LinkedIn: ${companyData.employees_in_linkedin || companyData.employees || "غير محدد"}
حجم الشركة: ${companyData.company_size || "غير محدد"}
القطاع: ${companyData.industries?.join(", ") || "غير محدد"}
المقر الرئيسي: ${companyData.headquarters || ""}
تأسست: ${companyData.founded || ""}
نوع المنظمة: ${companyData.organization_type || ""}
التخصصات: ${companyData.specialties?.slice(0, 5).join(", ") || ""}
الموقع: ${companyData.website || ""}
=== نهاية البيانات الحقيقية ===`;
      }

      const linkedinStats = {
        followersCount: linkedinApiResult.followersCount,
        employeesCount: linkedinApiResult.employeesCount > 0
          ? linkedinApiResult.employeesCount.toLocaleString()
          : (companyData?.company_size || "غير محدد"),
        industry: linkedinApiResult.industry || companyData?.industries?.[0] || "غير محدد",
      };

      const prompt = `أنت خبير تحليل سوشيال ميديا B2B متخصص في السوق السعودي.
قم بتحليل حساب لينكد إن التالي:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}
${realData}

قدم تحليلاً بصيغة JSON فقط:
{
  "hasAccount": true,
  "followersCount": ${linkedinStats.followersCount || 0},
  "employeesCount": "${linkedinStats.employeesCount}",
  "industry": "${linkedinStats.industry}",
  "postingFrequencyScore": 5,
  "engagementScore": 4,
  "contentQualityScore": 5,
  "hasSeasonalContent": false,
  "hasPricingContent": false,
  "hasCallToAction": false,
  "contentStrategyScore": 4,
  "digitalPresenceScore": 5,
  "gaps": ["ثغرة حقيقية من البيانات"],
  "overallScore": 5,
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

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: "linkedin" as any,
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

      return {
        success: true,
        analysisId,
        usedRealData: !!realData,
        dataSource,
        followersCount: linkedinStats.followersCount,
        employeesCount: linkedinStats.employeesCount,
        industry: linkedinStats.industry,
        headquarters: linkedinApiResult.headquarters,
        founded: linkedinApiResult.founded,
        companySize: linkedinApiResult.companySize,
        specialties: linkedinApiResult.specialties,
        about: linkedinApiResult.about,
        companyName: companyData?.name || input.companyName,
        organizationType: companyData?.organization_type,
        logo: companyData?.logo,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل تحليل لينكد إن" });
    }
  });

// ===== تحليل تويتر/X بـ Bright Data =====
const analyzeTwitterWithBrightData = protectedProcedure
  .input(z.object({
    leadId: z.number(),
    profileUrl: z.string(),
    companyName: z.string(),
    businessType: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      let realData = "";
      let twitterStats: { followersCount: number; isVerified: boolean; tweetsCount?: number; following?: number; displayName?: string; bio?: string } = { followersCount: 0, isVerified: false };

      // أولاً: نحاول Bright Data API الرسمي (أكثر موثوقية)
      try {
        const { fetchTwitterData } = await import("./realSocialData");
        const apiData = await fetchTwitterData(input.profileUrl);
        if (apiData && apiData.followers > 0) {
          realData = `
=== بيانات تويتر/X الحقيقية (Bright Data API) ===
الاسم: ${apiData.displayName}
البيو: ${apiData.description}
المتابعون: ${apiData.followers.toLocaleString()}
يتابع: ${apiData.following.toLocaleString()}
عدد التغريدات: ${apiData.tweetsCount.toLocaleString()}
موثّق: ${apiData.isBlueVerified ? "نعم ✓ (Blue)" : apiData.verified ? "نعم ✓" : "لا"}
الموقع: ${apiData.location || "غير محدد"}
=== نهاية البيانات الحقيقية ===`;

          twitterStats = {
            followersCount: apiData.followers,
            isVerified: apiData.isBlueVerified || apiData.verified,
            tweetsCount: apiData.tweetsCount,
            following: apiData.following,
            displayName: apiData.displayName,
            bio: apiData.description,
          };
          console.log(`[BD analyzeTwitter] API success: ${apiData.followers} followers`);
        }
      } catch (apiErr) {
        console.warn("[BD analyzeTwitter] API failed, trying scraper:", apiErr);
      }

      // ثانياً: fallback إلى scraping إذا فشل API
      if (!realData) {
        try {
          const scraped = await scrapeTwitter(input.profileUrl);
          if (scraped.loadedSuccessfully && scraped.followersCount > 0) {
            realData = `
=== بيانات تويتر/X الحقيقية (Bright Data Scraper) ===
الاسم: ${scraped.displayName}
البيو: ${scraped.bio}
المتابعون: ${scraped.followersCount.toLocaleString()}
يتابع: ${scraped.followingCount.toLocaleString()}
موثّق: ${scraped.isVerified ? "نعم ✓" : "لا"}
=== نهاية البيانات الحقيقية ===`;

            twitterStats = {
              followersCount: scraped.followersCount,
              isVerified: scraped.isVerified,
            };
          }
        } catch (scrapeErr) {
          console.warn("[BD analyzeTwitter] Scrape also failed:", scrapeErr);
        }
      }

      const prompt = `أنت خبير تحليل سوشيال ميديا ومحلل هوية بصرية متخصص في السوق السعودي.
قم بتحليل حساب تويتر/X التالي تحليلاً عميقاً شاملاً:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}
${realData}

قدم تحليلاً بصيغة JSON فقط (بدون أي نص خارج JSON):
{
  "hasAccount": true,
  "followersCount": ${twitterStats.followersCount || 0},
  "isVerified": ${twitterStats.isVerified},
  "postingFrequencyScore": 5,
  "engagementScore": 4,
  "contentQualityScore": 5,
  "hasSeasonalContent": false,
  "hasPricingContent": false,
  "hasCallToAction": false,
  "contentStrategyScore": 4,
  "digitalPresenceScore": 5,
  "gaps": ["ثغرة حقيقية من البيانات"],
  "overallScore": 5,
  "summary": "ملخص تحليلي في سطرين",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "designQuality": {
    "score": 5,
    "colorConsistency": "هل الصورة الشخصية وصورة الغلاف تعكسان هوية بصرية متناسقة؟",
    "visualIdentity": "هل يوجد لوجو وهوية بصرية واضحة في الحساب؟",
    "imageQuality": "جودة الصور والوسائط المرفقة بالتغريدات",
    "brandingStrength": "قوة الهوية التجارية البصرية من 1-10",
    "weaknesses": ["نقطة ضعف تصميمية 1"],
    "improvements": ["تحسين تصميمي مقترح 1"]
  },
  "copyQuality": {
    "score": 5,
    "bioAnalysis": "تحليل البايو ووضوح رسالة الحساب",
    "captionStyle": "أسلوب التغريدات: رسمي، عامي، ترويجي، إلخ",
    "ctaStrength": "قوة الـ CTA في التغريدات",
    "languageClarity": "وضوح اللغة والرسائل التسويقية",
    "emotionalConnection": "هل النصوص تخلق ارتباطاً عاطفياً؟",
    "weaknesses": ["ضعف نصي 1"],
    "improvements": ["تحسين نصي مقترح 1"]
  },
  "missedOpportunities": {
    "lostCustomerReasons": ["سبب خسارة عميل محتمل 1", "سبب خسارة عميل محتمل 2"],
    "conversionBarriers": ["عائق تحويل 1"],
    "missingFeatures": ["ميزة مفقودة 1"],
    "audienceGaps": "شريحة جمهور لا يتم استهدافها حالياً",
    "competitiveWeakness": "أين يتفوق المنافسون؟",
    "urgentFixes": ["إصلاح عاجل 1"]
  }
}
${realData ? "ملاحظة: لديك بيانات حقيقية — استخدمها لتقديم تحليل دقيق وعميق." : "قيّم بناءً على المعرفة العامة بهذا النوع من الأنشطة في السعودية."}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل سوشيال ميديا خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: "twitter",
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

      return { success: true, analysisId, usedRealData: !!realData, followersCount: twitterStats.followersCount };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل تحليل تويتر" });
    }
  });

// ===== تحليل تيك توك بـ Bright Data =====
const analyzeTikTokWithBrightData = protectedProcedure
  .input(z.object({
    leadId: z.number(),
    profileUrl: z.string(),
    companyName: z.string(),
    businessType: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      let realData = "";
      let tiktokStats = { followersCount: 0, likesCount: 0, videosCount: 0, isVerified: false };

      try {
        const scraped = await scrapeTikTok(input.profileUrl);
        if (scraped.loadedSuccessfully) {
          realData = `
=== بيانات تيك توك الحقيقية (Bright Data) ===
الاسم: ${scraped.displayName}
البيو: ${scraped.bio}
المتابعون: ${scraped.followersCount.toLocaleString()}
الإعجابات الكلية: ${scraped.likesCount.toLocaleString()}
عدد الفيديوهات: ${scraped.videosCount}
موثّق: ${scraped.isVerified ? "نعم ✓" : "لا"}
=== نهاية البيانات الحقيقية ===`;

          tiktokStats = {
            followersCount: scraped.followersCount,
            likesCount: scraped.likesCount,
            videosCount: scraped.videosCount,
            isVerified: scraped.isVerified,
          };
        }
      } catch (scrapeErr) {
        console.warn("[BD analyzeTikTok] Scrape failed:", scrapeErr);
      }

      const prompt = `أنت خبير تحليل سوشيال ميديا ومحلل هوية بصرية متخصص في السوق السعودي.
قم بتحليل حساب تيك توك التالي تحليلاً عميقاً شاملاً:
- اسم النشاط: ${input.companyName}
- نوع النشاط: ${input.businessType}
- رابط الحساب: ${input.profileUrl}
${realData}

قدم تحليلاً بصيغة JSON فقط (بدون أي نص خارج JSON):
{
  "hasAccount": true,
  "followersCount": ${tiktokStats.followersCount || 0},
  "likesCount": ${tiktokStats.likesCount || 0},
  "videosCount": ${tiktokStats.videosCount || 0},
  "isVerified": ${tiktokStats.isVerified},
  "postingFrequencyScore": 5,
  "engagementScore": 6,
  "contentQualityScore": 5,
  "hasSeasonalContent": false,
  "hasPricingContent": false,
  "hasCallToAction": false,
  "contentStrategyScore": 5,
  "digitalPresenceScore": 6,
  "gaps": ["ثغرة حقيقية من البيانات"],
  "overallScore": 5.5,
  "summary": "ملخص تحليلي في سطرين بناءً على البيانات الحقيقية",
  "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
  "designQuality": {
    "score": 6,
    "colorConsistency": "هل الفيديوهات تتبع هوية بصرية متناسقة (ألوان، خطوط، أسلوب)؟",
    "visualIdentity": "هل يوجد لوجو وهوية بصرية واضحة في الفيديوهات؟",
    "imageQuality": "جودة الفيديوهات والمؤثرات البصرية",
    "brandingStrength": "قوة الهوية التجارية البصرية من 1-10",
    "weaknesses": ["نقطة ضعف تصميمية 1", "نقطة ضعف تصميمية 2"],
    "improvements": ["تحسين تصميمي مقترح 1", "تحسين تصميمي مقترح 2"]
  },
  "copyQuality": {
    "score": 5,
    "bioAnalysis": "تحليل البايو ووضوح رسالة الحساب",
    "captionStyle": "أسلوب نصوص الفيديوهات: رسمي، عامي، ترفيهي، تعليمي، إلخ",
    "ctaStrength": "قوة الـ CTA في الفيديوهات",
    "languageClarity": "وضوح اللغة والرسائل التسويقية",
    "emotionalConnection": "هل الفيديوهات تخلق ارتباطاً عاطفياً مع الجمهور؟",
    "weaknesses": ["ضعف نصي 1", "ضعف نصي 2"],
    "improvements": ["تحسين نصي مقترح 1"]
  },
  "missedOpportunities": {
    "lostCustomerReasons": ["سبب خسارة عميل محتمل 1", "سبب خسارة عميل محتمل 2"],
    "conversionBarriers": ["عائق تحويل 1"],
    "missingFeatures": ["ميزة مفقودة 1 (مثل: رابط في البايو، Duets، ستيتش)"],
    "audienceGaps": "شريحة جمهور لا يتم استهدافها حالياً",
    "competitiveWeakness": "أين يتفوق المنافسون على هذا الحساب؟",
    "urgentFixes": ["إصلاح عاجل 1 (أكبر فرصة ضائعة)"]
  }
}
${realData ? "ملاحظة: لديك بيانات حقيقية — استخدمها لتقديم تحليل دقيق وعميق." : "قيّم بناءً على المعرفة العامة بحسابات هذا النوع في السعودية."}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت محلل سوشيال ميديا خبير. أجب دائماً بـ JSON صحيح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let analysis: any = {};
      try { analysis = JSON.parse(content); } catch { analysis = {}; }

      const analysisId = await createSocialAnalysis({
        leadId: input.leadId,
        platform: "tiktok",
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

      return {
        success: true,
        analysisId,
        usedRealData: !!realData,
        followersCount: tiktokStats.followersCount,
        likesCount: tiktokStats.likesCount,
      };
    } catch (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل تحليل تيك توك" });
    }
  });

// ===== تحليل شامل لجميع المنصات دفعة واحدة =====
const analyzeAllPlatforms = protectedProcedure
  .input(z.object({ leadId: z.number() }))
  .mutation(async ({ input }) => {
    const lead = await getLeadById(input.leadId);
    if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

    await updateLead(input.leadId, { analysisStatus: "analyzing" });

    try {
      // جلب جميع المنصات بالتوازي
      const allData = await scrapeAllPlatforms({
        websiteUrl: lead.website,
        instagramUrl: lead.instagramUrl,
        linkedinUrl: (lead as any).linkedinUrl ?? null,
        twitterUrl: lead.twitterUrl,
        tiktokUrl: lead.tiktokUrl,
      });

      const realDataSummary = formatScrapedDataForLLM(allData);

      // تحليل شامل بـ LLM
      const prompt = `أنت خبير تسويق رقمي واستراتيجي مبيعات في السوق السعودي.
بناءً على البيانات الحقيقية التالية المجلوبة بـ Bright Data، أنشئ تقريراً تسويقياً شاملاً:

النشاط: ${lead.companyName}
النوع: ${lead.businessType}
المدينة: ${lead.city}

${realDataSummary}

أنشئ تقريراً بصيغة JSON:
{
  "executiveSummary": "ملخص تنفيذي شامل في 3 جمل بناءً على البيانات الحقيقية",
  "digitalPresenceScore": 6,
  "keyStrengths": ["نقطة قوة حقيقية 1", "نقطة قوة حقيقية 2"],
  "criticalGaps": ["ثغرة حرجة حقيقية 1", "ثغرة حرجة حقيقية 2", "ثغرة حرجة حقيقية 3"],
  "immediateOpportunities": ["فرصة فورية 1", "فرصة فورية 2"],
  "seasonalOpportunity": "تقييم فرصة الموسم",
  "recommendedActions": ["إجراء 1", "إجراء 2", "إجراء 3", "إجراء 4"],
  "salesScript": "نص مقترح لأول تواصل مع العميل بناءً على البيانات الحقيقية",
  "priorityLevel": "high",
  "platformsSummary": {
    "website": "ملخص الموقع",
    "instagram": "ملخص إنستغرام",
    "twitter": "ملخص تويتر",
    "tiktok": "ملخص تيك توك",
    "linkedin": "ملخص لينكد إن"
  }
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت خبير تسويق رقمي. أجب بـ JSON فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let report: any = {};
      try { report = JSON.parse(content); } catch { report = {}; }

      // تحديث بيانات الـ lead
      await updateLead(input.leadId, {
        analysisStatus: "completed",
        leadPriorityScore: report.digitalPresenceScore,
        biggestMarketingGap: report.criticalGaps?.[0] ?? null,
        revenueOpportunity: report.immediateOpportunities?.[0] ?? null,
        suggestedSalesEntryAngle: report.salesScript ?? null,
      });

      // حفظ أرقام الهاتف المكتشفة
      if (allData.website?.phones?.length && !lead.verifiedPhone) {
        await updateLead(input.leadId, { verifiedPhone: allData.website.phones[0] });
      }

      // حفظ تحليل الموقع في جدول websiteAnalyses إذا كان هناك موقع
      if (lead.website || allData.website) {
        try {
          await createWebsiteAnalysis({
            leadId: input.leadId,
            url: lead.website || "unknown",
            hasWebsite: !!(lead.website),
            overallScore: report.digitalPresenceScore ?? null,
            summary: report.executiveSummary ?? null,
            recommendations: report.recommendedActions ?? [],
            technicalGaps: report.criticalGaps ?? [],
            contentGaps: [],
            rawAnalysis: JSON.stringify(report),
          });
        } catch (e) { /* تجاهل خطأ الحفظ */ }
      }

      // حفظ تحليل السوشيال ميديا في جدول socialAnalyses
      const socialPlatforms: Array<{ key: "instagram" | "twitter" | "tiktok"; url: string | null | undefined; data: any }> = [
        { key: "instagram", url: lead.instagramUrl, data: allData.instagram },
        { key: "twitter", url: lead.twitterUrl, data: allData.twitter },
        { key: "tiktok", url: lead.tiktokUrl, data: allData.tiktok },
      ];
      for (const sp of socialPlatforms) {
        if (sp.url || sp.data) {
          try {
            await createSocialAnalysis({
              leadId: input.leadId,
              platform: sp.key,
              profileUrl: sp.url ?? undefined,
              hasAccount: !!(sp.url),
              followersCount: sp.data?.followersCount ?? null,
              summary: report.platformsSummary?.[sp.key] ?? null,
              recommendations: report.recommendedActions ?? [],
              gaps: report.criticalGaps ?? [],
              rawAnalysis: JSON.stringify(sp.data ?? {}),
              dataSource: "bright_data",
            });
          } catch (e) { /* تجاهل خطأ الحفظ */ }
        }
      }

      return {
        success: true,
        report,
        scrapedData: {
          websiteLoaded: allData.website?.loadedSuccessfully ?? false,
          instagramLoaded: allData.instagram?.loadedSuccessfully ?? false,
          linkedinLoaded: allData.linkedin?.loadedSuccessfully ?? false,
          twitterLoaded: allData.twitter?.loadedSuccessfully ?? false,
          tiktokLoaded: allData.tiktok?.loadedSuccessfully ?? false,
          discoveredPhones: allData.website?.phones ?? [],
          instagramFollowers: allData.instagram?.followersCount ?? 0,
          twitterFollowers: allData.twitter?.followersCount ?? 0,
          tiktokFollowers: allData.tiktok?.followersCount ?? 0,
          linkedinFollowers: allData.linkedin?.followersCount ?? 0,
        },
      };
    } catch (error) {
      await updateLead(input.leadId, { analysisStatus: "failed" });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل التحليل الشامل" });
    }
  });

// ===== جلب بيانات منصة واحدة فقط (بدون تحليل) =====
const scrapeProfile = protectedProcedure
  .input(z.object({
    platform: z.enum(["website", "instagram", "linkedin", "twitter", "tiktok"]),
    url: z.string(),
  }))
  .mutation(async ({ input }) => {
    try {
      switch (input.platform) {
        case "website":
          return await scrapeWebsite(input.url);
        case "instagram":
          return await scrapeInstagram(input.url);
        case "linkedin":
          return await scrapeLinkedIn(input.url);
        case "twitter":
          return await scrapeTwitter(input.url);
        case "tiktok":
          return await scrapeTikTok(input.url);
        default:
          throw new TRPCError({ code: "BAD_REQUEST", message: "منصة غير مدعومة" });
      }
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل جلب البيانات" });
    }
  });

// ===== Export Router =====
export const brightDataAnalysisRouter = router({
  analyzeWebsite: analyzeWebsiteWithBrightData,
  analyzeInstagram: analyzeInstagramWithBrightData,
  analyzeLinkedIn: analyzeLinkedInWithBrightData,
  analyzeTwitter: analyzeTwitterWithBrightData,
  analyzeTikTok: analyzeTikTokWithBrightData,
  analyzeAllPlatforms,
  scrapeProfile,
});
