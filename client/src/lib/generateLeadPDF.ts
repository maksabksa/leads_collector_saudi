// PDF Generation using HTML + window.print
// Dark theme matching the app's internal design - Tajawal font, dark background, colored scores

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

function scoreBorderColor(val: number | null | undefined): string {
  if (!val) return "#334155";
  if (val >= 7) return "#22c55e";
  if (val >= 5) return "#eab308";
  return "#ef4444";
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

function urgencyInfo(level: string | null | undefined): { text: string; color: string; bg: string; border: string } {
  switch (level) {
    case "high": return { text: "أولوية عالية", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "#ef4444" };
    case "medium": return { text: "أولوية متوسطة", color: "#eab308", bg: "rgba(234,179,8,0.15)", border: "#eab308" };
    case "low": return { text: "أولوية منخفضة", color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "#22c55e" };
    default: return { text: "غير محدد", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "#334155" };
  }
}

export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;

  if (!lead) throw new Error("لا توجد بيانات للعميل");

  const accentColor = company?.secondaryColor || "#22c55e"; // green accent like the app
  const companyName = company?.companyName || "مكسب";
  const companyLogo = company?.logoUrl || "";
  const reportDate = new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const urgency = urgencyInfo(lead.urgencyLevel);
  const priorityScore = lead.leadPriorityScore ? Number(lead.leadPriorityScore) : null;
  const websiteScore = websiteAnalysis?.overallScore ? Number(websiteAnalysis.overallScore) : null;
  const qualityScore = lead.dataQualityScore ? Number(lead.dataQualityScore) : null;
  const seasonScore = lead.seasonalityScore ? Number(lead.seasonalityScore) : null;

  // ─── Sections HTML ───────────────────────────────────────────────────────────

  const scoreCircle = (val: number | null, label: string) => {
    const color = scoreColor(val);
    const border = scoreBorderColor(val);
    return `
      <div class="score-circle-wrap">
        <div class="score-circle" style="border-color: ${border}; color: ${color};">
          ${val !== null ? val.toFixed(0) : "—"}
        </div>
        <div class="score-circle-label">${label}</div>
      </div>
    `;
  };

  const gapItem = (text: string) => `
    <li class="gap-item">
      <span class="gap-dot">•</span>
      <span>${text}</span>
    </li>
  `;

  // Critical gaps from AI analysis
  const gaps: string[] = [];
  if (lead.biggestMarketingGap) {
    // split by newline or bullet
    const lines = lead.biggestMarketingGap.split(/\n|•|-/).map((s: string) => s.trim()).filter(Boolean);
    gaps.push(...lines.slice(0, 5));
  }

  const gapsHtml = gaps.length > 0 ? `
    <div class="dark-card">
      <div class="card-title accent-text">الثغرات الحرجة</div>
      <ul class="gap-list">
        ${gaps.map(gapItem).join("")}
      </ul>
    </div>
  ` : "";

  // Contact message
  const contactMsgHtml = (lead.salesEntryAngle || lead.suggestedSalesEntryAngle) ? `
    <div class="dark-card">
      <div class="card-title accent-text">نص التواصل المقترح</div>
      <div class="contact-msg-text">${lead.salesEntryAngle || lead.suggestedSalesEntryAngle}</div>
    </div>
  ` : "";

  // Phones discovered
  const phones: string[] = [];
  if (lead.verifiedPhone) phones.push(lead.verifiedPhone);
  if (lead.phone && lead.phone !== lead.verifiedPhone) phones.push(lead.phone);
  if (lead.additionalPhones) {
    try {
      const arr = typeof lead.additionalPhones === "string" ? JSON.parse(lead.additionalPhones) : lead.additionalPhones;
      if (Array.isArray(arr)) phones.push(...arr.filter((p: string) => p && !phones.includes(p)));
    } catch {}
  }

  const phonesHtml = phones.length > 0 ? `
    <div class="dark-card">
      <div class="card-title accent-text">أرقام هاتف مكتشفة من الموقع</div>
      <div class="phones-row">
        ${phones.map(p => `<span class="phone-tag">${p}</span>`).join("")}
      </div>
    </div>
  ` : "";

  // Social followers
  const socialFollowersHtml = socialAnalyses.length > 0 ? `
    <div class="social-followers-grid">
      ${socialAnalyses.map((sa: any) => sa.followersCount ? `
        <div class="followers-card">
          <div class="followers-label">${platformName(sa.platform || "")} متابعون</div>
          <div class="followers-count">${Number(sa.followersCount).toLocaleString("ar-SA")}</div>
        </div>
      ` : "").join("")}
    </div>
  ` : "";

  // Social analysis section
  const socialSectionHtml = socialAnalyses.length > 0 ? `
    <div class="section-header">📱 تحليل وسائل التواصل الاجتماعي</div>
    <div class="social-grid">
      ${socialAnalyses.map((sa: any) => `
        <div class="dark-card">
          <div class="social-card-header">
            <span class="social-platform-icon">${platformIcon(sa.platform || "")}</span>
            <span class="social-platform-name">${platformName(sa.platform || "")}</span>
            ${sa.followersCount ? `<span class="followers-badge">${Number(sa.followersCount).toLocaleString("ar-SA")} متابع</span>` : ""}
          </div>
          ${sa.engagementRate ? `<div class="social-stat-row"><span class="stat-label">معدل التفاعل</span><span class="stat-val accent-text">${Number(sa.engagementRate).toFixed(2)}%</span></div>` : ""}
          ${sa.postsCount ? `<div class="social-stat-row"><span class="stat-label">عدد المنشورات</span><span class="stat-val">${Number(sa.postsCount).toLocaleString("ar-SA")}</span></div>` : ""}
          ${(sa.analysisText || sa.rawAnalysis) ? `<div class="social-analysis-text">${(sa.analysisText || sa.rawAnalysis || "").slice(0, 300)}</div>` : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  // Website section
  const websiteSectionHtml = websiteAnalysis ? `
    <div class="section-header">🌐 تحليل الموقع الإلكتروني</div>
    <div class="scores-row-grid">
      ${[
        { label: "الإجمالي", value: websiteAnalysis.overallScore },
        { label: "السرعة", value: websiteAnalysis.loadSpeedScore },
        { label: "الجوال", value: websiteAnalysis.mobileExperienceScore },
        { label: "SEO", value: websiteAnalysis.seoScore },
        { label: "المحتوى", value: websiteAnalysis.contentQualityScore },
        { label: "التصميم", value: websiteAnalysis.designScore },
      ].map((s) => `
        <div class="score-box-dark">
          <div class="score-box-val" style="color: ${scoreColor(s.value)}">${scoreLabel(s.value)}</div>
          <div class="score-box-lbl">${s.label}</div>
        </div>
      `).join("")}
    </div>
    ${websiteAnalysis.summary ? `<div class="dark-card mt-12"><div class="card-title">ملخص التحليل</div><div class="analysis-body">${websiteAnalysis.summary}</div></div>` : ""}
    ${websiteAnalysis.recommendations ? `<div class="dark-card mt-12"><div class="card-title">التوصيات</div><div class="analysis-body">${websiteAnalysis.recommendations}</div></div>` : ""}
  ` : "";

  // Full report
  const fullReportHtml = report?.fullReport ? `
    <div class="section-header">📋 التقرير الشامل</div>
    <div class="dark-card">
      <div class="full-report-body">
        <p>${cleanMarkdown(typeof report.fullReport === "string" ? report.fullReport : "")}</p>
      </div>
    </div>
  ` : "";

  // Notes
  const notesHtml = lead.notes ? `
    <div class="section-header">📝 الملاحظات</div>
    <div class="dark-card">
      <div class="analysis-body">${lead.notes}</div>
    </div>
  ` : "";

  // Ice breaker
  const iceBreakerHtml = lead.iceBreaker ? `
    <div class="dark-card">
      <div class="card-title accent-text">💬 كسر الجمود</div>
      <div class="analysis-body">${lead.iceBreaker}</div>
    </div>
  ` : "";

  // Revenue opportunity
  const revenueHtml = lead.revenueOpportunity ? `
    <div class="dark-card">
      <div class="card-title" style="color: #22c55e;">💰 فرصة الإيراد</div>
      <div class="analysis-body">${lead.revenueOpportunity}</div>
    </div>
  ` : "";

  // ─── Full HTML ────────────────────────────────────────────────────────────────

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
    /* ── Reset & Base ── */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Tajawal', sans-serif;
      direction: rtl;
      text-align: right;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.7;
    }

    /* ── Print bar ── */
    .print-bar {
      position: fixed; top: 0; left: 0; right: 0;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      color: white;
      padding: 10px 24px;
      display: flex; justify-content: space-between; align-items: center;
      z-index: 1000;
    }
    .print-bar h3 { font-size: 14px; font-weight: 700; color: #e2e8f0; }
    .print-bar .actions { display: flex; gap: 10px; }
    .btn-print {
      background: #22c55e; color: #0f172a;
      border: none; padding: 7px 20px; border-radius: 8px;
      font-family: 'Tajawal', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .btn-close {
      background: transparent; color: #94a3b8;
      border: 1px solid #334155; padding: 7px 16px; border-radius: 8px;
      font-family: 'Tajawal', sans-serif; font-size: 13px; cursor: pointer;
    }

    /* ── Page wrapper ── */
    .page-wrapper { margin-top: 50px; max-width: 900px; margin-left: auto; margin-right: auto; padding: 0 0 40px; }

    /* ── Header ── */
    .header {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 28px 36px;
      display: flex; justify-content: space-between; align-items: flex-start;
    }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .company-logo { width: 52px; height: 52px; border-radius: 10px; object-fit: contain; background: #0f172a; padding: 4px; }
    .company-logo-placeholder {
      width: 52px; height: 52px; border-radius: 10px;
      background: #334155; display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; color: #e2e8f0;
    }
    .company-name { font-size: 18px; font-weight: 800; color: #f8fafc; }
    .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .header-right { text-align: left; }
    .report-date { font-size: 12px; color: #64748b; }
    .report-id { font-size: 11px; color: #475569; margin-top: 3px; }

    /* ── Client hero ── */
    .client-hero {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 24px 36px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .client-name { font-size: 26px; font-weight: 900; color: #f8fafc; margin-bottom: 6px; }
    .client-meta { font-size: 13px; color: #94a3b8; display: flex; align-items: center; gap: 8px; }
    .meta-dot { width: 5px; height: 5px; border-radius: 50%; background: #22c55e; display: inline-block; }
    .scores-row { display: flex; gap: 12px; align-items: center; }

    /* ── Score circles ── */
    .score-circle-wrap { text-align: center; }
    .score-circle {
      width: 64px; height: 64px; border-radius: 50%;
      border: 3px solid #334155;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900;
      background: #0f172a;
      margin: 0 auto 6px;
    }
    .score-circle-label { font-size: 10px; color: #64748b; font-weight: 500; }

    /* ── Urgency badge ── */
    .urgency-badge {
      padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
      background: ${urgency.bg}; color: ${urgency.color};
      border: 1px solid ${urgency.border};
    }

    /* ── Accent bar ── */
    .accent-bar { height: 3px; background: linear-gradient(90deg, #22c55e, #0ea5e9, #8b5cf6); }

    /* ── Contact info strip ── */
    .contact-strip {
      background: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 16px 36px;
      display: flex; flex-wrap: wrap; gap: 20px;
    }
    .contact-item { display: flex; align-items: center; gap: 8px; }
    .contact-icon-wrap {
      width: 32px; height: 32px; border-radius: 8px;
      background: #0f172a; border: 1px solid #334155;
      display: flex; align-items: center; justify-content: center; font-size: 14px;
    }
    .contact-label { font-size: 10px; color: #64748b; }
    .contact-value { font-size: 12px; font-weight: 600; color: #e2e8f0; }

    /* ── Content area ── */
    .content { padding: 24px 36px; }

    /* ── Section header ── */
    .section-header {
      font-size: 15px; font-weight: 800; color: #f8fafc;
      margin: 24px 0 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #334155;
      display: flex; align-items: center; gap: 8px;
    }

    /* ── Dark card ── */
    .dark-card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 18px 20px;
      margin-bottom: 12px;
    }
    .dark-card.mt-12 { margin-top: 12px; }
    .card-title {
      font-size: 13px; font-weight: 700; color: #94a3b8;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 6px;
    }
    .accent-text { color: #f97316 !important; }

    /* ── Contact message ── */
    .contact-msg-text {
      font-size: 13px; color: #cbd5e1; line-height: 1.9;
      background: #0f172a; border-radius: 8px; padding: 14px 16px;
      border-right: 3px solid #f97316;
    }

    /* ── Gaps list ── */
    .gap-list { list-style: none; padding: 0; }
    .gap-item {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 12px; color: #cbd5e1; line-height: 1.8;
      padding: 5px 0; border-bottom: 1px solid #1e293b;
    }
    .gap-item:last-child { border-bottom: none; }
    .gap-dot { color: #ef4444; font-size: 16px; line-height: 1; margin-top: 2px; flex-shrink: 0; }

    /* ── Phones ── */
    .phones-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
    .phone-tag {
      background: #0f172a; border: 1px solid #334155;
      border-radius: 6px; padding: 5px 12px;
      font-size: 13px; font-weight: 600; color: #22c55e;
      font-family: 'Tajawal', sans-serif; direction: ltr;
    }

    /* ── Social followers grid ── */
    .social-followers-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
    .followers-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 8px;
      padding: 12px 18px; text-align: center; min-width: 120px;
    }
    .followers-label { font-size: 10px; color: #64748b; margin-bottom: 4px; }
    .followers-count { font-size: 18px; font-weight: 800; color: #e2e8f0; }

    /* ── Social grid ── */
    .social-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .social-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .social-platform-icon { font-size: 18px; }
    .social-platform-name { font-size: 14px; font-weight: 700; color: #e2e8f0; flex: 1; }
    .followers-badge {
      font-size: 11px; font-weight: 600; color: #0f172a;
      background: #22c55e; padding: 2px 8px; border-radius: 20px;
    }
    .social-stat-row { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .stat-label { color: #64748b; }
    .stat-val { font-weight: 700; color: #e2e8f0; }
    .social-analysis-text { font-size: 11px; color: #64748b; line-height: 1.7; margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155; }

    /* ── Website scores ── */
    .scores-row-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 4px; }
    .score-box-dark {
      background: #0f172a; border: 1px solid #334155; border-radius: 8px;
      padding: 12px 6px; text-align: center;
    }
    .score-box-val { font-size: 20px; font-weight: 900; margin-bottom: 4px; }
    .score-box-lbl { font-size: 10px; color: #64748b; font-weight: 500; }

    /* ── Analysis body ── */
    .analysis-body {
      font-size: 12px; color: #94a3b8; line-height: 1.9;
    }

    /* ── Full report ── */
    .full-report-body { font-size: 12px; color: #94a3b8; line-height: 1.9; }
    .full-report-body p { margin-bottom: 10px; }
    .full-report-body strong { color: #22c55e; font-weight: 700; }
    .full-report-body code { background: #0f172a; padding: 1px 4px; border-radius: 3px; font-family: monospace; color: #e2e8f0; }

    /* ── Footer ── */
    .footer {
      background: #1e293b;
      border-top: 1px solid #334155;
      padding: 18px 36px;
      display: flex; justify-content: space-between; align-items: center;
      font-size: 11px; color: #475569;
      margin-top: 24px;
    }
    .footer-brand { font-weight: 700; color: #94a3b8; font-size: 13px; }
    .footer-meta { text-align: left; }

    /* ── Watermark ── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 72px;
      font-weight: 900;
      color: rgba(255,255,255,0.04);
      white-space: nowrap;
      pointer-events: none;
      z-index: 9999;
      user-select: none;
      letter-spacing: 8px;
    }
    .watermark-repeat {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 9998;
      overflow: hidden;
    }
    .watermark-repeat::before,
    .watermark-repeat::after {
      content: 'سري وخاص  •  سري وخاص  •  سري وخاص';
      position: absolute;
      font-family: 'Tajawal', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: rgba(255,255,255,0.035);
      white-space: nowrap;
      letter-spacing: 4px;
      transform: rotate(-35deg);
    }
    .watermark-repeat::before { top: 20%; left: -20%; }
    .watermark-repeat::after  { top: 60%; left: -10%; }

    /* ── Print media ── */
    @media print {
      .print-bar { display: none !important; }
      .page-wrapper { margin-top: 0 !important; }
      body { background: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .watermark { color: rgba(255,255,255,0.06) !important; }
      .watermark-repeat::before, .watermark-repeat::after { color: rgba(255,255,255,0.05) !important; }
      .dark-card { break-inside: avoid; }
      .section-header { break-after: avoid; }
    }
  </style>
</head>
<body>
  <!-- Watermark -->
  <div class="watermark-repeat"></div>
  <div class="watermark">سري وخاص</div>

  <!-- Print bar -->
  <div class="print-bar">
    <h3>تقرير عميل: ${lead.companyName || "—"}</h3>
    <div class="actions">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>

  <div class="page-wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${companyLogo
          ? `<img src="${companyLogo}" alt="${companyName}" class="company-logo">`
          : `<div class="company-logo-placeholder">${companyName.charAt(0)}</div>`
        }
        <div>
          <div class="company-name">${companyName}</div>
          ${company?.reportHeaderText ? `<div class="company-sub">${company.reportHeaderText}</div>` : ""}
        </div>
      </div>
      <div class="header-right">
        <div class="report-date">📅 ${reportDate}</div>
        <div class="report-id">تقرير تحليل العميل #${lead.id || ""}</div>
        ${company?.licenseNumber ? `<div class="report-id">رقم الترخيص: ${company.licenseNumber}</div>` : ""}
      </div>
    </div>

    <!-- Client hero -->
    <div class="client-hero">
      <div>
        <div class="client-name">${lead.companyName || "—"}</div>
        <div class="client-meta">
          <span class="meta-dot"></span>
          ${lead.businessType || ""}
          ${lead.city ? `<span class="meta-dot"></span> ${lead.city}` : ""}
          ${lead.country ? ` · ${lead.country}` : ""}
        </div>
      </div>
      <div class="scores-row">
        ${scoreCircle(priorityScore, "الأولوية")}
        ${scoreCircle(qualityScore, "الجودة")}
        ${scoreCircle(seasonScore, "الموسمية")}
        <div class="urgency-badge">${urgency.text}</div>
      </div>
    </div>

    <!-- Accent bar -->
    <div class="accent-bar"></div>

    <!-- Contact strip -->
    ${(lead.verifiedPhone || lead.phone || lead.email || lead.website || lead.instagramUrl) ? `
    <div class="contact-strip">
      ${(lead.verifiedPhone || lead.phone) ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">📞</div>
          <div>
            <div class="contact-label">رقم الهاتف</div>
            <div class="contact-value">${lead.verifiedPhone || lead.phone}</div>
          </div>
        </div>` : ""}
      ${lead.email ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">📧</div>
          <div>
            <div class="contact-label">البريد الإلكتروني</div>
            <div class="contact-value">${lead.email}</div>
          </div>
        </div>` : ""}
      ${lead.website ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">🌐</div>
          <div>
            <div class="contact-label">الموقع الإلكتروني</div>
            <div class="contact-value">${lead.website}</div>
          </div>
        </div>` : ""}
      ${lead.instagramUrl ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">📸</div>
          <div>
            <div class="contact-label">إنستغرام</div>
            <div class="contact-value">${lead.instagramUrl.replace("https://www.instagram.com/", "@").replace("https://instagram.com/", "@")}</div>
          </div>
        </div>` : ""}
      ${lead.twitterUrl ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">🐦</div>
          <div>
            <div class="contact-label">تويتر / X</div>
            <div class="contact-value">${lead.twitterUrl.replace("https://twitter.com/", "@").replace("https://x.com/", "@")}</div>
          </div>
        </div>` : ""}
      ${lead.tiktokUrl ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">🎵</div>
          <div>
            <div class="contact-label">تيك توك</div>
            <div class="contact-value">${lead.tiktokUrl.replace("https://www.tiktok.com/@", "@").replace("https://tiktok.com/@", "@")}</div>
          </div>
        </div>` : ""}
      ${lead.rating ? `
        <div class="contact-item">
          <div class="contact-icon-wrap">⭐</div>
          <div>
            <div class="contact-label">التقييم</div>
            <div class="contact-value">${lead.rating} / 5 ${lead.reviewCount ? `(${lead.reviewCount})` : ""}</div>
          </div>
        </div>` : ""}
    </div>` : ""}

    <!-- Main content -->
    <div class="content">

      ${company?.reportIntroText ? `
        <div class="dark-card">
          <div class="analysis-body">${company.reportIntroText}</div>
        </div>
      ` : ""}

      <!-- Contact message -->
      ${contactMsgHtml}

      <!-- Gaps -->
      ${gapsHtml}

      <!-- Social followers summary -->
      ${socialFollowersHtml}

      <!-- Phones -->
      ${phonesHtml}

      <!-- Ice breaker -->
      ${iceBreakerHtml}

      <!-- Revenue -->
      ${revenueHtml}

      <!-- Social analysis -->
      ${socialSectionHtml}

      <!-- Website analysis -->
      ${websiteSectionHtml}

      <!-- Full report -->
      ${fullReportHtml}

      <!-- Notes -->
      ${notesHtml}

    </div>

    <!-- Footer -->
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

  const printWindow = window.open("", "_blank", "width=960,height=800");
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
