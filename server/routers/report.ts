import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getLeadById, getWebsiteAnalysisByLeadId, getSocialAnalysesByLeadId } from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import puppeteer from "puppeteer-core";
import { nanoid } from "nanoid";

// ===== HTML Template for PDF =====
function buildPDFHtml(lead: any, websiteAnalysis: any, socialAnalyses: any[]): string {
  const stageLabels: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", interested: "مهتم",
    price_offer: "عرض سعر", meeting: "اجتماع", won: "عميل فعلي", lost: "خسرناه",
  };
  const priorityLabels: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
  const urgencyColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const urgencyLabels: Record<string, string> = { high: "عاجل", medium: "متوسط", low: "منخفض" };
  const now = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  const socialRows = socialAnalyses.map(s => `
    <div class="social-card">
      <div class="social-platform">${s.platform}</div>
      <div class="social-stats">
        ${s.followersCount ? `<span>👥 ${Number(s.followersCount).toLocaleString("ar")} متابع</span>` : ""}
        ${s.engagementRate ? `<span>📊 ${s.engagementRate}% تفاعل</span>` : ""}
        ${s.postsCount ? `<span>📝 ${s.postsCount} منشور</span>` : ""}
      </div>
      ${s.analysisText ? `<p class="analysis-text">${String(s.analysisText).substring(0, 200)}...</p>` : ""}
    </div>
  `).join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    background: #f8fafc;
    color: #1e293b;
    direction: rtl;
    font-size: 13px;
    line-height: 1.6;
  }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; background: white; position: relative; }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
    color: white;
    padding: 32px 40px;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .company-name { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
  .company-meta { font-size: 13px; opacity: 0.75; }
  .report-badge {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px;
    padding: 8px 16px;
    text-align: center;
    font-size: 11px;
    opacity: 0.9;
  }
  .report-badge strong { display: block; font-size: 14px; margin-bottom: 2px; }
  .scores-row { display: flex; background: #0f172a; }
  .score-item { flex: 1; padding: 16px; text-align: center; border-left: 1px solid rgba(255,255,255,0.08); }
  .score-item:last-child { border-left: none; }
  .score-value { font-size: 22px; font-weight: 700; color: #60a5fa; }
  .score-label { font-size: 10px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .body { padding: 28px 40px; }
  .section { margin-bottom: 24px; }
  .section-title {
    font-size: 14px; font-weight: 700; color: #0f172a;
    border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
  .info-label { font-size: 10px; color: #94a3b8; margin-bottom: 3px; font-weight: 500; }
  .info-value { font-size: 13px; color: #1e293b; font-weight: 600; }
  .urgency-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 14px;
  }
  .analysis-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .analysis-box-title { font-size: 11px; font-weight: 700; color: #0369a1; margin-bottom: 7px; }
  .analysis-box p { font-size: 12px; color: #334155; line-height: 1.7; }
  .ice-breaker-box { background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .ice-breaker-box .analysis-box-title { color: #065f46; }
  .ice-breaker-box p { color: #064e3b; font-weight: 500; font-size: 12px; }
  .sales-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
  .sales-box .analysis-box-title { color: #92400e; }
  .sales-box p { color: #78350f; font-weight: 500; font-size: 12px; }
  .social-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .social-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .social-platform { font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 7px; text-transform: capitalize; }
  .social-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 7px; }
  .social-stats span { font-size: 11px; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; color: #475569; }
  .analysis-text { font-size: 11px; color: #64748b; line-height: 1.6; }
  .score-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .score-bar-label { font-size: 11px; color: #64748b; width: 120px; flex-shrink: 0; }
  .score-bar-track { flex: 1; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
  .score-bar-value { font-size: 11px; font-weight: 700; color: #1e293b; width: 30px; text-align: left; }
  .footer {
    background: #0f172a; color: rgba(255,255,255,0.5);
    padding: 14px 40px; display: flex; justify-content: space-between;
    align-items: center; font-size: 10px;
  }
  .footer-brand { color: rgba(255,255,255,0.8); font-weight: 600; font-size: 12px; }
  .watermark {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 80px; font-weight: 900;
    color: rgba(59,130,246,0.04); white-space: nowrap; pointer-events: none; z-index: 0;
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark">MAKSAB</div>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">${lead.companyName}</div>
        <div class="company-meta">${lead.businessType} · ${lead.city}${lead.district ? ` · ${lead.district}` : ""}</div>
      </div>
      <div class="report-badge"><strong>تقرير تحليلي</strong>${now}</div>
    </div>
  </div>
  <div class="scores-row">
    <div class="score-item">
      <div class="score-value">${lead.leadPriorityScore ? Number(lead.leadPriorityScore).toFixed(1) : "—"}</div>
      <div class="score-label">أولوية العميل</div>
    </div>
    <div class="score-item">
      <div class="score-value">${lead.brandingQualityScore ? Number(lead.brandingQualityScore).toFixed(1) : "—"}</div>
      <div class="score-label">جودة الهوية</div>
    </div>
    <div class="score-item">
      <div class="score-value">${lead.aiConfidenceScore ? (Number(lead.aiConfidenceScore) * 10).toFixed(0) + "%" : "—"}</div>
      <div class="score-label">دقة التحليل</div>
    </div>
    <div class="score-item">
      <div class="score-value" style="color: ${urgencyColors[lead.urgencyLevel || "medium"]}">${urgencyLabels[lead.urgencyLevel || "medium"]}</div>
      <div class="score-label">مستوى الإلحاح</div>
    </div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">معلومات النشاط التجاري</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">رقم الهاتف</div><div class="info-value">${lead.verifiedPhone || "غير متوفر"}</div></div>
        <div class="info-item"><div class="info-label">الموقع الإلكتروني</div><div class="info-value">${lead.website || "غير متوفر"}</div></div>
        <div class="info-item"><div class="info-label">مرحلة العميل</div><div class="info-value">${stageLabels[lead.stage] || lead.stage}</div></div>
        <div class="info-item"><div class="info-label">الأولوية</div><div class="info-value">${priorityLabels[lead.priority] || lead.priority}</div></div>
        ${lead.instagramUrl ? `<div class="info-item"><div class="info-label">إنستغرام</div><div class="info-value">${lead.instagramUrl}</div></div>` : ""}
        ${lead.twitterUrl ? `<div class="info-item"><div class="info-label">تويتر</div><div class="info-value">${lead.twitterUrl}</div></div>` : ""}
        ${lead.snapchatUrl ? `<div class="info-item"><div class="info-label">سناب شات</div><div class="info-value">${lead.snapchatUrl}</div></div>` : ""}
        ${lead.tiktokUrl ? `<div class="info-item"><div class="info-label">تيك توك</div><div class="info-value">${lead.tiktokUrl}</div></div>` : ""}
        ${lead.facebookUrl ? `<div class="info-item"><div class="info-label">فيسبوك</div><div class="info-value">${lead.facebookUrl}</div></div>` : ""}
        ${(lead as any).linkedinUrl ? `<div class="info-item"><div class="info-label">لينكد إن</div><div class="info-value">${(lead as any).linkedinUrl}</div></div>` : ""}
      </div>
    </div>
    ${(lead.iceBreaker || lead.salesEntryAngle || lead.marketingGapSummary) ? `
    <div class="section">
      <div class="section-title">التحليل الذكي</div>
      ${lead.urgencyLevel ? `<div class="urgency-badge" style="background:${urgencyColors[lead.urgencyLevel]}22;color:${urgencyColors[lead.urgencyLevel]};border:1px solid ${urgencyColors[lead.urgencyLevel]}44;">⚡ مستوى الإلحاح: ${urgencyLabels[lead.urgencyLevel]}</div>` : ""}
      ${lead.iceBreaker ? `<div class="ice-breaker-box"><div class="analysis-box-title">🎯 جملة كسر الجليد</div><p>${lead.iceBreaker}</p></div>` : ""}
      ${lead.salesEntryAngle ? `<div class="sales-box"><div class="analysis-box-title">💡 زاوية الدخول البيعية</div><p>${lead.salesEntryAngle}</p></div>` : ""}
      ${lead.marketingGapSummary ? `<div class="analysis-box"><div class="analysis-box-title">📊 ملخص الفجوة التسويقية</div><p>${lead.marketingGapSummary}</p></div>` : ""}
      ${lead.primaryOpportunity ? `<div class="analysis-box"><div class="analysis-box-title">🚀 الفرصة الرئيسية</div><p>${lead.primaryOpportunity}</p></div>` : ""}
    </div>` : ""}
    ${websiteAnalysis ? `
    <div class="section">
      <div class="section-title">تحليل الموقع الإلكتروني</div>
      ${websiteAnalysis.seoScore ? `<div class="score-bar-row"><div class="score-bar-label">SEO</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(websiteAnalysis.seoScore/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.seoScore).toFixed(1)}</div></div>` : ""}
      ${websiteAnalysis.socialPresenceScore ? `<div class="score-bar-row"><div class="score-bar-label">الحضور الاجتماعي</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(websiteAnalysis.socialPresenceScore/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.socialPresenceScore).toFixed(1)}</div></div>` : ""}
      ${websiteAnalysis.contentQualityScore ? `<div class="score-bar-row"><div class="score-bar-label">جودة المحتوى</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(websiteAnalysis.contentQualityScore/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.contentQualityScore).toFixed(1)}</div></div>` : ""}
      ${websiteAnalysis.analysisText ? `<div class="analysis-box" style="margin-top:12px"><div class="analysis-box-title">ملاحظات التحليل</div><p>${String(websiteAnalysis.analysisText).substring(0, 400)}...</p></div>` : ""}
    </div>` : ""}
    ${socialAnalyses.length > 0 ? `
    <div class="section">
      <div class="section-title">تحليل منصات التواصل الاجتماعي</div>
      <div class="social-grid">${socialRows}</div>
    </div>` : ""}
    ${lead.notes ? `
    <div class="section">
      <div class="section-title">ملاحظات</div>
      <div class="analysis-box"><p>${lead.notes}</p></div>
    </div>` : ""}
  </div>
  <div class="footer">
    <div class="footer-brand">مكسب - نظام تجميع بيانات العملاء</div>
    <div>تقرير سري · ${now}</div>
    <div>maksab-sales.xyz</div>
  </div>
</div>
</body>
</html>`;
}

async function generatePDFBuffer(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-first-run", "--no-zygote", "--single-process"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export const reportRouter = router({
  generatePDF: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      const websiteAnalysis = await getWebsiteAnalysisByLeadId(input.leadId);
      const socialAnalyses = await getSocialAnalysesByLeadId(input.leadId);

      const html = buildPDFHtml(lead, websiteAnalysis, socialAnalyses);

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generatePDFBuffer(html);
      } catch (err: any) {
        console.error("[PDF] Puppeteer error:", err.message);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل توليد PDF: ${err.message}` });
      }

      const fileKey = `reports/${input.leadId}-${nanoid(8)}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      return { success: true, leadId: input.leadId, url, filename: `تقرير-${lead.companyName}.pdf` };
    }),

  generateAndSendViaWhatsApp: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async () => {
      return { success: false, message: "ميزة إرسال PDF عبر واتساب غير متاحة حالياً" };
    }),

  generateSummary: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت مساعد مبيعات خبير. قدم ملخصاً احترافياً للعميل." },
          { role: "user", content: `قدم ملخصاً مختصراً لهذا العميل:\nالشركة: ${lead.companyName}\nالنشاط: ${lead.businessType}\nالمدينة: ${lead.city}\nالمرحلة: ${lead.stage}` },
        ],
      });
      return { summary: response.choices[0]?.message?.content || "لا يمكن إنشاء الملخص حالياً" };
    }),

  getEmployeePerformance: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return [];
      const { users } = await import("../../drizzle/schema");
      const allUsers = await db.select({ id: users.id, name: users.name, displayName: users.displayName }).from(users).limit(20);
      return allUsers.map(u => ({ id: u.id, name: u.displayName || u.name, totalChats: 0, closeRate: 0, performanceScore: 0 }));
    }),
});
