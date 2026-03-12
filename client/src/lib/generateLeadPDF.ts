// PDF Generation using HTML + window.print
// Supports full Arabic text with Tajawal font - no server needed, no Chromium needed

interface GeneratePDFOptions {
  lead?: any;
  websiteAnalysis?: any;
  socialAnalyses?: any[];
  report?: any;
  company?: any;
}

function scoreColor(val: number | null | undefined): string {
  if (!val) return "#94a3b8";
  if (val >= 7) return "#22c55e";
  if (val >= 5) return "#eab308";
  return "#ef4444";
}

function scoreLabel(val: number | null | undefined): string {
  if (!val) return "—";
  return Number(val).toFixed(1);
}

function platformIcon(platform: string): string {
  const icons: Record<string, string> = {
    instagram: "📸",
    twitter: "🐦",
    tiktok: "🎵",
    snapchat: "👻",
    facebook: "📘",
    linkedin: "💼",
  };
  return icons[platform?.toLowerCase()] || "📱";
}

function platformName(platform: string): string {
  const names: Record<string, string> = {
    instagram: "إنستغرام",
    twitter: "تويتر / X",
    tiktok: "تيك توك",
    snapchat: "سناب شات",
    facebook: "فيسبوك",
    linkedin: "لينكد إن",
  };
  return names[platform?.toLowerCase()] || platform;
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

function urgencyInfo(level: string | null | undefined): { text: string; color: string; bg: string } {
  switch (level) {
    case "high": return { text: "أولوية عالية", color: "#fff", bg: "#ef4444" };
    case "medium": return { text: "أولوية متوسطة", color: "#fff", bg: "#f59e0b" };
    case "low": return { text: "أولوية منخفضة", color: "#fff", bg: "#22c55e" };
    default: return { text: "غير محدد", color: "#64748b", bg: "#f1f5f9" };
  }
}

export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;

  if (!lead) throw new Error("لا توجد بيانات للعميل");

  const primaryColor = company?.primaryColor || "#1e3a5f";
  const secondaryColor = company?.secondaryColor || "#c9a84c";
  const companyName = company?.companyName || "مكسب";
  const companyLogo = company?.logoUrl || "";
  const reportDate = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgency = urgencyInfo(lead.urgencyLevel);
  const priorityScore = lead.leadPriorityScore ? Number(lead.leadPriorityScore).toFixed(1) : null;
  const websiteScore = websiteAnalysis?.overallScore ? Number(websiteAnalysis.overallScore).toFixed(1) : null;

  const socialSectionHtml = socialAnalyses.length > 0 ? `
    <div class="section">
      <div class="section-title"><span class="section-icon">📱</span>تحليل وسائل التواصل الاجتماعي</div>
      <div class="social-grid">
        ${socialAnalyses.map((sa: any) => `
          <div class="social-card">
            <div class="social-header">
              <span class="social-icon">${platformIcon(sa.platform || "")}</span>
              <span class="social-name">${platformName(sa.platform || "")}</span>
              ${sa.followersCount ? `<span class="social-followers">${Number(sa.followersCount).toLocaleString("ar")} متابع</span>` : ""}
            </div>
            ${sa.engagementRate ? `<div class="social-stat">معدل التفاعل: <strong>${Number(sa.engagementRate).toFixed(2)}%</strong></div>` : ""}
            ${sa.postsCount ? `<div class="social-stat">عدد المنشورات: <strong>${Number(sa.postsCount).toLocaleString("ar")}</strong></div>` : ""}
            ${(sa.analysisText || sa.rawAnalysis) ? `<div class="social-analysis">${(sa.analysisText || sa.rawAnalysis || "").slice(0, 400)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const websiteSectionHtml = websiteAnalysis ? `
    <div class="section">
      <div class="section-title"><span class="section-icon">🌐</span>تحليل الموقع الإلكتروني</div>
      <div class="scores-grid">
        ${[
          { label: "التقييم الإجمالي", value: websiteAnalysis.overallScore },
          { label: "السرعة", value: websiteAnalysis.loadSpeedScore },
          { label: "الجوال", value: websiteAnalysis.mobileExperienceScore },
          { label: "SEO", value: websiteAnalysis.seoScore },
          { label: "المحتوى", value: websiteAnalysis.contentQualityScore },
          { label: "التصميم", value: websiteAnalysis.designScore },
        ].map((s) => `
          <div class="score-box">
            <div class="score-value" style="color: ${scoreColor(s.value)}">${scoreLabel(s.value)}</div>
            <div class="score-label">${s.label}</div>
          </div>
        `).join("")}
      </div>
      ${websiteAnalysis.summary ? `<div class="analysis-text"><strong>ملخص التحليل:</strong><br>${websiteAnalysis.summary}</div>` : ""}
      ${websiteAnalysis.recommendations ? `<div class="analysis-text"><strong>التوصيات:</strong><br>${websiteAnalysis.recommendations}</div>` : ""}
    </div>
  ` : "";

  const aiSectionHtml = (lead.salesEntryAngle || lead.suggestedSalesEntryAngle || lead.iceBreaker || lead.biggestMarketingGap || lead.revenueOpportunity) ? `
    <div class="section">
      <div class="section-title"><span class="section-icon">🤖</span>التحليل التسويقي بالذكاء الاصطناعي</div>
      ${(lead.salesEntryAngle || lead.suggestedSalesEntryAngle) ? `
        <div class="ai-block">
          <div class="ai-block-title">⚡ زاوية الدخول البيعية</div>
          <div class="ai-block-content">${lead.salesEntryAngle || lead.suggestedSalesEntryAngle}</div>
        </div>
      ` : ""}
      ${lead.iceBreaker ? `
        <div class="ai-block">
          <div class="ai-block-title">💬 كسر الجمود</div>
          <div class="ai-block-content">${lead.iceBreaker}</div>
        </div>
      ` : ""}
      ${lead.biggestMarketingGap ? `
        <div class="ai-block">
          <div class="ai-block-title">🎯 أكبر ثغرة تسويقية</div>
          <div class="ai-block-content">${lead.biggestMarketingGap}</div>
        </div>
      ` : ""}
      ${lead.revenueOpportunity ? `
        <div class="ai-block">
          <div class="ai-block-title">💰 فرصة الإيراد</div>
          <div class="ai-block-content">${lead.revenueOpportunity}</div>
        </div>
      ` : ""}
    </div>
  ` : "";

  const fullReportSectionHtml = report?.fullReport ? `
    <div class="section page-break-before">
      <div class="section-title"><span class="section-icon">📋</span>التقرير الشامل</div>
      <div class="full-report">
        <p>${cleanMarkdown(typeof report.fullReport === "string" ? report.fullReport : "")}</p>
      </div>
    </div>
  ` : "";

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير ${lead.companyName || "عميل"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Tajawal', sans-serif; direction: rtl; text-align: right; background: #f8fafc; color: #1e293b; font-size: 13px; line-height: 1.7; }
    .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 60%, ${secondaryColor}44 100%); color: white; padding: 32px 40px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50px; left: -50px; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.05); }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .company-brand { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 56px; height: 56px; border-radius: 12px; object-fit: contain; background: white; padding: 4px; }
    .company-logo-placeholder { width: 56px; height: 56px; border-radius: 12px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: white; }
    .company-info h1 { font-size: 20px; font-weight: 800; color: white; }
    .company-info p { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }
    .report-meta { text-align: left; color: rgba(255,255,255,0.8); font-size: 12px; }
    .report-meta .date { font-size: 13px; font-weight: 500; color: white; margin-bottom: 4px; }
    .report-meta .report-id { font-size: 11px; color: rgba(255,255,255,0.6); }
    .client-section { display: flex; justify-content: space-between; align-items: flex-end; }
    .client-name { font-size: 28px; font-weight: 900; color: white; margin-bottom: 6px; }
    .client-type { font-size: 14px; color: rgba(255,255,255,0.8); display: flex; align-items: center; gap: 8px; }
    .client-type .dot { width: 6px; height: 6px; border-radius: 50%; background: ${secondaryColor}; display: inline-block; }
    .scores-row { display: flex; gap: 12px; align-items: center; }
    .score-badge { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px; text-align: center; min-width: 80px; }
    .score-badge .val { font-size: 22px; font-weight: 900; color: white; }
    .score-badge .lbl { font-size: 10px; color: rgba(255,255,255,0.7); margin-top: 2px; }
    .urgency-badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; background: ${urgency.bg}; color: ${urgency.color}; }
    .accent-bar { height: 4px; background: linear-gradient(90deg, ${secondaryColor}, ${primaryColor}); }
    .intro-section { background: white; padding: 20px 40px; border-bottom: 1px solid #e2e8f0; }
    .intro-text { color: #475569; font-size: 13px; line-height: 1.8; }
    .contact-section { background: white; padding: 24px 40px; border-bottom: 1px solid #e2e8f0; }
    .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .contact-item { display: flex; align-items: center; gap: 10px; }
    .contact-icon { width: 36px; height: 36px; border-radius: 8px; background: ${primaryColor}15; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .contact-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
    .contact-value { font-size: 13px; font-weight: 600; color: #1e293b; }
    .content { padding: 24px 40px; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .section-title { font-size: 16px; font-weight: 800; color: ${primaryColor}; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid ${secondaryColor}44; display: flex; align-items: center; gap: 8px; }
    .section-icon { font-size: 18px; }
    .scores-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
    .score-box { background: #f8fafc; border-radius: 10px; padding: 14px 8px; text-align: center; border: 1px solid #e2e8f0; }
    .score-value { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
    .score-label { font-size: 10px; color: #64748b; font-weight: 500; }
    .analysis-text { background: #f8fafc; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #475569; line-height: 1.8; margin-top: 12px; border-right: 3px solid ${primaryColor}44; }
    .ai-block { background: linear-gradient(135deg, #f8fafc, #f1f5f9); border-radius: 10px; padding: 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; }
    .ai-block:last-child { margin-bottom: 0; }
    .ai-block-title { font-size: 13px; font-weight: 700; color: ${primaryColor}; margin-bottom: 8px; }
    .ai-block-content { font-size: 12px; color: #475569; line-height: 1.8; }
    .social-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .social-card { background: #f8fafc; border-radius: 10px; padding: 16px; border: 1px solid #e2e8f0; }
    .social-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .social-icon { font-size: 20px; }
    .social-name { font-size: 14px; font-weight: 700; color: ${primaryColor}; flex: 1; }
    .social-followers { font-size: 11px; font-weight: 600; color: white; background: ${primaryColor}; padding: 3px 8px; border-radius: 20px; }
    .social-stat { font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .social-stat strong { color: #1e293b; }
    .social-analysis { font-size: 11px; color: #64748b; line-height: 1.7; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; }
    .full-report { font-size: 12px; color: #475569; line-height: 1.9; }
    .full-report p { margin-bottom: 10px; }
    .full-report strong { color: ${primaryColor}; font-weight: 700; }
    .full-report code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-family: monospace; }
    .footer-accent { height: 3px; background: ${secondaryColor}; }
    .footer { background: ${primaryColor}; color: rgba(255,255,255,0.8); padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 8px; }
    .footer-brand { font-weight: 700; color: white; font-size: 13px; }
    .footer-meta { text-align: left; color: rgba(255,255,255,0.6); }
    .print-bar { position: fixed; top: 0; left: 0; right: 0; background: ${primaryColor}; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .print-bar h3 { font-size: 14px; font-weight: 700; }
    .print-bar .actions { display: flex; gap: 10px; }
    .btn-print { background: ${secondaryColor}; color: ${primaryColor}; border: none; padding: 8px 20px; border-radius: 8px; font-family: 'Tajawal', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
    .btn-close { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); padding: 8px 16px; border-radius: 8px; font-family: 'Tajawal', sans-serif; font-size: 13px; cursor: pointer; }
    .page-wrapper { margin-top: 52px; }
    @media print {
      .print-bar { display: none !important; }
      .page-wrapper { margin-top: 0 !important; }
      body { background: white; }
      .section { break-inside: avoid; }
      .page-break-before { break-before: page; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <h3>📄 تقرير ${lead.companyName || "عميل"}</h3>
    <div class="actions">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>

  <div class="page-wrapper">
    <div class="header">
      <div class="header-top">
        <div class="company-brand">
          ${companyLogo
            ? `<img src="${companyLogo}" alt="${companyName}" class="company-logo">`
            : `<div class="company-logo-placeholder">${companyName.charAt(0)}</div>`
          }
          <div class="company-info">
            <h1>${companyName}</h1>
            ${company?.reportHeaderText ? `<p>${company.reportHeaderText}</p>` : ""}
            ${company?.phone ? `<p>📞 ${company.phone}</p>` : ""}
          </div>
        </div>
        <div class="report-meta">
          <div class="date">📅 ${reportDate}</div>
          <div class="report-id">تقرير تحليل العميل #${lead.id || ""}</div>
          ${company?.licenseNumber ? `<div class="report-id">رقم الترخيص: ${company.licenseNumber}</div>` : ""}
        </div>
      </div>
      <div class="client-section">
        <div>
          <div class="client-name">${lead.companyName || "—"}</div>
          <div class="client-type">
            <span class="dot"></span>
            ${lead.businessType || ""}
            ${lead.city ? `<span class="dot"></span> ${lead.city}` : ""}
            ${lead.country ? ` · ${lead.country}` : ""}
          </div>
        </div>
        <div class="scores-row">
          ${priorityScore ? `<div class="score-badge"><div class="val">${priorityScore}</div><div class="lbl">أولوية</div></div>` : ""}
          ${websiteScore ? `<div class="score-badge"><div class="val">${websiteScore}</div><div class="lbl">الموقع</div></div>` : ""}
          <div class="urgency-badge">${urgency.text}</div>
        </div>
      </div>
    </div>

    <div class="accent-bar"></div>

    ${company?.reportIntroText ? `<div class="intro-section"><div class="intro-text">${company.reportIntroText}</div></div>` : ""}

    <div class="contact-section">
      <div class="contact-grid">
        ${(lead.verifiedPhone || lead.phone) ? `<div class="contact-item"><div class="contact-icon">📞</div><div><div class="contact-label">رقم الهاتف</div><div class="contact-value">${lead.verifiedPhone || lead.phone}</div></div></div>` : ""}
        ${lead.email ? `<div class="contact-item"><div class="contact-icon">📧</div><div><div class="contact-label">البريد الإلكتروني</div><div class="contact-value">${lead.email}</div></div></div>` : ""}
        ${lead.website ? `<div class="contact-item"><div class="contact-icon">🌐</div><div><div class="contact-label">الموقع الإلكتروني</div><div class="contact-value">${lead.website}</div></div></div>` : ""}
        ${lead.instagramUrl ? `<div class="contact-item"><div class="contact-icon">📸</div><div><div class="contact-label">إنستغرام</div><div class="contact-value">${lead.instagramUrl.replace("https://www.instagram.com/", "@").replace("https://instagram.com/", "@")}</div></div></div>` : ""}
        ${lead.twitterUrl ? `<div class="contact-item"><div class="contact-icon">🐦</div><div><div class="contact-label">تويتر / X</div><div class="contact-value">${lead.twitterUrl.replace("https://twitter.com/", "@").replace("https://x.com/", "@")}</div></div></div>` : ""}
        ${lead.tiktokUrl ? `<div class="contact-item"><div class="contact-icon">🎵</div><div><div class="contact-label">تيك توك</div><div class="contact-value">${lead.tiktokUrl.replace("https://www.tiktok.com/@", "@").replace("https://tiktok.com/@", "@")}</div></div></div>` : ""}
        ${lead.rating ? `<div class="contact-item"><div class="contact-icon">⭐</div><div><div class="contact-label">التقييم</div><div class="contact-value">${lead.rating} / 5 ${lead.reviewCount ? `(${lead.reviewCount} تقييم)` : ""}</div></div></div>` : ""}
      </div>
    </div>

    <div class="content">
      ${aiSectionHtml}
      ${websiteSectionHtml}
      ${socialSectionHtml}
      ${fullReportSectionHtml}
      ${lead.notes ? `<div class="section"><div class="section-title"><span class="section-icon">📝</span>الملاحظات</div><div class="analysis-text">${lead.notes}</div></div>` : ""}
    </div>

    <div class="footer-accent"></div>
    <div class="footer">
      <div>
        <div class="footer-brand">${companyName}</div>
        ${company?.reportFooterText ? `<div>${company.reportFooterText}</div>` : ""}
        ${company?.email ? `<div>${company.email}</div>` : ""}
        ${company?.website ? `<div>${company.website}</div>` : ""}
      </div>
      <div class="footer-meta">
        <div>تاريخ الإصدار: ${reportDate}</div>
        <div>هذا التقرير سري وخاص بالشركة</div>
        ${company?.address ? `<div>${company.address}</div>` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error("تعذّر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة في المتصفح.");
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.addEventListener("load", () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1500);
  });
}
