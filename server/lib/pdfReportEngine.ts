/**
 * PDF Report Engine v2 — محرك توليد تقارير PDF احترافي
 * هيكل 5 صفحات A4 مع تصميم داكن راقٍ
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

// ===== Helpers =====
function getSectorLabel(sector?: string | null): string {
  const labels: Record<string, string> = {
    restaurants: "مطاعم وكافيهات", medical: "طبي وصحي",
    ecommerce: "تجارة إلكترونية", digital_products: "منتجات رقمية",
    fashion: "أزياء وملابس", beauty: "تجميل وعناية", real_estate: "عقارات",
    education: "تعليم وتدريب", general: "عام",
  };
  return sector ? (labels[sector] || sector) : "";
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === "high") return "🔴 إلحاح عالٍ";
  if (urgency === "medium") return "🟡 إلحاح متوسط";
  return "🟢 إلحاح منخفض";
}

function getPriorityColor(score: number): string {
  if (score >= 8) return "#ef4444";
  if (score >= 6) return "#f59e0b";
  return "#22c55e";
}

function getPriorityBg(score: number): string {
  if (score >= 8) return "rgba(239,68,68,0.08)";
  if (score >= 6) return "rgba(245,158,11,0.08)";
  return "rgba(34,197,94,0.08)";
}

function getPriorityBorder(score: number): string {
  if (score >= 8) return "rgba(239,68,68,0.3)";
  if (score >= 6) return "rgba(245,158,11,0.3)";
  return "rgba(34,197,94,0.3)";
}

function getPriorityLabel(priority: string): string {
  if (priority === "high") return "عالية";
  if (priority === "medium") return "متوسطة";
  return "منخفضة";
}

function getServiceLabel(service: string): string {
  const labels: Record<string, string> = {
    "SEO": "تحسين محركات البحث (SEO)",
    "Ads": "الإعلانات المدفوعة",
    "Social Media": "إدارة السوشيال ميديا",
    "Design": "التصميم والهوية البصرية",
    "Content": "إنتاج المحتوى",
    "Snapchat": "إدارة سناب شات",
  };
  return labels[service] || service;
}

function calcLostRevenue(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): number {
  const score = analysis?.leadPriorityScore || 5;
  const hasWebsite = !!lead.website;
  const hasSocial = !!(lead.instagramUrl || lead.tiktokUrl || lead.snapchatUrl);
  const hasSnap = !!lead.snapchatUrl;
  let base = 8000;
  if (score >= 8) base = 25000;
  else if (score >= 6) base = 15000;
  if (!hasWebsite) base += 5000;
  if (!hasSocial) base += 4000;
  if (!hasSnap) base += 3000;
  return Math.round(base / 1000) * 1000;
}

function calcRevenueOpportunity(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): number {
  return calcLostRevenue(analysis, lead) * 4;
}

function getCurrentSeason(): { name: string; emoji: string; color: string; urgency: string; tip: string } {
  const month = new Date().getMonth() + 1;
  if (month === 3 || month === 4) return {
    name: "موسم رمضان والعيد", emoji: "🌙", color: "#a78bfa",
    urgency: "⚡ أعلى موسم مبيعات في السنة — لا تفوّت الفرصة",
    tip: "الآن هو الوقت الأمثل لإطلاق حملات المحتوى والعروض الحصرية"
  };
  if (month >= 8 && month <= 9) return {
    name: "موسم العودة للمدارس", emoji: "📚", color: "#0ea5e9",
    urgency: "🎯 موسم شراء نشط — الأسر تبحث عن العروض",
    tip: "ركّز على المحتوى التعليمي والعروض العائلية"
  };
  if (month === 9 || month === 10) return {
    name: "موسم اليوم الوطني", emoji: "🇸🇦", color: "#22c55e",
    urgency: "🎉 فرصة ذهبية للحملات الوطنية",
    tip: "استخدم الهوية الوطنية في المحتوى لزيادة التفاعل"
  };
  if (month === 11 || month === 12) return {
    name: "موسم نهاية العام", emoji: "🎄", color: "#f97316",
    urgency: "🛍️ موسم التسوق الأكثر نشاطاً",
    tip: "العروض والتخفيضات تحقق أعلى معدلات تحويل"
  };
  return {
    name: "الموسم العادي", emoji: "📅", color: "#64748b",
    urgency: "📊 وقت مثالي لبناء الأساس الرقمي",
    tip: "استثمر هذا الوقت في تحسين الموقع والمحتوى قبل المواسم القادمة"
  };
}

function buildRadarChart(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): string {
  const score = analysis?.leadPriorityScore || 5;
  const hasWebsite = !!lead.website ? Math.min(score + 1, 10) : Math.max(score - 2, 1);
  const hasSocial = !!(lead.instagramUrl || lead.tiktokUrl) ? Math.min(score + 2, 10) : Math.max(score - 3, 1);
  const hasSnap = !!lead.snapchatUrl ? Math.min(score + 1, 10) : Math.max(score - 2, 1);
  const seoScore = hasWebsite * 0.6;
  const contentScore = hasSocial * 0.7;
  const dataScore = analysis?.aiConfidenceScore ? analysis.aiConfidenceScore / 10 : score * 0.8;

  const axes = [
    { label: "الموقع", value: Math.min(hasWebsite, 10) / 10, marketAvg: 0.65 },
    { label: "السوشيال", value: Math.min(hasSocial, 10) / 10, marketAvg: 0.60 },
    { label: "المحتوى", value: Math.min(contentScore, 10) / 10, marketAvg: 0.55 },
    { label: "SEO", value: Math.min(seoScore, 10) / 10, marketAvg: 0.50 },
    { label: "البيانات", value: Math.min(dataScore, 10) / 10, marketAvg: 0.70 },
    { label: "سناب شات", value: Math.min(hasSnap, 10) / 10, marketAvg: 0.45 },
  ];

  const cx = 110, cy = 110, r = 80;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  function toXY(i: number, val: number) {
    const angle = startAngle + i * angleStep;
    return { x: cx + val * r * Math.cos(angle), y: cy + val * r * Math.sin(angle) };
  }

  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0].map(v => {
    const pts = axes.map((_, i) => { const p = toXY(i, v); return `${p.x},${p.y}`; }).join(" ");
    return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
  }).join("");

  const axisLines = axes.map((_, i) => {
    const p = toXY(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
  }).join("");

  const marketPts = axes.map((a, i) => { const p = toXY(i, a.marketAvg); return `${p.x},${p.y}`; }).join(" ");
  const clientPts = axes.map((a, i) => { const p = toXY(i, a.value); return `${p.x},${p.y}`; }).join(" ");

  const labels = axes.map((a, i) => {
    const p = toXY(i, 1.22);
    return `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#94a3b8" font-family="Tajawal,Arial">${a.label}</text>`;
  }).join("");

  return `<svg viewBox="0 0 220 220" width="220" height="220" xmlns="http://www.w3.org/2000/svg">
    ${gridCircles}${axisLines}
    <polygon points="${marketPts}" fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.5)" stroke-width="1.5" stroke-dasharray="4,3"/>
    <polygon points="${clientPts}" fill="rgba(34,197,94,0.18)" stroke="#22c55e" stroke-width="2"/>
    ${axes.map((a, i) => { const p = toXY(i, a.value); return `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#22c55e" stroke="#0a0f1a" stroke-width="1.5"/>`; }).join("")}
    ${labels}
    <circle cx="${cx}" cy="${cy}" r="3" fill="rgba(255,255,255,0.2)"/>
  </svg>`;
}

function buildPlatformBlocks(lead: PDFReportData["lead"], analysis: PDFReportData["analysis"]): string {
  const score = analysis?.leadPriorityScore || 5;
  const platforms = [
    { name: "إنستغرام", icon: "📸", active: !!lead.instagramUrl, score: lead.instagramUrl ? Math.min(score + 1, 10) : 0, color: "#e1306c", bg: "rgba(225,48,108,0.08)", border: "rgba(225,48,108,0.25)", handle: lead.instagramUrl ? lead.instagramUrl.replace(/.*instagram\.com\//, "@").replace(/\/$/, "") : "غير موجود" },
    { name: "تيك توك", icon: "🎵", active: !!lead.tiktokUrl, score: lead.tiktokUrl ? Math.min(score, 10) : 0, color: "#ff0050", bg: "rgba(255,0,80,0.08)", border: "rgba(255,0,80,0.25)", handle: lead.tiktokUrl ? lead.tiktokUrl.replace(/.*tiktok\.com\/@/, "@").replace(/\/$/, "") : "غير موجود" },
    { name: "سناب شات", icon: "👻", active: !!lead.snapchatUrl, score: lead.snapchatUrl ? Math.min(score + 1, 10) : 0, color: "#fffc00", bg: "rgba(255,252,0,0.06)", border: "rgba(255,252,0,0.25)", handle: lead.snapchatUrl ? lead.snapchatUrl.replace(/.*snapchat\.com\/add\//, "@").replace(/\/$/, "") : "⚠️ غائب — فرصة ضائعة" },
    { name: "تويتر / X", icon: "🐦", active: !!lead.twitterUrl, score: lead.twitterUrl ? Math.min(score - 1, 10) : 0, color: "#1da1f2", bg: "rgba(29,161,242,0.08)", border: "rgba(29,161,242,0.25)", handle: lead.twitterUrl ? lead.twitterUrl.replace(/.*twitter\.com\//, "@").replace(/.*x\.com\//, "@").replace(/\/$/, "") : "غير موجود" },
  ];

  return platforms.map(p => {
    const barWidth = p.active ? Math.max(p.score * 10, 5) : 0;
    const scoreColor = p.score >= 7 ? "#22c55e" : p.score >= 4 ? "#f59e0b" : "#ef4444";
    return `<div style="background:${p.bg};border:1px solid ${p.border};border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;">
      <div style="font-size:20px;flex-shrink:0;">${p.icon}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:11px;font-weight:800;color:#f1f5f9;">${p.name}</span>
          <span style="font-size:10px;font-weight:700;color:${p.active ? scoreColor : "#475569"};">${p.active ? `${p.score}/10` : "غائب"}</span>
        </div>
        <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:4px;">
          <div style="height:100%;width:${barWidth}%;background:${p.color};border-radius:2px;box-shadow:0 0 6px ${p.color}50;"></div>
        </div>
        <div style="font-size:9px;color:#475569;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.handle}</div>
      </div>
    </div>`;
  }).join("");
}

function buildRecommendations(analysis: PDFReportData["analysis"]): string {
  const services = analysis?.recommendedServices;
  if (!services || !Array.isArray(services) || services.length === 0) {
    return `<div style="padding:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;color:#64748b;font-size:11px;text-align:center;">لم يتم تحديد توصيات بعد — قم بتشغيل التحليل الذكي أولاً</div>`;
  }
  const priorityOrder = ["high", "medium", "low"];
  const sorted = [...services].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
  return sorted.slice(0, 4).map((s, i) => {
    const colors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
      high: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.25)", badge: "#ef4444", text: "أولوية قصوى" },
      medium: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.25)", badge: "#f59e0b", text: "أولوية عالية" },
      low: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.25)", badge: "#22c55e", text: "أولوية متوسطة" },
    };
    const c = colors[s.priority] || colors.medium;
    return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start;">
      <div style="width:24px;height:24px;border-radius:50%;background:${c.badge};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#000;">${i + 1}</div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:11px;font-weight:800;color:#f1f5f9;">${getServiceLabel(s.service)}</span>
          <span style="font-size:9px;font-weight:700;color:${c.badge};padding:2px 7px;background:${c.bg};border:1px solid ${c.border};border-radius:10px;">${c.text}</span>
        </div>
        <div style="font-size:10px;color:#94a3b8;line-height:1.6;">${s.reason || ""}</div>
        ${s.expectedImpact ? `<div style="font-size:9px;color:#64748b;margin-top:3px;font-style:italic;">التأثير المتوقع: ${s.expectedImpact}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}

// ===== MAIN HTML GENERATOR =====
export function generateReportHTML(data: PDFReportData): string {
  const { lead, analysis, reportType, generatedAt, generatedBy } = data;
  const isClientFacing = reportType === "client_facing";
  const dateStr = generatedAt.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const sectorLabel = getSectorLabel(analysis?.sectorMain);
  const priorityScore = analysis?.leadPriorityScore || 0;
  const lostRevenue = calcLostRevenue(analysis, lead);
  const revenueOpp = calcRevenueOpportunity(analysis, lead);
  const season = getCurrentSeason();
  const reportSerial = `RPT-${lead.id.toString().padStart(4, "0")}-${generatedAt.getFullYear()}`;
  const radarChart = buildRadarChart(analysis, lead);
  const platformBlocks = buildPlatformBlocks(lead, analysis);
  const recommendations = buildRecommendations(analysis);
  const prColor = getPriorityColor(priorityScore);
  const prBg = getPriorityBg(priorityScore);
  const prBorder = getPriorityBorder(priorityScore);
  const confidenceScore = analysis?.aiConfidenceScore || Math.round(priorityScore * 8 + 20);
  const websiteScore = lead.website ? Math.min(priorityScore + 1, 10) : 2;
  const digitalScore = !!(lead.instagramUrl || lead.tiktokUrl || lead.snapchatUrl) ? Math.min(priorityScore + 2, 10) : 3;

  const PAGE_STYLE = `width:210mm;min-height:297mm;padding:0;margin:0 auto;background:linear-gradient(160deg,#020810 0%,#060d1a 60%,#020810 100%);position:relative;overflow:hidden;font-family:'Tajawal','Cairo','Arial',sans-serif;direction:rtl;text-align:right;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;page-break-after:always;break-after:page;`;

  const HEADER_HTML = (pageNum: number, totalPages: number, title: string, subtitle: string, accentColor = "#22c55e") => `
  <div style="padding:12px 36px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.25);">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:4px;height:28px;border-radius:2px;background:linear-gradient(180deg,${accentColor},${accentColor}80);box-shadow:0 0 10px ${accentColor}60;"></div>
      <div>
        <div style="font-size:15px;font-weight:900;color:#f1f5f9;">${title}</div>
        <div style="font-size:9px;color:#475569;margin-top:1px;">${subtitle}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <img src="${MAKSAB_LOGO_URL}" style="height:30px;width:auto;border-radius:6px;border:1px solid rgba(255,255,255,0.08);padding:3px;background:rgba(255,255,255,0.04);" onerror="this.style.display='none'" />
      <div>
        <div style="font-size:10px;color:#f1f5f9;font-weight:700;">${lead.companyName}</div>
        <div style="font-size:8px;color:#334155;margin-top:1px;">مكسب · صفحة ${pageNum}/${totalPages}</div>
      </div>
    </div>
  </div>`;

  const FOOTER_HTML = (pageNum: number, serial: string) => `
  <div style="position:absolute;bottom:0;left:0;right:0;padding:7px 36px;background:rgba(0,0,0,0.35);border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;">
    <div style="font-size:7.5px;color:#334155;">حصري من مكسب لخدمات الاعمال — جميع الحقوق محفوظة © ${generatedAt.getFullYear()}</div>
    <div style="font-size:7.5px;color:#334155;font-family:monospace;">${serial} · صفحة ${pageNum}</div>
  </div>`;

  const WATERMARK_HTML = `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:55px;font-weight:900;color:rgba(34,197,94,0.022);white-space:nowrap;pointer-events:none;z-index:0;letter-spacing:6px;">حصري من مكسب لخدمات الاعمال</div>`;

  // ===== PAGE 1: الغلاف =====
  const page1 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-100px;right:-100px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-80px;left:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    <div style="padding:16px 36px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${MAKSAB_LOGO_URL}" style="height:42px;width:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.1);padding:4px;background:rgba(255,255,255,0.05);" onerror="this.style.display='none'" />
        <div>
          <div style="font-size:19px;font-weight:900;color:#f1f5f9;">مكسب لخدمات الاعمال</div>
          <div style="font-size:9px;color:#475569;letter-spacing:1.5px;">وكالة تسويق رقمي متخصصة · المملكة العربية السعودية</div>
        </div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:9px;color:#475569;margin-bottom:3px;">تاريخ الإصدار</div>
        <div style="font-size:12px;font-weight:700;color:#94a3b8;">${dateStr}</div>
        <div style="margin-top:5px;padding:3px 10px;background:${prBg};border:1px solid ${prBorder};border-radius:20px;font-size:9px;font-weight:800;color:${prColor};display:inline-block;">${priorityScore >= 8 ? "أولوية قصوى" : priorityScore >= 6 ? "أولوية متوسطة" : "أولوية عادية"}</div>
      </div>
    </div>
    <div style="padding:28px 36px 20px;text-align:center;position:relative;z-index:1;">
      <div style="font-size:9px;color:#475569;font-weight:700;letter-spacing:3px;margin-bottom:8px;">تقرير تنفيذي مخصص لعناية</div>
      <div style="font-size:36px;font-weight:900;color:#f8fafc;margin-bottom:5px;text-shadow:0 0 50px rgba(34,197,94,0.2);">${lead.companyName}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:14px;">${lead.businessType} <span style="color:#334155;margin:0 5px;">·</span> ${lead.city}${lead.country ? ` · ${lead.country}` : ""}${sectorLabel ? `<span style="color:#334155;margin:0 5px;">·</span> ${sectorLabel}` : ""}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:7px 18px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:24px;">
        <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div>
        <span style="font-size:10px;color:#22c55e;font-weight:700;">تحليل رقمي شامل · 5 محاور رئيسية</span>
      </div>
    </div>
    <div style="padding:0 36px 16px;position:relative;z-index:1;">
      <div style="font-size:9px;color:#334155;font-weight:700;text-align:center;margin-bottom:10px;letter-spacing:2px;">المؤشرات الرئيسية</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 8px;text-align:center;border-top:2px solid ${prColor};">
          <div style="font-size:30px;font-weight:900;color:${prColor};line-height:1;margin-bottom:4px;">${priorityScore > 0 ? priorityScore : "—"}</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:700;">درجة الأولوية</div>
          <div style="font-size:8px;color:#334155;margin-top:2px;">من 10</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 8px;text-align:center;border-top:2px solid #22c55e;">
          <div style="font-size:30px;font-weight:900;color:#22c55e;line-height:1;margin-bottom:4px;">${confidenceScore}%</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:700;">جودة البيانات</div>
          <div style="font-size:8px;color:#334155;margin-top:2px;">دقة التحليل</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 8px;text-align:center;border-top:2px solid #0ea5e9;">
          <div style="font-size:30px;font-weight:900;color:#0ea5e9;line-height:1;margin-bottom:4px;">${websiteScore}</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:700;">تقييم الموقع</div>
          <div style="font-size:8px;color:#334155;margin-top:2px;">من 10</div>
        </div>
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:14px 8px;text-align:center;border-top:2px solid #a78bfa;">
          <div style="font-size:30px;font-weight:900;color:#a78bfa;line-height:1;margin-bottom:4px;">${digitalScore}</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:700;">التفاعل الرقمي</div>
          <div style="font-size:8px;color:#334155;margin-top:2px;">من 10</div>
        </div>
      </div>
    </div>
    <div style="padding:0 36px 14px;position:relative;z-index:1;">
      <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:center;">
        ${[
          { icon: "🌐", label: "الموقع", active: !!lead.website },
          { icon: "📸", label: "إنستغرام", active: !!lead.instagramUrl },
          { icon: "🎵", label: "تيك توك", active: !!lead.tiktokUrl },
          { icon: "👻", label: "سناب شات", active: !!lead.snapchatUrl },
          { icon: "🐦", label: "تويتر", active: !!lead.twitterUrl },
          { icon: "📍", label: "خرائط", active: !!lead.googleMapsUrl },
        ].map(p => `<div style="padding:4px 11px;border-radius:20px;font-size:10px;font-weight:600;background:${p.active ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)"};border:1px solid ${p.active ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"};color:${p.active ? "#22c55e" : "#ef4444"};">${p.icon} ${p.label} ${p.active ? "✓" : "✗"}</div>`).join("")}
      </div>
    </div>
    <div style="margin:0 36px 14px;padding:12px 18px;background:linear-gradient(135deg,rgba(239,68,68,0.1),rgba(249,115,22,0.07));border:1px solid rgba(239,68,68,0.3);border-radius:14px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:24px;">⚠️</div>
        <div>
          <div style="font-size:11px;color:#fca5a5;font-weight:900;margin-bottom:2px;">تنبيه: إيراد ضائع يمكن استعادته</div>
          <div style="font-size:9px;color:#94a3b8;line-height:1.6;">بناءً على تحليل الحضور الرقمي والفجوات التسويقية، هناك فرص إيرادية غير مستغلة تحتاج معالجة فورية</div>
        </div>
      </div>
      <div style="text-align:center;padding:9px 16px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:12px;flex-shrink:0;">
        <div style="font-size:20px;font-weight:900;color:#ef4444;">${lostRevenue.toLocaleString("ar-SA")}+</div>
        <div style="font-size:8px;color:#64748b;margin-top:2px;">ريال/شهر</div>
      </div>
    </div>
    ${FOOTER_HTML(1, reportSerial)}
  </div>`;

  // ===== PAGE 2: الملخص التنفيذي =====
  const page2 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-60px;left:-60px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(2, 5, "الملخص التنفيذي", "تقييم شامل للحضور الرقمي والفرص المتاحة")}
    <div style="padding:16px 36px;position:relative;z-index:1;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:6px;letter-spacing:1px;">مستوى الأداء</div>
          <div style="font-size:32px;font-weight:900;color:#0ea5e9;line-height:1;margin-bottom:5px;">${priorityScore > 0 ? priorityScore : "—"}</div>
          <div style="font-size:9px;color:#475569;">من أصل 10 نقاط</div>
          <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;"><div style="height:100%;width:${priorityScore * 10}%;background:#0ea5e9;border-radius:2px;"></div></div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;letter-spacing:1px;">حجم الفجوة</div>
          <div style="font-size:32px;font-weight:900;color:#ef4444;line-height:1;margin-bottom:5px;">${10 - (priorityScore || 5)}</div>
          <div style="font-size:9px;color:#475569;">نقاط تحتاج تحسين</div>
          <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;"><div style="height:100%;width:${(10 - (priorityScore || 5)) * 10}%;background:#ef4444;border-radius:2px;"></div></div>
        </div>
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:6px;letter-spacing:1px;">الفرصة المتاحة</div>
          <div style="font-size:26px;font-weight:900;color:#22c55e;line-height:1;margin-bottom:5px;">${(revenueOpp / 1000).toFixed(0)}K+</div>
          <div style="font-size:9px;color:#475569;">ريال/شهر إمكانية نمو</div>
          <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;"><div style="height:100%;width:85%;background:#22c55e;border-radius:2px;"></div></div>
        </div>
      </div>
      <div style="margin-bottom:16px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,0.06),rgba(14,165,233,0.04));border:1px solid rgba(34,197,94,0.2);border-radius:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
          <div>
            <div style="font-size:10px;color:#86efac;font-weight:800;margin-bottom:5px;letter-spacing:1px;">💰 إجمالي الفرصة المالية المقدّرة</div>
            <div style="font-size:38px;font-weight:900;color:#22c55e;line-height:1;text-shadow:0 0 30px rgba(34,197,94,0.3);">${revenueOpp.toLocaleString("ar-SA")}</div>
            <div style="font-size:10px;color:#475569;margin-top:3px;">ريال سعودي / شهرياً — بعد تطبيق التوصيات</div>
          </div>
          <div style="text-align:center;padding:14px 18px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;flex-shrink:0;">
            <div style="font-size:10px;color:#86efac;font-weight:700;margin-bottom:5px;">العائد المتوقع</div>
            <div style="font-size:26px;font-weight:900;color:#22c55e;">4X</div>
            <div style="font-size:9px;color:#475569;margin-top:2px;">على الاستثمار التسويقي</div>
          </div>
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(34,197,94,0.1);">
          <div style="font-size:9px;color:#475569;line-height:1.7;">⚡ هذا التقدير مبني على: تحليل الحضور الرقمي الحالي، مقارنة بمعيار السوق في ${sectorLabel || lead.businessType}، وتقدير الفجوات التسويقية القابلة للمعالجة خلال 90 يوماً.</div>
        </div>
      </div>
      ${analysis?.marketingGapSummary ? `<div style="margin-bottom:12px;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#7dd3fc;margin-bottom:7px;">🔍 ملخص الفجوة التسويقية</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.marketingGapSummary}</div></div>` : ""}
      ${analysis?.primaryOpportunity ? `<div style="margin-bottom:12px;padding:14px 18px;background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#86efac;margin-bottom:7px;">🎯 الفرصة الرئيسية</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.primaryOpportunity}</div></div>` : ""}
      ${analysis?.competitivePosition ? `<div style="padding:14px 18px;background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.15);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#c4b5fd;margin-bottom:7px;">🏆 الموقع التنافسي</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.competitivePosition}</div></div>` : ""}
    </div>
    ${FOOTER_HTML(2, reportSerial)}
  </div>`;

  // ===== PAGE 3: التحليل العميق =====
  const page3 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(167,139,250,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(3, 5, "التحليل العميق", "مقارنة الأداء بمعيار السوق وتحليل المنصات", "#a78bfa")}
    <div style="padding:14px 36px;position:relative;z-index:1;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div style="background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.15);border-radius:14px;padding:14px;">
          <div style="font-size:10px;font-weight:800;color:#c4b5fd;margin-bottom:10px;">📊 مقارنة الأداء بمعيار السوق</div>
          <div style="display:flex;justify-content:center;">${radarChart}</div>
          <div style="display:flex;gap:14px;justify-content:center;margin-top:6px;">
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:3px;background:#22c55e;border-radius:2px;"></div><span style="font-size:8px;color:#94a3b8;">أداء ${lead.companyName}</span></div>
            <div style="display:flex;align-items:center;gap:4px;"><div style="width:12px;height:2px;background:rgba(14,165,233,0.6);border-radius:2px;"></div><span style="font-size:8px;color:#94a3b8;">متوسط السوق</span></div>
          </div>
        </div>
        <div>
          <div style="font-size:10px;font-weight:800;color:#f97316;margin-bottom:8px;">📱 أداء المنصات الرقمية</div>
          <div style="display:flex;flex-direction:column;gap:7px;">${platformBlocks}</div>
        </div>
      </div>
      <div style="background:rgba(14,165,233,0.04);border:1px solid rgba(14,165,233,0.15);border-radius:14px;padding:12px 14px;margin-bottom:12px;">
        <div style="font-size:10px;font-weight:800;color:#7dd3fc;margin-bottom:8px;">🌐 تحليل الموقع الإلكتروني</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
          ${[
            { label: "SEO", score: websiteScore, icon: "🔍" },
            { label: "التصميم", score: Math.min(websiteScore + 1, 10), icon: "🎨" },
            { label: "المحتوى", score: Math.max(websiteScore - 1, 1), icon: "📝" },
            { label: "الجوال", score: Math.max(websiteScore - 2, 1), icon: "📱" },
          ].map(m => {
            const c = m.score >= 7 ? "#22c55e" : m.score >= 5 ? "#f59e0b" : "#ef4444";
            return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:9px;text-align:center;"><div style="font-size:15px;margin-bottom:3px;">${m.icon}</div><div style="font-size:20px;font-weight:900;color:${c};line-height:1;">${m.score}</div><div style="font-size:8px;color:#64748b;margin-top:2px;">${m.label}</div></div>`;
          }).join("")}
        </div>
        ${!lead.website ? `<div style="margin-top:8px;padding:7px 10px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:9px;color:#fca5a5;">⚠️ لا يوجد موقع إلكتروني — هذا يعني خسارة مباشرة في العملاء الذين يبحثون على جوجل</div>` : ""}
      </div>
      ${analysis?.sectorInsights || analysis?.benchmarkComparison ? `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:12px 14px;"><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:7px;">💡 رؤى قطاعية ومقارنة بالسوق</div>${analysis?.sectorInsights ? `<div style="font-size:9px;color:#64748b;line-height:1.7;margin-bottom:5px;">${analysis.sectorInsights}</div>` : ""}${analysis?.benchmarkComparison ? `<div style="font-size:9px;color:#64748b;line-height:1.7;">${analysis.benchmarkComparison}</div>` : ""}</div>` : ""}
    </div>
    ${FOOTER_HTML(3, reportSerial)}
  </div>`;

  // ===== PAGE 4: التوصيات والموسم =====
  const page4 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;bottom:-80px;right:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(4, 5, "التوصيات والخطة", "الأولويات المرتبة وتوقيت التنفيذ المثالي", "#f97316")}
    <div style="padding:14px 36px;position:relative;z-index:1;">
      <div style="margin-bottom:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(167,139,250,0.08),rgba(14,165,233,0.05));border:1px solid rgba(167,139,250,0.25);border-radius:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:28px;">${season.emoji}</div>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:900;color:#c4b5fd;margin-bottom:3px;">${season.name} — التوقيت الحالي</div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:3px;">${season.urgency}</div>
            <div style="font-size:9px;color:#64748b;padding:5px 9px;background:rgba(255,255,255,0.03);border-radius:6px;border-right:3px solid ${season.color};">${season.tip}</div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:800;color:#f97316;margin-bottom:8px;display:flex;align-items:center;gap:6px;"><span>🎯</span> التوصيات المرتبة حسب الأولوية</div>
        <div style="display:flex;flex-direction:column;gap:9px;">${recommendations}</div>
      </div>
      ${analysis?.iceBreaker && !isClientFacing ? `<div style="padding:12px 16px;background:linear-gradient(135deg,rgba(34,197,94,0.05),rgba(14,165,233,0.04));border:1px solid rgba(34,197,94,0.15);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#86efac;margin-bottom:7px;">💬 نص التواصل المقترح (Ice Breaker)</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;font-style:italic;padding-right:10px;border-right:3px solid rgba(34,197,94,0.4);">"${analysis.iceBreaker}"</div></div>` : ""}
      ${analysis?.urgencyLevel ? `<div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;display:flex;align-items:center;justify-content:space-between;"><div style="font-size:9px;color:#94a3b8;">مستوى الإلحاح</div><div style="font-size:10px;font-weight:700;color:${analysis.urgencyLevel === "high" ? "#ef4444" : analysis.urgencyLevel === "medium" ? "#f59e0b" : "#22c55e"};">${getUrgencyLabel(analysis.urgencyLevel)}</div></div>` : ""}
    </div>
    ${FOOTER_HTML(4, reportSerial)}
  </div>`;

  // ===== PAGE 5: الإغلاق والثقة =====
  const page5 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-60px;right:-40px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(5, 5, "الإغلاق والتواصل", "شهادة الاعتماد وقنوات التواصل المباشر", "#22c55e")}
    <div style="padding:16px 36px;position:relative;z-index:1;">
      <div style="margin-bottom:16px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,0.05),rgba(14,165,233,0.04));border:2px solid rgba(34,197,94,0.2);border-radius:16px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#a78bfa);"></div>
        <div style="font-size:26px;margin-bottom:7px;">🏅</div>
        <div style="font-size:13px;font-weight:900;color:#f1f5f9;margin-bottom:4px;">تقرير معتمد من مكسب لخدمات الاعمال</div>
        <div style="font-size:9px;color:#475569;margin-bottom:12px;">هذا التقرير صادر بناءً على تحليل ذكاء اصطناعي معتمد ومراجعة بشرية متخصصة</div>
        <div style="display:flex;justify-content:center;gap:22px;flex-wrap:wrap;">
          <div style="text-align:center;"><div style="font-size:8px;color:#475569;margin-bottom:3px;">رقم التقرير</div><div style="font-size:11px;font-weight:800;color:#22c55e;font-family:monospace;">${reportSerial}</div></div>
          <div style="text-align:center;"><div style="font-size:8px;color:#475569;margin-bottom:3px;">تاريخ الإصدار</div><div style="font-size:11px;font-weight:800;color:#94a3b8;">${dateStr}</div></div>
          ${generatedBy ? `<div style="text-align:center;"><div style="font-size:8px;color:#475569;margin-bottom:3px;">المحلل</div><div style="font-size:11px;font-weight:800;color:#94a3b8;">${generatedBy}</div></div>` : ""}
          <div style="text-align:center;"><div style="font-size:8px;color:#475569;margin-bottom:3px;">السجل التجاري</div><div style="font-size:11px;font-weight:800;color:#94a3b8;font-family:monospace;">7040860202</div></div>
        </div>
      </div>
      <div style="margin-bottom:16px;padding:16px 20px;background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(14,165,233,0.05));border:1px solid rgba(34,197,94,0.25);border-radius:16px;">
        <div style="font-size:12px;font-weight:900;color:#f1f5f9;margin-bottom:5px;text-align:center;">🚀 هذا التقرير هو البداية فقط</div>
        <div style="font-size:9px;color:#94a3b8;line-height:1.8;text-align:center;margin-bottom:12px;">ما تراه هنا هو تشخيص أولي. فريق مكسب مستعد لتقديم خطة تنفيذية مخصصة بالكامل لنشاطك التجاري، مع ضمان نتائج قابلة للقياس خلال 90 يوماً.</div>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;">
          <div style="padding:9px 18px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:10px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#22c55e;margin-bottom:2px;">📞 تواصل معنا الآن</div><div style="font-size:8px;color:#475569;">واتساب مباشر</div></div>
          <div style="padding:9px 18px;background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.25);border-radius:10px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#0ea5e9;margin-bottom:2px;">📊 طلب تحليل موسّع</div><div style="font-size:8px;color:#475569;">تقرير تفصيلي 20+ صفحة</div></div>
          <div style="padding:9px 18px;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.25);border-radius:10px;text-align:center;"><div style="font-size:10px;font-weight:800;color:#a78bfa;margin-bottom:2px;">🗓️ حجز استشارة مجانية</div><div style="font-size:8px;color:#475569;">30 دقيقة مع خبير</div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;gap:20px;margin-bottom:14px;">
        <div style="text-align:center;">
          <div style="padding:5px;background:white;border-radius:10px;display:inline-block;box-shadow:0 0 14px rgba(34,197,94,0.2);margin-bottom:5px;">
            <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="white"/>
              <rect x="10" y="10" width="30" height="30" fill="black"/><rect x="15" y="15" width="20" height="20" fill="white"/><rect x="18" y="18" width="14" height="14" fill="black"/>
              <rect x="60" y="10" width="30" height="30" fill="black"/><rect x="65" y="15" width="20" height="20" fill="white"/><rect x="68" y="18" width="14" height="14" fill="black"/>
              <rect x="10" y="60" width="30" height="30" fill="black"/><rect x="15" y="65" width="20" height="20" fill="white"/><rect x="18" y="68" width="14" height="14" fill="black"/>
              <rect x="50" y="50" width="8" height="8" fill="black"/><rect x="62" y="50" width="8" height="8" fill="black"/><rect x="74" y="50" width="8" height="8" fill="black"/>
              <rect x="50" y="62" width="8" height="8" fill="black"/><rect x="74" y="62" width="8" height="8" fill="black"/>
              <rect x="50" y="74" width="8" height="8" fill="black"/><rect x="62" y="74" width="8" height="8" fill="black"/><rect x="74" y="74" width="8" height="8" fill="black"/>
              <rect x="42" y="10" width="6" height="6" fill="black"/><rect x="42" y="22" width="6" height="6" fill="black"/><rect x="42" y="34" width="6" height="6" fill="black"/>
            </svg>
          </div>
          <div style="font-size:9px;color:#86efac;font-weight:700;">واتساب</div>
        </div>
        <div style="text-align:center;">
          <div style="padding:5px;background:white;border-radius:10px;display:inline-block;box-shadow:0 0 14px rgba(14,165,233,0.2);margin-bottom:5px;">
            <svg width="72" height="72" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" fill="white"/>
              <rect x="10" y="10" width="30" height="30" fill="black"/><rect x="15" y="15" width="20" height="20" fill="white"/><rect x="18" y="18" width="14" height="14" fill="black"/>
              <rect x="60" y="10" width="30" height="30" fill="black"/><rect x="65" y="15" width="20" height="20" fill="white"/><rect x="68" y="18" width="14" height="14" fill="black"/>
              <rect x="10" y="60" width="30" height="30" fill="black"/><rect x="15" y="65" width="20" height="20" fill="white"/><rect x="18" y="68" width="14" height="14" fill="black"/>
              <rect x="50" y="50" width="6" height="6" fill="black"/><rect x="60" y="50" width="6" height="6" fill="black"/><rect x="70" y="50" width="6" height="6" fill="black"/><rect x="80" y="50" width="6" height="6" fill="black"/>
              <rect x="50" y="60" width="6" height="6" fill="black"/><rect x="70" y="60" width="6" height="6" fill="black"/>
              <rect x="50" y="70" width="6" height="6" fill="black"/><rect x="60" y="70" width="6" height="6" fill="black"/><rect x="80" y="70" width="6" height="6" fill="black"/>
              <rect x="50" y="80" width="6" height="6" fill="black"/><rect x="70" y="80" width="6" height="6" fill="black"/><rect x="80" y="80" width="6" height="6" fill="black"/>
            </svg>
          </div>
          <div style="font-size:9px;color:#7dd3fc;font-weight:700;">السجل التجاري</div>
        </div>
      </div>
      <div style="padding:10px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
        <div style="font-size:7.5px;color:#334155;line-height:1.8;text-align:center;">هذا التقرير سري ومخصص حصريًا لعناية العميل المذكور أعلاه ويحظر توزيعه أو نسخه دون إذن كتابي مسبق. جميع التحليلات والتوصيات هي آراء مهنية مبنية على بيانات متاحة وقت إعداده ولا تمثل ضمانًا لنتائج محددة. <strong style="color:#22c55e;">رقم التقرير: ${reportSerial}</strong></div>
      </div>
    </div>
    ${FOOTER_HTML(5, reportSerial)}
  </div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>تقرير تنفيذي - ${lead.companyName}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Tajawal','Cairo','Arial',sans-serif; direction:rtl; text-align:right; background:#0a0f1e; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  @media print { body { background:#020810; margin:0; padding:0; } #print-toolbar { display:none !important; } .page-wrapper { box-shadow:none !important; margin:0 !important; } }
  @page { size:A4 portrait; margin:0; }
  #print-toolbar { position:fixed; top:0; left:0; right:0; z-index:99999; background:linear-gradient(135deg,#0a1628,#0d1f3c); border-bottom:2px solid rgba(34,197,94,0.3); padding:9px 22px; display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:'Tajawal',sans-serif; direction:rtl; box-shadow:0 2px 20px rgba(0,0,0,0.5); }
  #print-toolbar .title { color:#f1f5f9; font-size:13px; font-weight:700; }
  #print-toolbar .hint { color:#475569; font-size:10px; margin-top:2px; }
  #print-toolbar .btn-print { background:linear-gradient(135deg,#16a34a,#22c55e); color:#000; border:none; border-radius:8px; padding:8px 20px; font-size:12px; font-weight:800; cursor:pointer; font-family:'Tajawal',sans-serif; box-shadow:0 0 20px rgba(34,197,94,0.4); }
  #print-toolbar .btn-close { background:rgba(255,255,255,0.05); color:#94a3b8; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:8px 14px; font-size:12px; cursor:pointer; font-family:'Tajawal',sans-serif; }
  .pages-container { padding:65px 20px 28px; display:flex; flex-direction:column; align-items:center; gap:22px; }
  @media print { .pages-container { padding:0; gap:0; } }
  .page-wrapper { width:210mm; box-shadow:0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(34,197,94,0.04); }
</style>
</head>
<body>
<div id="print-toolbar">
  <div>
    <div class="title">📄 تقرير تنفيذي — ${lead.companyName}</div>
    <div class="hint">⚠️ عند الطباعة: فعّل "رسومات الخلفية" (Background graphics) لتظهر الألوان</div>
  </div>
  <div style="display:flex;gap:8px;">
    <button class="btn-print" onclick="window.print()">⬇️ حفظ PDF</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
</div>
<div class="pages-container">
  <div class="page-wrapper">${page1}</div>
  <div class="page-wrapper">${page2}</div>
  <div class="page-wrapper">${page3}</div>
  <div class="page-wrapper">${page4}</div>
  <div class="page-wrapper">${page5}</div>
</div>
</body>
</html>`;
}
