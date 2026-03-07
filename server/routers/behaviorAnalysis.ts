import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { getLeadById } from "../db";
import { fetchAllRealData, fetchTikTokData, fetchTwitterData, fetchBacklinkData } from "./realSocialData";

// ─── تحليل سلوك العميل عبر السوشيال ميديا ───────────────────────────────────
export const behaviorAnalysisRouter = router({

  // ─── تحليل شامل بالبيانات الحقيقية ──────────────────────────────────────────
  analyzeWithRealData: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      }

      // جلب البيانات الحقيقية من جميع المصادر بالتوازي
      const realData = await fetchAllRealData({
        tiktokUrl: lead.tiktokUrl,
        twitterUrl: lead.twitterUrl,
        website: lead.website,
      });

      // بناء سياق البيانات الحقيقية للـ AI
      const realDataContext = buildRealDataContext(realData, lead);

      // بناء سياق العميل الكامل
      const socialLinks = [
        lead.instagramUrl && `Instagram: ${lead.instagramUrl}`,
        lead.twitterUrl && `Twitter: ${lead.twitterUrl}`,
        lead.website && `Website: ${lead.website}`,
        lead.snapchatUrl && `Snapchat: ${lead.snapchatUrl}`,
        lead.tiktokUrl && `TikTok: ${lead.tiktokUrl}`,
        lead.facebookUrl && `Facebook: ${lead.facebookUrl}`,
        lead.googleMapsUrl && `Google Maps: ${lead.googleMapsUrl}`,
      ].filter(Boolean);

      const prompt = `أنت محلل استراتيجي متخصص في السوق السعودي. قم بتحليل السلوك الرقمي لهذا النشاط التجاري بناءً على **بيانات حقيقية** تم جلبها من APIs:

**بيانات النشاط:**
- الاسم: ${lead.companyName}
- النوع: ${lead.businessType || "غير محدد"}
- المدينة: ${lead.city || "غير محددة"}
- الهاتف: ${lead.verifiedPhone || "غير متوفر"}
- الموقع الإلكتروني: ${lead.website || "غير متوفر"}
- روابط التواصل: ${socialLinks.length > 0 ? socialLinks.join(", ") : "لا توجد روابط"}
- درجة الأولوية: ${lead.leadPriorityScore || "غير محددة"}
- الثغرة التسويقية: ${lead.biggestMarketingGap || "غير محددة"}
- فرصة الإيراد: ${lead.revenueOpportunity || "غير محددة"}
- زاوية الدخول: ${lead.suggestedSalesEntryAngle || "غير محددة"}

${realDataContext}

**المطلوب:** حلل السلوك الرقمي بناءً على البيانات الحقيقية أعلاه وأعطِ تقييماً شاملاً يشمل:
1. مستوى النشاط الرقمي الفعلي (بناءً على الأرقام الحقيقية)
2. المنصات الأقوى والأضعف بالأرقام
3. أوقات التفاعل المقترحة للسوق السعودي
4. أسلوب التواصل الأمثل بناءً على نوع المحتوى
5. احتمالية الاستجابة (بناءً على مستوى النشاط الحقيقي)
6. توصيات التواصل المخصصة
7. نقاط القوة الرقمية الفعلية
8. الفرص التسويقية المتاحة (بناءً على الثغرات الحقيقية)

أرجع JSON بالشكل التالي فقط:
{
  "activityLevel": "نشط جداً" | "نشط" | "متوسط" | "ضعيف",
  "activityScore": رقم من 1-10,
  "preferredPlatforms": ["اسم المنصة"],
  "bestContactTimes": ["الوقت المفضل"],
  "communicationStyle": "وصف أسلوب التواصل المثالي",
  "responselikelihood": "عالية" | "متوسطة" | "منخفضة",
  "digitalStrengths": ["نقطة قوة"],
  "marketingOpportunities": ["فرصة تسويقية"],
  "contactRecommendations": ["توصية تواصل"],
  "estimatedAudience": "تقدير حجم الجمهور",
  "engagementPattern": "نمط التفاعل",
  "urgencyLevel": "عاجل" | "متوسط" | "منخفض",
  "summary": "ملخص تحليلي شامل في جملتين بناءً على البيانات الحقيقية"
}`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "أنت محلل استراتيجي للسوق السعودي. تحلل السلوك الرقمي للأنشطة التجارية بناءً على بيانات حقيقية من APIs وتقدم توصيات عملية. أرجع JSON فقط بدون أي نص إضافي.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });

        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new Error("لم يتم الحصول على استجابة من الذكاء الاصطناعي");

        const parsed =
          typeof content === "string" ? JSON.parse(content) : content;

        return {
          success: true,
          leadId: input.leadId,
          companyName: lead.companyName,
          analysis: parsed,
          realData,
          analyzedAt: new Date().toISOString(),
          dataSource: realData.availableSources.length > 0
            ? `بيانات حقيقية: ${realData.availableSources.join(", ")}`
            : "AI Analysis (لا توجد بيانات حقيقية متاحة)",
          availablePlatforms: socialLinks,
        };
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `فشل تحليل السلوك: ${e.message}`,
        });
      }
    }),

  // ─── تحليل سلوك العميل (النسخة الأصلية - تعمل بالـ AI فقط) ─────────────────
  analyzeCustomer: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        forceRefresh: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      }

      const socialLinks = [
        lead.instagramUrl && `Instagram: ${lead.instagramUrl}`,
        lead.twitterUrl && `Twitter: ${lead.twitterUrl}`,
        lead.website && `Website: ${lead.website}`,
        lead.snapchatUrl && `Snapchat: ${lead.snapchatUrl}`,
        lead.tiktokUrl && `TikTok: ${lead.tiktokUrl}`,
        lead.facebookUrl && `Facebook: ${lead.facebookUrl}`,
        lead.googleMapsUrl && `Google Maps: ${lead.googleMapsUrl}`,
      ].filter(Boolean);

      const prompt = `أنت محلل استراتيجي متخصص في السوق السعودي. قم بتحليل السلوك الرقمي لهذا النشاط التجاري:

**بيانات النشاط:**
- الاسم: ${lead.companyName}
- النوع: ${lead.businessType || "غير محدد"}
- المدينة: ${lead.city || "غير محددة"}
- الهاتف: ${lead.verifiedPhone || "غير متوفر"}
- الموقع الإلكتروني: ${lead.website || "غير متوفر"}
- روابط التواصل: ${socialLinks.length > 0 ? socialLinks.join(", ") : "لا توجد روابط"}
- درجة الأولوية: ${lead.leadPriorityScore || "غير محددة"}
- الثغرة التسويقية: ${lead.biggestMarketingGap || "غير محددة"}
- فرصة الإيراد: ${lead.revenueOpportunity || "غير محددة"}
- زاوية الدخول: ${lead.suggestedSalesEntryAngle || "غير محددة"}
- ملاحظات: ${lead.notes || "لا توجد"}

**المطلوب:** حلل السلوك الرقمي وأعطِ تقييماً شاملاً يشمل:
1. مستوى النشاط الرقمي (نشط جداً / نشط / متوسط / ضعيف)
2. المنصات المفضلة للنشاط
3. أوقات التفاعل المقترحة (صباح / ظهر / مساء / ليل)
4. أسلوب التواصل الأمثل
5. احتمالية الاستجابة (عالية / متوسطة / منخفضة)
6. توصيات التواصل المخصصة للسوق السعودي
7. نقاط القوة الرقمية
8. الفرص التسويقية المتاحة

أرجع JSON بالشكل التالي فقط:
{
  "activityLevel": "نشط" | "متوسط" | "ضعيف" | "نشط جداً",
  "activityScore": رقم من 1-10,
  "preferredPlatforms": ["اسم المنصة"],
  "bestContactTimes": ["الوقت المفضل"],
  "communicationStyle": "وصف أسلوب التواصل المثالي",
  "responselikelihood": "عالية" | "متوسطة" | "منخفضة",
  "digitalStrengths": ["نقطة قوة"],
  "marketingOpportunities": ["فرصة تسويقية"],
  "contactRecommendations": ["توصية تواصل"],
  "estimatedAudience": "تقدير حجم الجمهور",
  "engagementPattern": "نمط التفاعل",
  "urgencyLevel": "عاجل" | "متوسط" | "منخفض",
  "summary": "ملخص تحليلي شامل في جملتين"
}`;

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "أنت محلل استراتيجي للسوق السعودي. تحلل السلوك الرقمي للأنشطة التجارية وتقدم توصيات عملية. أرجع JSON فقط بدون أي نص إضافي.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });

        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new Error("لم يتم الحصول على استجابة من الذكاء الاصطناعي");

        const parsed =
          typeof content === "string" ? JSON.parse(content) : content;

        return {
          success: true,
          leadId: input.leadId,
          companyName: lead.companyName,
          analysis: parsed,
          analyzedAt: new Date().toISOString(),
          dataSource: "AI Analysis",
          availablePlatforms: socialLinks,
        };
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `فشل تحليل السلوك: ${e.message}`,
        });
      }
    }),

  // ─── جلب بيانات TikTok الحقيقية فقط ─────────────────────────────────────────
  fetchTikTokProfile: protectedProcedure
    .input(z.object({
      tiktokUrl: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const data = await fetchTikTokData(input.tiktokUrl);
      if (!data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على بيانات TikTok. تأكد من صحة الرابط أو اسم المستخدم.",
        });
      }
      return data;
    }),

  // ─── جلب بيانات Twitter الحقيقية فقط ────────────────────────────────────────
  fetchTwitterProfile: protectedProcedure
    .input(z.object({
      twitterUrl: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const data = await fetchTwitterData(input.twitterUrl);
      if (!data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على بيانات Twitter. تأكد من صحة الرابط أو اسم المستخدم.",
        });
      }
      return data;
    }),

  // ─── جلب بيانات الباك لينك ───────────────────────────────────────────────────
  fetchBacklinks: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const data = await fetchBacklinkData(input.websiteUrl);
      if (!data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "لم يتم العثور على بيانات الباك لينك. تأكد من صحة رابط الموقع.",
        });
      }
      return data;
    }),

  // ─── جلب كل البيانات الحقيقية لعميل محدد ────────────────────────────────────
  fetchAllRealDataForLead: protectedProcedure
    .input(z.object({
      leadId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      }

      const realData = await fetchAllRealData({
        tiktokUrl: lead.tiktokUrl,
        twitterUrl: lead.twitterUrl,
        website: lead.website,
      });

      return {
        leadId: input.leadId,
        companyName: lead.companyName,
        ...realData,
      };
    }),

  // ─── تحليل منصة واحدة بعمق ───────────────────────────────────────────────────
  analyzePlatform: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        platform: z.enum(["instagram", "twitter", "tiktok", "snapchat", "linkedin", "website"]),
        profileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      }

      const platformUrls: Record<string, string | null | undefined> = {
        instagram: lead.instagramUrl,
        twitter: lead.twitterUrl,
        linkedin: null,
        website: lead.website,
        snapchat: lead.snapchatUrl,
        tiktok: lead.tiktokUrl,
      };

      const url = input.profileUrl || platformUrls[input.platform];
      if (!url) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `لا يوجد رابط ${input.platform} لهذا العميل`,
        });
      }

      const platformNames: Record<string, string> = {
        instagram: "إنستغرام",
        twitter: "تويتر/X",
        linkedin: "لينكدإن",
        website: "الموقع الإلكتروني",
        snapchat: "سناب شات",
        tiktok: "تيك توك",
      };

      // جلب بيانات حقيقية إذا كانت المنصة مدعومة
      let realDataContext = "";
      if (input.platform === "tiktok") {
        const tiktokData = await fetchTikTokData(url).catch(() => null);
        if (tiktokData) {
          realDataContext = `
**بيانات TikTok الحقيقية:**
- المتابعون: ${tiktokData.followers.toLocaleString("ar-SA")}
- الإعجابات الإجمالية: ${tiktokData.hearts.toLocaleString("ar-SA")}
- عدد الفيديوهات: ${tiktokData.videoCount}
- معدل التفاعل: ${tiktokData.avgEngagementRate}%
- موثق: ${tiktokData.verified ? "نعم ✓" : "لا"}
- الوصف: ${tiktokData.description}
${tiktokData.topVideos.length > 0 ? `- أشهر فيديو: ${tiktokData.topVideos[0].description} (${tiktokData.topVideos[0].playCount.toLocaleString("ar-SA")} مشاهدة)` : ""}`;
        }
      } else if (input.platform === "twitter") {
        const twitterData = await fetchTwitterData(url).catch(() => null);
        if (twitterData) {
          realDataContext = `
**بيانات Twitter الحقيقية:**
- المتابعون: ${twitterData.followers.toLocaleString("ar-SA")}
- يتابع: ${twitterData.following.toLocaleString("ar-SA")}
- عدد التغريدات: ${twitterData.tweetsCount.toLocaleString("ar-SA")}
- موثق: ${twitterData.verified || twitterData.isBlueVerified ? "نعم ✓" : "لا"}
- الموقع: ${twitterData.location || "غير محدد"}
- الوصف: ${twitterData.description}`;
        }
      }

      const prompt = `حلل حضور هذا النشاط التجاري على ${platformNames[input.platform]}:

النشاط: ${lead.companyName} (${lead.businessType || "غير محدد"}) - ${lead.city || ""}
الرابط: ${url}
${realDataContext || ""}

قدم تحليلاً مختصراً يشمل:
- مستوى النشاط على المنصة ${realDataContext ? "(بناءً على البيانات الحقيقية)" : ""}
- جودة المحتوى
- فرص التحسين
- توصية للتواصل عبر هذه المنصة

أرجع JSON:
{
  "platformActivity": "نشط" | "متوسط" | "ضعيف",
  "contentQuality": رقم من 1-10,
  "improvements": ["تحسين مقترح"],
  "contactTip": "نصيحة للتواصل عبر هذه المنصة",
  "estimatedFollowers": "عدد المتابعين الحقيقي أو التقدير",
  "lastActiveEstimate": "تقدير آخر نشاط"
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "محلل سوشيال ميديا للسوق السعودي. أرجع JSON فقط.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const content = response?.choices?.[0]?.message?.content;
      const parsed =
        typeof content === "string" ? JSON.parse(content || "{}") : content || {};

      return {
        platform: input.platform,
        url,
        analysis: parsed,
        hasRealData: realDataContext.length > 0,
      };
    }),

  // ─── مقارنة العميل بالمنافسين ─────────────────────────────────────────────────
  compareWithCompetitors: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        competitorNames: z.array(z.string()).max(3),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      }

      const prompt = `قارن بين هذا النشاط التجاري ومنافسيه في السوق السعودي:

**النشاط الرئيسي:**
- الاسم: ${lead.companyName}
- النوع: ${lead.businessType || "غير محدد"}
- المدينة: ${lead.city || "غير محددة"}
- درجة الأولوية: ${lead.leadPriorityScore || "غير محددة"}/10
- الثغرة: ${lead.biggestMarketingGap || "غير محددة"}

**المنافسون:** ${input.competitorNames.join(", ")}

قدم مقارنة استراتيجية وأرجع JSON:
{
  "competitivePosition": "متقدم" | "مساوٍ" | "متأخر",
  "mainAdvantages": ["ميزة تنافسية"],
  "mainWeaknesses": ["نقطة ضعف"],
  "differentiationOpportunities": ["فرصة تمييز"],
  "recommendedStrategy": "الاستراتيجية الموصى بها",
  "urgencyToAct": "عاجل" | "متوسط" | "منخفض"
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "محلل تنافسي للسوق السعودي. أرجع JSON فقط.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" } as any,
      });

      const content = response?.choices?.[0]?.message?.content;
      const parsed =
        typeof content === "string" ? JSON.parse(content || "{}") : content || {};

      return {
        leadId: input.leadId,
        companyName: lead.companyName,
        competitors: input.competitorNames,
        comparison: parsed,
      };
    }),
});

// ─── بناء سياق البيانات الحقيقية للـ AI ──────────────────────────────────────

function buildRealDataContext(realData: Awaited<ReturnType<typeof fetchAllRealData>>, lead: any): string {
  const sections: string[] = [];

  if (realData.tiktok) {
    const t = realData.tiktok;
    const engagementLevel = t.avgEngagementRate > 5 ? "ممتاز" : t.avgEngagementRate > 2 ? "جيد" : "منخفض";
    sections.push(`
**بيانات TikTok الحقيقية (${t.username}):**
- المتابعون: ${t.followers.toLocaleString("ar-SA")} متابع
- إجمالي الإعجابات: ${t.hearts.toLocaleString("ar-SA")}
- عدد الفيديوهات: ${t.videoCount}
- معدل التفاعل: ${t.avgEngagementRate}% (${engagementLevel})
- موثق: ${t.verified ? "نعم ✓" : "لا"}
- الوصف: ${t.description || "لا يوجد"}
${t.topVideos.length > 0 ? `- أشهر فيديو: ${t.topVideos[0].description} (${t.topVideos[0].playCount.toLocaleString("ar-SA")} مشاهدة، ${t.topVideos[0].likeCount.toLocaleString("ar-SA")} إعجاب)` : "- لا توجد فيديوهات بارزة"}`);
  } else if (lead.tiktokUrl) {
    sections.push(`**TikTok:** رابط موجود (${lead.tiktokUrl}) لكن لم يتم جلب البيانات`);
  }

  if (realData.twitter) {
    const t = realData.twitter;
    const ratio = t.following > 0 ? (t.followers / t.following).toFixed(1) : "∞";
    sections.push(`
**بيانات Twitter/X الحقيقية (@${t.username}):**
- المتابعون: ${t.followers.toLocaleString("ar-SA")} متابع
- يتابع: ${t.following.toLocaleString("ar-SA")}
- نسبة المتابعين/المتابَعين: ${ratio}
- عدد التغريدات: ${t.tweetsCount.toLocaleString("ar-SA")}
- موثق: ${t.verified || t.isBlueVerified ? "نعم ✓" : "لا"}
- الموقع: ${t.location || "غير محدد"}
- الوصف: ${t.description || "لا يوجد"}`);
  } else if (lead.twitterUrl) {
    sections.push(`**Twitter:** رابط موجود (${lead.twitterUrl}) لكن لم يتم جلب البيانات`);
  }

  if (realData.backlinks) {
    const b = realData.backlinks;
    const backlinkStrength = b.totalBacklinks > 20 ? "قوي" : b.totalBacklinks > 5 ? "متوسط" : "ضعيف";
    sections.push(`
**بيانات الباك لينك الحقيقية (${b.domain}):**
- عدد الروابط الخارجية المكتشفة: ${b.totalBacklinks} (${backlinkStrength})
- النطاقات المُحيلة: ${b.referringDomains.slice(0, 5).join(", ") || "لا توجد"}
- Google My Business: ${b.hasGoogleMyBusiness ? "موجود ✓" : "غير موجود"}
- روابط السوشيال ميديا: ${b.hasSocialLinks ? "موجودة ✓" : "غير موجودة"}`);
  } else if (lead.website) {
    sections.push(`**الموقع الإلكتروني:** ${lead.website} (لم يتم تحليل الباك لينك)`);
  }

  if (sections.length === 0) {
    return "**ملاحظة:** لا توجد بيانات حقيقية متاحة - التحليل سيكون تقديرياً بناءً على المعلومات الأساسية.";
  }

  return `\n**البيانات الحقيقية المجلوبة من APIs:**\n${sections.join("\n")}`;
}
