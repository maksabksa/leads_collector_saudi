/**
 * PDF Report Router - روتر توليد تقارير PDF
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateReportHTML, type PDFReportData } from "../lib/pdfReportEngine";
import { storagePut } from "../storage";

export const pdfReportRouter = router({
  // توليد تقرير HTML (للمعاينة)
  generatePreview: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      reportType: z.enum(["internal", "client_facing"]).default("internal"),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId));
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      const reportData: PDFReportData = {
        lead: {
          id: lead.id,
          companyName: lead.companyName,
          businessType: lead.businessType,
          city: lead.city,
          country: lead.country,
          verifiedPhone: lead.verifiedPhone,
          website: lead.website,
          instagramUrl: lead.instagramUrl,
          twitterUrl: lead.twitterUrl,
          snapchatUrl: lead.snapchatUrl,
          tiktokUrl: lead.tiktokUrl,
          facebookUrl: lead.facebookUrl,
          googleMapsUrl: lead.googleMapsUrl,
          reviewCount: lead.reviewCount,
          stage: lead.stage,
          priority: lead.priority,
          notes: lead.notes,
        },
        analysis: {
          sectorMain: lead.sectorMain,
          marketingGapSummary: lead.marketingGapSummary,
          competitivePosition: lead.competitivePosition,
          primaryOpportunity: lead.primaryOpportunity,
          secondaryOpportunity: lead.secondaryOpportunity,
          urgencyLevel: lead.urgencyLevel,
          recommendedServices: lead.recommendedServices,
          salesEntryAngle: lead.salesEntryAngle,
          iceBreaker: lead.iceBreaker,
          sectorInsights: lead.sectorInsights,
          benchmarkComparison: lead.benchmarkComparison,
          leadPriorityScore: lead.leadPriorityScore,
          aiConfidenceScore: lead.aiConfidenceScore,
          biggestMarketingGap: lead.biggestMarketingGap,
          revenueOpportunity: lead.revenueOpportunity,
          suggestedSalesEntryAngle: lead.suggestedSalesEntryAngle,
        },
        reportType: input.reportType,
        generatedAt: new Date(),
        generatedBy: ctx.user?.name || undefined,
      };

      const html = generateReportHTML(reportData);

      return { html, leadName: lead.companyName };
    }),

  // توليد وحفظ تقرير PDF في S3
  generateAndSave: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      reportType: z.enum(["internal", "client_facing"]).default("internal"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId));
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      // تحديث حالة التقرير
      await db.update(leads)
        .set({ pdfGenerationStatus: "generating" as const })
        .where(eq(leads.id, input.leadId));

      try {
        const reportData: PDFReportData = {
          lead: {
            id: lead.id,
            companyName: lead.companyName,
            businessType: lead.businessType,
            city: lead.city,
            country: lead.country,
            verifiedPhone: lead.verifiedPhone,
            website: lead.website,
            instagramUrl: lead.instagramUrl,
            twitterUrl: lead.twitterUrl,
            snapchatUrl: lead.snapchatUrl,
            tiktokUrl: lead.tiktokUrl,
            facebookUrl: lead.facebookUrl,
            googleMapsUrl: lead.googleMapsUrl,
            reviewCount: lead.reviewCount,
            stage: lead.stage,
            priority: lead.priority,
            notes: lead.notes,
          },
          analysis: {
            sectorMain: lead.sectorMain,
            marketingGapSummary: lead.marketingGapSummary,
            competitivePosition: lead.competitivePosition,
            primaryOpportunity: lead.primaryOpportunity,
            secondaryOpportunity: lead.secondaryOpportunity,
            urgencyLevel: lead.urgencyLevel,
            recommendedServices: lead.recommendedServices,
            salesEntryAngle: lead.salesEntryAngle,
            iceBreaker: lead.iceBreaker,
            sectorInsights: lead.sectorInsights,
            benchmarkComparison: lead.benchmarkComparison,
            leadPriorityScore: lead.leadPriorityScore,
            aiConfidenceScore: lead.aiConfidenceScore,
            biggestMarketingGap: lead.biggestMarketingGap,
            revenueOpportunity: lead.revenueOpportunity,
            suggestedSalesEntryAngle: lead.suggestedSalesEntryAngle,
          },
          reportType: input.reportType,
          generatedAt: new Date(),
          generatedBy: ctx.user?.name || undefined,
        };

        const html = generateReportHTML(reportData);

        // حفظ HTML في S3 (يمكن تحويله لـ PDF لاحقاً)
        const fileKey = `reports/lead-${lead.id}-${input.reportType}-${Date.now()}.html`;
        const { url } = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");

        // تحديث قاعدة البيانات
        await db.update(leads)
          .set({
            pdfGenerationStatus: "ready" as const,
            pdfFileUrl: url,
            pdfGeneratedAt: new Date(),
            reportStatus: "ready" as const,
            reportTemplateType: input.reportType,
          })
          .where(eq(leads.id, input.leadId));

        return {
          success: true,
          reportUrl: url,
          leadName: lead.companyName,
        };
      } catch (err) {
        await db.update(leads)
          .set({ pdfGenerationStatus: "failed" as const })
          .where(eq(leads.id, input.leadId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل توليد التقرير" });
      }
    }),

  // جلب رابط التقرير المحفوظ
  getReportUrl: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [lead] = await db.select({
        pdfFileUrl: leads.pdfFileUrl,
        pdfGenerationStatus: leads.pdfGenerationStatus,
        pdfGeneratedAt: leads.pdfGeneratedAt,
        reportTemplateType: leads.reportTemplateType,
      }).from(leads).where(eq(leads.id, input.leadId));

      return lead || null;
    }),
});
