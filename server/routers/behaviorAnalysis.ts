import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import { getLeadById } from "../db";

// ─── تحليل سلوك العميل عبر السوشيال ميديا ───────────────────────────────────
export const behaviorAnalysisRouter = router({
  // تحليل السلوك الرقمي للعميل
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

      // بناء سياق العميل من البيانات المتاحة
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

  // تحليل منصة واحدة بعمق
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

      const prompt = `حلل حضور هذا النشاط التجاري على ${platformNames[input.platform]}:

النشاط: ${lead.companyName} (${lead.businessType || "غير محدد"}) - ${lead.city || ""}
الرابط: ${url}

قدم تحليلاً مختصراً يشمل:
- مستوى النشاط على المنصة
- جودة المحتوى المتوقعة
- فرص التحسين
- توصية للتواصل عبر هذه المنصة

أرجع JSON:
{
  "platformActivity": "نشط" | "متوسط" | "ضعيف",
  "contentQuality": رقم من 1-10,
  "improvements": ["تحسين مقترح"],
  "contactTip": "نصيحة للتواصل عبر هذه المنصة",
  "estimatedFollowers": "تقدير عدد المتابعين",
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
      };
    }),

  // مقارنة العميل بالمنافسين في نفس المجال
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
