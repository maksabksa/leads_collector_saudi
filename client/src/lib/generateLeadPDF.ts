import jsPDF from "jspdf";

interface LeadPDFData {
  lead: any;
  websiteAnalysis?: any;
  socialAnalyses?: any[];
  report?: any;
  company?: any;
}

function scoreBar(value: number | null | undefined, max = 10): string {
  if (!value) return "—";
  const pct = Math.round((Number(value) / max) * 100);
  return `${Number(value).toFixed(1)} / ${max}`;
}

function rtlText(text: string): string {
  return text || "";
}

export async function generateLeadPDF(data: LeadPDFData): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = data;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;

  // Colors
  const primaryColor = company?.primaryColor || "#1a2744";
  const accentColor = company?.secondaryColor || "#3b82f6";

  // Helper: hex to RGB
  function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [26, 39, 68];
  }

  const [pr, pg, pb] = hexToRgb(primaryColor);
  const [ar, ag, ab] = hexToRgb(accentColor);

  // ─── HEADER ───────────────────────────────────────────────
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageW, 45, "F");

  // Accent line
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 43, pageW, 2, "F");

  // Company name (right-aligned for Arabic)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const companyName = company?.companyName || "مجمع بيانات الأعمال";
  doc.text(companyName, pageW - margin, 16, { align: "right" });

  // Company info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 230);
  const companyInfo = [
    company?.phone,
    company?.email,
    company?.website,
  ].filter(Boolean).join("  |  ");
  if (companyInfo) {
    doc.text(companyInfo, pageW - margin, 23, { align: "right" });
  }

  // Report label (left side)
  doc.setTextColor(ar, ag, ab);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("ANALYTICAL REPORT", margin, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(new Date().toLocaleDateString("ar-SA"), margin, 23);
  if (company?.licenseNumber) {
    doc.text(`License: ${company.licenseNumber}`, margin, 29);
  }

  // ─── CLIENT NAME SECTION ──────────────────────────────────
  let y = 55;
  doc.setFillColor(240, 244, 255);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, "F");

  doc.setTextColor(pr, pg, pb);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(lead.companyName || "", pageW - margin - 2, y + 8, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 100, 140);
  const subInfo = [lead.businessType, lead.city, lead.country].filter(Boolean).join(" · ");
  doc.text(subInfo, pageW - margin - 2, y + 15, { align: "right" });

  // Stage badge
  if (lead.stage) {
    doc.setFillColor(ar, ag, ab);
    doc.roundedRect(margin + 2, y + 5, 28, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(lead.stage, margin + 16, y + 11, { align: "center" });
  }

  y += 30;

  // ─── SCORES ROW ───────────────────────────────────────────
  const scores = [
    { label: "أولوية العميل", value: lead.leadPriorityScore },
    { label: "جودة الهوية", value: lead.brandingQualityScore },
    { label: "جاهزية الموسم", value: lead.seasonalReadinessScore },
  ];

  const boxW = (contentW - 8) / 3;
  scores.forEach((s, i) => {
    const bx = margin + i * (boxW + 4);
    doc.setFillColor(pr, pg, pb);
    doc.roundedRect(bx, y, boxW, 22, 3, 3, "F");

    const val = s.value ? Number(s.value).toFixed(1) : "—";
    const color = s.value
      ? Number(s.value) >= 7
        ? ([34, 197, 94] as [number, number, number])
        : Number(s.value) >= 5
        ? ([234, 179, 8] as [number, number, number])
        : ([239, 68, 68] as [number, number, number])
      : ([150, 160, 180] as [number, number, number]);

    doc.setTextColor(...color);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(val, bx + boxW / 2, y + 11, { align: "center" });

    doc.setTextColor(180, 190, 210);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(s.label, bx + boxW / 2, y + 18, { align: "center" });
  });

  y += 30;

  // ─── CONTACT INFO ─────────────────────────────────────────
  doc.setFillColor(248, 250, 255);
  doc.roundedRect(margin, y, contentW, 20, 3, 3, "F");
  doc.setDrawColor(220, 228, 245);
  doc.roundedRect(margin, y, contentW, 20, 3, 3, "S");

  doc.setTextColor(60, 80, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("معلومات الاتصال", pageW - margin - 2, y + 6, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contacts = [
    lead.verifiedPhone && `📞 ${lead.verifiedPhone}`,
    lead.website && `🌐 ${lead.website}`,
    lead.city && `📍 ${lead.city}`,
    lead.instagramUrl && `📸 ${lead.instagramUrl}`,
  ].filter(Boolean);

  const colW = contentW / 2;
  contacts.forEach((c, i) => {
    const cx = i % 2 === 0 ? pageW - margin - 2 : pageW - margin - colW;
    const cy = y + 12 + Math.floor(i / 2) * 6;
    doc.setTextColor(80, 100, 140);
    doc.text(c as string, cx, cy, { align: "right" });
  });

  y += 28;

  // ─── SECTION HELPER ───────────────────────────────────────
  function sectionTitle(title: string) {
    doc.setFillColor(ar, ag, ab);
    doc.rect(margin, y, 3, 7, "F");
    doc.setTextColor(pr, pg, pb);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageW - margin - 2, y + 5.5, { align: "right" });
    y += 12;
  }

  function textBlock(label: string, value: string | null | undefined, highlight = false) {
    if (!value) return;
    if (highlight) {
      doc.setFillColor(ar, ag, ab);
      doc.setFillColor(235, 242, 255);
      doc.roundedRect(margin, y, contentW, 14, 2, 2, "F");
    }
    doc.setTextColor(100, 120, 160);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, pageW - margin - 2, y + 5, { align: "right" });

    doc.setTextColor(30, 50, 90);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value, contentW - 4);
    doc.text(lines.slice(0, 2), pageW - margin - 2, y + 10, { align: "right" });
    y += highlight ? 18 : 14;
  }

  function checkNewPage(needed = 30) {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  }

  // ─── AI ANALYSIS ──────────────────────────────────────────
  checkNewPage(60);
  sectionTitle("التحليل التسويقي بالذكاء الاصطناعي");

  if (lead.salesEntryAngle || lead.suggestedSalesEntryAngle) {
    textBlock("زاوية الدخول البيعية", lead.salesEntryAngle || lead.suggestedSalesEntryAngle, true);
  }
  if (lead.iceBreaker) {
    textBlock("كسر الجمود", lead.iceBreaker);
  }
  if (lead.biggestMarketingGap) {
    textBlock("أكبر ثغرة تسويقية", lead.biggestMarketingGap);
  }
  if (lead.revenueOpportunity) {
    textBlock("فرصة الإيراد", lead.revenueOpportunity);
  }

  // ─── WEBSITE ANALYSIS ─────────────────────────────────────
  if (websiteAnalysis) {
    checkNewPage(60);
    sectionTitle("تحليل الموقع الإلكتروني");

    const wsScores = [
      { label: "السرعة", value: websiteAnalysis.loadSpeedScore },
      { label: "الجوال", value: websiteAnalysis.mobileExperienceScore },
      { label: "SEO", value: websiteAnalysis.seoScore },
      { label: "المحتوى", value: websiteAnalysis.contentQualityScore },
      { label: "التصميم", value: websiteAnalysis.designScore },
      { label: "الإجمالي", value: websiteAnalysis.overallScore },
    ];

    const sbW = (contentW - 10) / 3;
    wsScores.forEach((s, i) => {
      if (i > 0 && i % 3 === 0) y += 18;
      const bx = margin + (i % 3) * (sbW + 5);
      const val = s.value ? Number(s.value).toFixed(1) : "—";
      const clr: [number, number, number] = s.value
        ? Number(s.value) >= 7 ? [34, 197, 94] : Number(s.value) >= 5 ? [234, 179, 8] : [239, 68, 68]
        : [150, 160, 180];
      doc.setFillColor(245, 248, 255);
      doc.roundedRect(bx, y, sbW, 14, 2, 2, "F");
      doc.setTextColor(...clr);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(val, bx + sbW / 2, y + 7, { align: "center" });
      doc.setTextColor(100, 120, 160);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(s.label, bx + sbW / 2, y + 12, { align: "center" });
    });
    y += 22;

    if (websiteAnalysis.summary) {
      textBlock("ملخص التحليل", websiteAnalysis.summary);
    }
  }

  // ─── SOCIAL MEDIA ─────────────────────────────────────────
  if (socialAnalyses && socialAnalyses.length > 0) {
    checkNewPage(50);
    sectionTitle("تحليل وسائل التواصل الاجتماعي");

    socialAnalyses.forEach((sa: any) => {
      checkNewPage(30);
      const platform = sa.platform || "";
      doc.setFillColor(245, 248, 255);
      doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");
      doc.setTextColor(ar, ag, ab);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(platform.toUpperCase(), pageW - margin - 2, y + 8, { align: "right" });

      if (sa.followersCount) {
        doc.setTextColor(60, 80, 120);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`متابعون: ${Number(sa.followersCount).toLocaleString("ar")}`, margin + 2, y + 8);
      }
      y += 16;

      if (sa.analysisText || sa.rawAnalysis) {
        const txt = sa.analysisText || sa.rawAnalysis || "";
        doc.setTextColor(60, 80, 120);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(txt.slice(0, 300), contentW);
        doc.text(lines.slice(0, 4), pageW - margin - 2, y, { align: "right" });
        y += lines.slice(0, 4).length * 4 + 4;
      }
    });
  }

  // ─── FULL REPORT ──────────────────────────────────────────
  if (report?.fullReport) {
    checkNewPage(50);
    sectionTitle("التقرير الشامل");
    const reportText = typeof report.fullReport === "string"
      ? report.fullReport.replace(/[#*`]/g, "").slice(0, 1500)
      : "";
    if (reportText) {
      doc.setTextColor(50, 70, 110);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(reportText, contentW);
      lines.slice(0, 30).forEach((line: string) => {
        checkNewPage(8);
        doc.text(line, pageW - margin - 2, y, { align: "right" });
        y += 5;
      });
    }
  }

  // ─── FOOTER ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(pr, pg, pb);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, pageH - 12, pageW, 1, "F");

    doc.setTextColor(180, 190, 210);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    const footerText = company?.reportFooterText || companyName;
    doc.text(footerText, pageW - margin, pageH - 5, { align: "right" });
    doc.text(`${p} / ${totalPages}`, margin, pageH - 5);
  }

  // ─── SAVE ─────────────────────────────────────────────────
  const filename = `تقرير-${lead.companyName || "عميل"}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
