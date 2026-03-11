/**
 * PDF Report Engine - محرك توليد تقارير PDF احترافي
 * يولّد تقارير بتنسيق RTL مع لوجو مكسب وتصميم احترافي
 */

const MAKSAB_LOGO_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663029364550/rMEPivVewTdIKIbw.png";

export interface PDFReportData {
  lead: {
    id: number;
    companyName: string;
    businessType: string;
    city: string;
    country?: string;
    verifiedPhone?: string | null;
    website?: string | null;
    instagramUrl?: string | null;
    twitterUrl?: string | null;
    snapchatUrl?: string | null;
    tiktokUrl?: string | null;
    facebookUrl?: string | null;
    googleMapsUrl?: string | null;
    reviewCount?: number | null;
    stage?: string | null;
    priority?: string | null;
    notes?: string | null;
  };
  analysis?: {
    sectorMain?: string | null;
    marketingGapSummary?: string | null;
    competitivePosition?: string | null;
    primaryOpportunity?: string | null;
    secondaryOpportunity?: string | null;
    urgencyLevel?: string | null;
    recommendedServices?: Array<{ service: string; priority: string; reason: string; expectedImpact: string }> | null;
    salesEntryAngle?: string | null;
    iceBreaker?: string | null;
    sectorInsights?: string | null;
    benchmarkComparison?: string | null;
    leadPriorityScore?: number | null;
    aiConfidenceScore?: number | null;
    biggestMarketingGap?: string | null;
    revenueOpportunity?: string | null;
    suggestedSalesEntryAngle?: string | null;
  } | null;
  reportType: "internal" | "client_facing";
  generatedAt: Date;
  generatedBy?: string;
}

// ===== HTML Template Generator =====
export function generateReportHTML(data: PDFReportData): string {
  const { lead, analysis, reportType, generatedAt, generatedBy } = data;

  const isClientFacing = reportType === "client_facing";
  const dateStr = generatedAt.toLocaleDateString("ar-SA", {
    year: "numeric", month: "long", day: "numeric"
  });

  const sectorLabel = getSectorLabel(analysis?.sectorMain);
  const urgencyColor = getUrgencyColor(analysis?.urgencyLevel);
  const priorityScore = analysis?.leadPriorityScore || 0;

  // بناء قسم الخدمات الموصى بها
  const servicesHTML = buildServicesHTML(analysis?.recommendedServices);

  // بناء قسم الحضور الرقمي
  const digitalPresenceHTML = buildDigitalPresenceHTML(lead);

  // بناء قسم التحليل
  const analysisHTML = buildAnalysisHTML(analysis, isClientFacing);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير مكسب - ${lead.companyName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Arial', sans-serif;
      direction: rtl;
      background: #0a0e1a;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.6;
    }

    /* ===== HEADER ===== */
    .header {
      background: linear-gradient(135deg, #0d1b2a 0%, #1a2744 50%, #0d1b2a 100%);
      padding: 32px 40px;
      border-bottom: 2px solid #00d4ff30;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -10%;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, #00d4ff08 0%, transparent 70%);
      border-radius: 50%;
    }

    .header-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 1;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }

    .logo-text {
      font-size: 28px;
      font-weight: 900;
      color: #00d4ff;
      letter-spacing: -0.5px;
    }

    .logo-subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .report-meta {
      text-align: left;
    }

    .report-type-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
      background: ${isClientFacing ? "#00d4ff20" : "#7c3aed20"};
      color: ${isClientFacing ? "#00d4ff" : "#a78bfa"};
      border: 1px solid ${isClientFacing ? "#00d4ff40" : "#7c3aed40"};
    }

    .report-date {
      font-size: 11px;
      color: #64748b;
    }

    /* ===== WATERMARK ===== */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80px;
      font-weight: 900;
      color: #00d4ff05;
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
    }

    /* ===== CONTENT ===== */
    .content {
      padding: 32px 40px;
      position: relative;
      z-index: 1;
    }

    /* ===== LEAD HEADER CARD ===== */
    .lead-header-card {
      background: linear-gradient(135deg, #111827 0%, #1e293b 100%);
      border: 1px solid #1e3a5f;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }

    .lead-info h1 {
      font-size: 22px;
      font-weight: 900;
      color: #f1f5f9;
      margin-bottom: 6px;
    }

    .lead-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-sector {
      background: #00d4ff15;
      color: #00d4ff;
      border: 1px solid #00d4ff30;
    }

    .badge-city {
      background: #10b98115;
      color: #10b981;
      border: 1px solid #10b98130;
    }

    .badge-type {
      background: #7c3aed15;
      color: #a78bfa;
      border: 1px solid #7c3aed30;
    }

    /* Priority Score */
    .priority-score-card {
      text-align: center;
      background: ${getPriorityBg(priorityScore)};
      border: 1px solid ${getPriorityBorder(priorityScore)};
      border-radius: 12px;
      padding: 16px 20px;
      min-width: 120px;
    }

    .priority-score-number {
      font-size: 42px;
      font-weight: 900;
      color: ${getPriorityColor(priorityScore)};
      line-height: 1;
    }

    .priority-score-label {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }

    /* ===== SECTION CARDS ===== */
    .section-card {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #00d4ff;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: '';
      width: 3px;
      height: 16px;
      background: #00d4ff;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* ===== GRID ===== */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 10px;
    }

    .info-label {
      font-size: 11px;
      color: #64748b;
      min-width: 100px;
      flex-shrink: 0;
    }

    .info-value {
      font-size: 12px;
      color: #cbd5e1;
      word-break: break-all;
    }

    /* ===== DIGITAL PRESENCE ===== */
    .presence-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .presence-item {
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid;
    }

    .presence-item.active {
      background: #10b98110;
      border-color: #10b98130;
    }

    .presence-item.inactive {
      background: #1e293b;
      border-color: #334155;
    }

    .presence-icon {
      font-size: 18px;
      margin-bottom: 4px;
    }

    .presence-name {
      font-size: 10px;
      color: #94a3b8;
    }

    .presence-status {
      font-size: 10px;
      font-weight: 700;
    }

    .presence-item.active .presence-status { color: #10b981; }
    .presence-item.inactive .presence-status { color: #475569; }

    /* ===== ANALYSIS SECTIONS ===== */
    .analysis-item {
      margin-bottom: 14px;
    }

    .analysis-item-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .analysis-item-value {
      font-size: 13px;
      color: #e2e8f0;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      padding: 10px 14px;
      line-height: 1.7;
    }

    /* ===== URGENCY BADGE ===== */
    .urgency-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      background: ${urgencyColor.bg};
      color: ${urgencyColor.text};
      border: 1px solid ${urgencyColor.border};
    }

    /* ===== SERVICES ===== */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .service-card {
      border-radius: 10px;
      padding: 14px;
      border: 1px solid;
    }

    .service-card.high {
      background: #ef444410;
      border-color: #ef444430;
    }

    .service-card.medium {
      background: #f59e0b10;
      border-color: #f59e0b30;
    }

    .service-card.low {
      background: #10b98110;
      border-color: #10b98130;
    }

    .service-name {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
    }

    .service-priority {
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .service-card.high .service-priority { color: #ef4444; }
    .service-card.medium .service-priority { color: #f59e0b; }
    .service-card.low .service-priority { color: #10b981; }

    .service-reason {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }

    .service-impact {
      font-size: 11px;
      color: #64748b;
      margin-top: 6px;
      font-style: italic;
    }

    /* ===== ICE BREAKER ===== */
    .ice-breaker-box {
      background: linear-gradient(135deg, #00d4ff08, #7c3aed08);
      border: 1px solid #00d4ff20;
      border-radius: 12px;
      padding: 16px 20px;
      position: relative;
    }

    .ice-breaker-box::before {
      content: '"';
      position: absolute;
      top: 8px;
      right: 16px;
      font-size: 40px;
      color: #00d4ff20;
      font-family: serif;
      line-height: 1;
    }

    .ice-breaker-text {
      font-size: 14px;
      color: #cbd5e1;
      line-height: 1.8;
      font-style: italic;
    }

    /* ===== FOOTER ===== */
    .footer {
      background: #0d1b2a;
      border-top: 1px solid #1e3a5f;
      padding: 20px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 32px;
    }

    .footer-brand {
      font-size: 12px;
      color: #64748b;
    }

    .footer-brand strong {
      color: #00d4ff;
    }

    .footer-services {
      font-size: 11px;
      color: #475569;
    }

    .footer-page {
      font-size: 11px;
      color: #475569;
    }

    /* ===== CONFIDENCE METER ===== */
    .confidence-meter {
      margin-top: 8px;
    }

    .confidence-bar {
      height: 6px;
      background: #1e293b;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 4px;
    }

    .confidence-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      width: ${analysis?.aiConfidenceScore || 0}%;
    }

    .confidence-label {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
    }

    @media print {
      body { background: white; }
      .watermark { display: none; }
    }
  </style>
</head>
<body>

  <!-- Watermark -->
  <div class="watermark">مكسب</div>

  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <div class="logo-section">
        <img src="${MAKSAB_LOGO_URL}" alt="مكسب" class="logo-img" onerror="this.style.display='none'" />
        <div>
          <div class="logo-text">مكسب</div>
          <div class="logo-subtitle">منظومة الذكاء البيعي والتسويقي</div>
        </div>
      </div>
      <div class="report-meta">
        <div class="report-type-badge">${isClientFacing ? "تقرير للعميل" : "تقرير داخلي"}</div>
        <div class="report-date">${dateStr}</div>
        ${generatedBy ? `<div class="report-date">أعدّه: ${generatedBy}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="content">

    <!-- Lead Header -->
    <div class="lead-header-card">
      <div class="lead-info">
        <h1>${lead.companyName}</h1>
        <div class="lead-badges">
          <span class="badge badge-type">${lead.businessType}</span>
          <span class="badge badge-city">📍 ${lead.city}${lead.country ? ` · ${lead.country}` : ""}</span>
          ${sectorLabel ? `<span class="badge badge-sector">⚡ ${sectorLabel}</span>` : ""}
          ${analysis?.urgencyLevel ? `<span class="urgency-badge">${getUrgencyLabel(analysis.urgencyLevel)}</span>` : ""}
        </div>
      </div>
      ${priorityScore > 0 ? `
      <div class="priority-score-card">
        <div class="priority-score-number">${priorityScore}</div>
        <div class="priority-score-label">أولوية البيع / 10</div>
      </div>
      ` : ""}
    </div>

    <div class="grid-2">
      <!-- Contact Info -->
      <div class="section-card">
        <div class="section-title">معلومات التواصل</div>
        ${lead.verifiedPhone ? `<div class="info-row"><span class="info-label">الهاتف</span><span class="info-value">${lead.verifiedPhone}</span></div>` : ""}
        ${lead.website ? `<div class="info-row"><span class="info-label">الموقع</span><span class="info-value">${lead.website}</span></div>` : ""}
        ${lead.googleMapsUrl ? `<div class="info-row"><span class="info-label">Google Maps</span><span class="info-value">متاح</span></div>` : ""}
        ${lead.reviewCount ? `<div class="info-row"><span class="info-label">التقييمات</span><span class="info-value">${lead.reviewCount} تقييم</span></div>` : ""}
        ${!lead.verifiedPhone && !lead.website ? `<div style="color: #475569; font-size: 12px;">لا توجد معلومات تواصل مسجّلة</div>` : ""}
      </div>

      <!-- Digital Presence -->
      <div class="section-card">
        <div class="section-title">الحضور الرقمي</div>
        <div class="presence-grid">
          ${buildPresenceItem("🌐", "موقع", !!lead.website)}
          ${buildPresenceItem("📸", "Instagram", !!lead.instagramUrl)}
          ${buildPresenceItem("🐦", "Twitter", !!lead.twitterUrl)}
          ${buildPresenceItem("👻", "Snapchat", !!lead.snapchatUrl)}
          ${buildPresenceItem("🎵", "TikTok", !!lead.tiktokUrl)}
          ${buildPresenceItem("📘", "Facebook", !!lead.facebookUrl)}
          ${buildPresenceItem("🗺️", "Maps", !!lead.googleMapsUrl)}
        </div>
      </div>
    </div>

    ${analysisHTML}

    ${servicesHTML}

    ${analysis?.iceBreaker ? `
    <!-- Ice Breaker -->
    <div class="section-card">
      <div class="section-title">جملة الافتتاح المقترحة</div>
      <div class="ice-breaker-box">
        <div class="ice-breaker-text">${analysis.iceBreaker}</div>
      </div>
    </div>
    ` : ""}

    ${analysis?.aiConfidenceScore ? `
    <!-- Confidence Score -->
    <div class="section-card">
      <div class="section-title">مستوى الثقة في التحليل</div>
      <div class="confidence-meter">
        <div class="confidence-label">
          <span>ثقة التحليل الذكي</span>
          <span>${analysis.aiConfidenceScore}%</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill"></div>
        </div>
      </div>
    </div>
    ` : ""}

    ${lead.notes && !isClientFacing ? `
    <!-- Notes (Internal Only) -->
    <div class="section-card">
      <div class="section-title">ملاحظات داخلية</div>
      <div style="font-size: 12px; color: #94a3b8; line-height: 1.7;">${lead.notes}</div>
    </div>
    ` : ""}

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">
      أُعدّ بواسطة <strong>نظام مكسب الذكي</strong>
    </div>
    <div class="footer-services">
      SEO · Ads · Social Media · Design
    </div>
    <div class="footer-page">
      تقرير رقم: #${lead.id} · ${dateStr}
    </div>
  </div>

</body>
</html>`;
}

// ===== Helper Functions =====

function buildAnalysisHTML(analysis: PDFReportData["analysis"], isClientFacing: boolean): string {
  if (!analysis) return "";

  const items: string[] = [];

  if (analysis.marketingGapSummary) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">الثغرة التسويقية الرئيسية</div>
        <div class="analysis-item-value">${analysis.marketingGapSummary}</div>
      </div>
    `);
  }

  if (analysis.primaryOpportunity) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">الفرصة الأولى</div>
        <div class="analysis-item-value">${analysis.primaryOpportunity}</div>
      </div>
    `);
  }

  if (analysis.secondaryOpportunity) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">الفرصة الثانية</div>
        <div class="analysis-item-value">${analysis.secondaryOpportunity}</div>
      </div>
    `);
  }

  if (analysis.competitivePosition) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">الموقع التنافسي</div>
        <div class="analysis-item-value">${analysis.competitivePosition}</div>
      </div>
    `);
  }

  if (!isClientFacing && analysis.salesEntryAngle) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">زاوية الدخول البيعية</div>
        <div class="analysis-item-value">${analysis.salesEntryAngle}</div>
      </div>
    `);
  }

  if (analysis.sectorInsights) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">رؤى قطاعية</div>
        <div class="analysis-item-value">${analysis.sectorInsights}</div>
      </div>
    `);
  }

  if (analysis.benchmarkComparison) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">مقارنة بمعيار السوق</div>
        <div class="analysis-item-value">${analysis.benchmarkComparison}</div>
      </div>
    `);
  }

  // Fallback للحقول القديمة
  if (!analysis.marketingGapSummary && analysis.biggestMarketingGap) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">أكبر ثغرة تسويقية</div>
        <div class="analysis-item-value">${analysis.biggestMarketingGap}</div>
      </div>
    `);
  }

  if (!analysis.primaryOpportunity && analysis.revenueOpportunity) {
    items.push(`
      <div class="analysis-item">
        <div class="analysis-item-label">فرصة الإيراد</div>
        <div class="analysis-item-value">${analysis.revenueOpportunity}</div>
      </div>
    `);
  }

  if (items.length === 0) return "";

  return `
    <div class="section-card">
      <div class="section-title">التحليل الذكي</div>
      ${items.join("")}
    </div>
  `;
}

function buildServicesHTML(services: PDFReportData["analysis"] extends null ? null : any): string {
  if (!services || !Array.isArray(services) || services.length === 0) return "";

  const serviceCards = services.map((s: any) => `
    <div class="service-card ${s.priority || "medium"}">
      <div class="service-name">${getServiceLabel(s.service)}</div>
      <div class="service-priority">${getPriorityLabel(s.priority)} الأولوية</div>
      <div class="service-reason">${s.reason || ""}</div>
      ${s.expectedImpact ? `<div class="service-impact">التأثير المتوقع: ${s.expectedImpact}</div>` : ""}
    </div>
  `).join("");

  return `
    <div class="section-card">
      <div class="section-title">الخدمات الموصى بها</div>
      <div class="services-grid">${serviceCards}</div>
    </div>
  `;
}

function buildDigitalPresenceHTML(lead: PDFReportData["lead"]): string {
  return "";
}

function buildPresenceItem(icon: string, name: string, active: boolean): string {
  return `
    <div class="presence-item ${active ? "active" : "inactive"}">
      <div class="presence-icon">${icon}</div>
      <div class="presence-name">${name}</div>
      <div class="presence-status">${active ? "✓ موجود" : "✗ غائب"}</div>
    </div>
  `;
}

function getSectorLabel(sector?: string | null): string {
  const labels: Record<string, string> = {
    restaurants: "مطاعم وكافيهات",
    medical: "طبي وصحي",
    ecommerce: "تجارة إلكترونية",
    digital_products: "منتجات رقمية",
    general: "عام",
  };
  return sector ? (labels[sector] || sector) : "";
}

function getUrgencyColor(urgency?: string | null) {
  if (urgency === "high") return { bg: "#ef444415", text: "#ef4444", border: "#ef444430" };
  if (urgency === "medium") return { bg: "#f59e0b15", text: "#f59e0b", border: "#f59e0b30" };
  return { bg: "#10b98115", text: "#10b981", border: "#10b98130" };
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === "high") return "🔴 إلحاح عالٍ";
  if (urgency === "medium") return "🟡 إلحاح متوسط";
  return "🟢 إلحاح منخفض";
}

function getPriorityColor(score: number): string {
  if (score >= 8) return "#ef4444";
  if (score >= 6) return "#f59e0b";
  return "#10b981";
}

function getPriorityBg(score: number): string {
  if (score >= 8) return "#ef444410";
  if (score >= 6) return "#f59e0b10";
  return "#10b98110";
}

function getPriorityBorder(score: number): string {
  if (score >= 8) return "#ef444430";
  if (score >= 6) return "#f59e0b30";
  return "#10b98130";
}

function getServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    "SEO": "تحسين محركات البحث (SEO)",
    "Ads": "الإعلانات المدفوعة (Ads)",
    "Social Media": "إدارة السوشيال ميديا",
    "Design": "التصميم والهوية البصرية",
  };
  return labels[service] || service;
}

function getPriorityLabel(priority: string): string {
  if (priority === "high") return "عالية";
  if (priority === "medium") return "متوسطة";
  return "منخفضة";
}
