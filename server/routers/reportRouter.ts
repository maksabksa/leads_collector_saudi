/**
 * Router لتوليد وإرسال تقارير PDF للعملاء
 */
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  leads,
  websiteAnalyses,
  socialAnalyses,
  companySettings,
} from "../../drizzle/schema";
import { generateLeadReportPDF } from "../reportGenerator";
import { storagePut } from "../storage";
import { sendWhatsAppMessage } from "../whatsappAutomation";

async function buildReportData(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) throw new Error("العميل غير موجود");

  const [websiteAnalysis] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.leadId, leadId))
    .limit(1);

  const socialAnalysesList = await db
    .select()
    .from(socialAnalyses)
    .where(eq(socialAnalyses.leadId, leadId));

  const [companySetting] = await db.select().from(companySettings).limit(1);

  const branding = {
    companyName: companySetting?.companyName || "مكسب KSA",
    companyDescription: companySetting?.companyDescription,
    phone: companySetting?.phone,
    email: companySetting?.email,
    website: companySetting?.website,
    logoUrl: companySetting?.logoUrl,
    primaryColor: (companySetting as any)?.primaryColor || "#1a56db",
    secondaryColor: (companySetting as any)?.secondaryColor || "#0e9f6e",
    reportHeaderText: (companySetting as any)?.reportHeaderText,
    reportFooterText: (companySetting as any)?.reportFooterText,
    reportIntroText: (companySetting as any)?.reportIntroText,
    city: companySetting?.city,
  };

  const leadData = {
    companyName: lead.companyName || "عميل",
    businessType: lead.businessType,
    city: lead.city,
    district: lead.district,
    verifiedPhone: lead.verifiedPhone,
    website: lead.website,
    instagramUrl: lead.instagramUrl,
    twitterUrl: lead.twitterUrl,
    tiktokUrl: lead.tiktokUrl,
    snapchatUrl: lead.snapchatUrl,
    googleMapsUrl: lead.googleMapsUrl,
    leadPriorityScore: lead.leadPriorityScore,
    biggestMarketingGap: lead.biggestMarketingGap,
    suggestedSalesEntryAngle: lead.suggestedSalesEntryAngle,
  };

  // بناء تحليل الموقع
  const websiteAnalysisData = websiteAnalysis
    ? {
        score: websiteAnalysis.overallScore ?? undefined,
        summary: websiteAnalysis.summary ?? undefined,
        strengths: [],
        weaknesses: websiteAnalysis.contentGaps ?? [],
        recommendations: websiteAnalysis.recommendations ?? [],
        seoScore: websiteAnalysis.seoScore ?? undefined,
        speedScore: websiteAnalysis.loadSpeedScore ?? undefined,
        mobileScore: websiteAnalysis.mobileExperienceScore ?? undefined,
      }
    : null;

  // بناء تحليلات السوشيال
  const socialAnalysesData = socialAnalysesList.map((sa) => ({
    platform: sa.platform,
    score: sa.overallScore ?? undefined,
    summary: sa.summary ?? undefined,
    strengths: [],
    weaknesses: sa.gaps ?? [],
    recommendations: sa.recommendations ?? [],
  }));

  return { lead, branding, leadData, websiteAnalysisData, socialAnalysesData };
}

export const reportRouter = router({
  /**
   * توليد تقرير PDF للعميل وحفظه في S3
   */
  generatePDF: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const { lead, branding, leadData, websiteAnalysisData, socialAnalysesData } =
        await buildReportData(input.leadId);

      const pdfBuffer = await generateLeadReportPDF({
        branding,
        lead: leadData,
        analysis: null,
        socialAnalyses: socialAnalysesData,
        websiteAnalysis: websiteAnalysisData,
      });

      const timestamp = Date.now();
      const safeName = (lead.companyName || "lead")
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
        .slice(0, 30);
      const fileKey = `reports/${lead.id}_${safeName}_${timestamp}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      return { success: true, url, fileKey, leadName: lead.companyName };
    }),

  /**
   * توليد التقرير وإرساله عبر واتساب
   */
  generateAndSendViaWhatsApp: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        accountId: z.string(),
        customMessage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { lead, branding, leadData, websiteAnalysisData, socialAnalysesData } =
        await buildReportData(input.leadId);

      if (!lead.verifiedPhone) throw new Error("لا يوجد رقم هاتف للعميل");

      const pdfBuffer = await generateLeadReportPDF({
        branding,
        lead: leadData,
        analysis: null,
        socialAnalyses: socialAnalysesData,
        websiteAnalysis: websiteAnalysisData,
      });

      const timestamp = Date.now();
      const fileKey = `reports/${lead.id}_report_${timestamp}.pdf`;
      const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      const phone = lead.verifiedPhone.replace(/[^0-9]/g, "");
      const message =
        input.customMessage ||
        `السلام عليكم ورحمة الله وبركاته 🌟

أهلاً بك من فريق *${branding.companyName}*

نرسل لكم تقرير التحليل الرقمي الشامل لـ *${lead.companyName || "نشاطكم التجاري"}*

📊 *التقرير يتضمن:*
• تحليل منصات التواصل الاجتماعي
• تقييم الموقع الإلكتروني
• الفرص التسويقية المتاحة
• توصيات مخصصة لنشاطكم

📄 *رابط التقرير:*
${pdfUrl}

نتطلع للتواصل معكم 🤝
${branding.companyName}`;

      await sendWhatsAppMessage(input.accountId, phone, message);

      return {
        success: true,
        pdfUrl,
        message: "تم إرسال التقرير عبر واتساب بنجاح",
      };
    }),
});
