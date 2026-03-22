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
    additionalNotes?: string | null;
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
  seasonOverride?: {
    name: string;
    emoji: string;
    color: string;
    urgency: string;
    tip: string;
  } | null;
  seoData?: {
    url: string;
    topKeywords?: {keyword: string; volume: string; position: number | null; difficulty: string}[];
    missingKeywords?: string[];
    keywordOpportunities?: string[];
    estimatedBacklinks?: number | null;
    backlinkQuality?: string | null;
    topReferringDomains?: string[];
    backlinkGaps?: string[];
    competitors?: {name: string; url: string; seoScore: number; strengths: string[]}[];
    competitorGaps?: string[];
    competitiveAdvantages?: string[];
    searchRankings?: {keyword: string; position: number | null; url: string; snippet: string}[];
    brandMentions?: number | null;
    localSeoScore?: number | null;
    overallSeoHealth?: string | null;
    seoSummary?: string | null;
    priorityActions?: string[];
    analyzedAt?: Date;
  } | null;
  // تحليل الموقع الإلكتروني
  websiteData?: {
    url: string;
    hasWebsite: boolean;
    loadSpeedScore?: number | null;
    mobileExperienceScore?: number | null;
    seoScore?: number | null;
    contentQualityScore?: number | null;
    designScore?: number | null;
    offerClarityScore?: number | null;
    overallScore?: number | null;
    hasOnlineBooking?: boolean | null;
    hasPaymentOptions?: boolean | null;
    hasDeliveryInfo?: boolean | null;
    hasSeasonalPage?: boolean | null;
    technicalGaps?: string[] | null;
    contentGaps?: string[] | null;
    recommendations?: string[] | null;
    summary?: string | null;
    analyzedAt?: Date;
  } | null;
  // بيانات السوشيال الحقيقية (Bright Data)
  socialSnapshot?: {
    instagramFollowers?: number | null;
    instagramFollowing?: number | null;
    instagramPostsCount?: number | null;
    instagramVerified?: boolean | null;
    instagramEngagementRate?: number | null;
    instagramBio?: string | null;
    instagramUsername?: string | null;
    tiktokFollowers?: number | null;
    tiktokVideoCount?: number | null;
    tiktokHearts?: number | null;
    tiktokEngagementRate?: number | null;
    tiktokVerified?: boolean | null;
    tiktokDescription?: string | null;
    tiktokUsername?: string | null;
    twitterFollowers?: number | null;
    twitterTweetsCount?: number | null;
    twitterVerified?: boolean | null;
    twitterBlueVerified?: boolean | null;
    twitterDescription?: string | null;
    twitterUsername?: string | null;
    backlinkTotal?: number | null;
    backlinkHasGMB?: boolean | null;
    fetchedAt?: Date;
  } | null;
  // تحليل التعليقات والسمعة الرقمية
  reviewsAnalysis?: {
    reviewCount?: number | null;
    googleRating?: number | null;
    sentimentPositive?: number | null;
    sentimentNegative?: number | null;
    sentimentNeutral?: number | null;
    topPositiveKeywords?: string[] | null;
    topNegativeKeywords?: string[] | null;
    topThemes?: string[] | null;
    reputationScore?: number | null;
    reputationLabel?: string | null;
    aiSummary?: string | null;
    recommendations?: string[] | null;
    competitorAvgRating?: number | null;
  } | null;
  // تحليل السوشيال (AI analysis per platform)
  socialAnalyses?: Array<{
    platform: string;
    hasAccount: boolean;
    followersCount?: number | null;
    engagementRate?: number | null;
    postsCount?: number | null;
    avgLikes?: number | null;
    avgViews?: number | null;
    overallScore?: number | null;
    engagementScore?: number | null;
    contentQualityScore?: number | null;
    postingFrequencyScore?: number | null;
    contentStrategyScore?: number | null;
    digitalPresenceScore?: number | null;
    hasSeasonalContent?: boolean | null;
    hasPricingContent?: boolean | null;
    hasCallToAction?: boolean | null;
    gaps?: string[] | null;
    recommendations?: string[] | null;
    summary?: string | null;
    analysisText?: string | null;
    dataSource?: string | null;
    profileUrl?: string | null;
  }> | null;
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

// ===== أثر نوعي بدلاً من أرقام مالية =====
function getImpactOnTrust(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): string {
  const score = analysis?.leadPriorityScore || 5;
  if (!lead.website && !lead.instagramUrl && !lead.tiktokUrl) return "الحضور الرقمي الحالي لا يبني الثقة بالشكل الكافي لدعم قرار الشراء";
  if (score < 4) return "طريقة العرض الحالية لا تساعد العميل على فهم القيمة بسرعة";
  if (score < 6) return "الأصل الرقمي الحالي لا يعكس قوة النشاط بالشكل الكافي";
  return "النشاط حاضر لكن ليس بالوضوح الذي يدعم قرار الشراء بالكامل";
}
function getTopImpactLabel(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): string {
  const score = analysis?.leadPriorityScore || 5;
  if (!lead.website) return "يضعف الثقة ويؤخر القرار";
  if (!lead.instagramUrl && !lead.tiktokUrl) return "يقلل الاستفادة من الطلب المتاح";
  if (score < 4) return "يفتح مجالاً للمنافس";
  if (score < 6) return "لا يستثمر الظهور الحالي بشكل كافٍ";
  return "يزيد التردد ويؤخر القرار";
}
function getPriorityOneLabel(analysis: PDFReportData["analysis"], lead: PDFReportData["lead"]): string {
  const hasSocial = !!(lead.instagramUrl || lead.tiktokUrl || lead.snapchatUrl);
  const hasWebsite = !!lead.website;
  const score = analysis?.leadPriorityScore || 5;
  if (hasSocial && !hasWebsite) return "تطوير الأصل الرقمي الأساسي";
  if (hasWebsite && score < 5) return "تحسين نقطة التحويل في الموقع";
  if (!hasSocial && !hasWebsite) return "تطوير الجاهزية الرقمية الأساسية";
  return "تحسين وضوح النشاط ودعم قرار الشراء";
}

// تصنيف الحالة العامة بدلاً من الأرقام المجردة
function getDigitalReadinessLabel(score: number): { status: string; readiness: string; priority: string; statusColor: string; priorityColor: string } {
  if (score >= 7) return { status: "جيد", readiness: "متقدمة", priority: "لاحقة", statusColor: "#22c55e", priorityColor: "#22c55e" };
  if (score >= 4) return { status: "متوسط", readiness: "متوسطة", priority: "مهمة", statusColor: "#f59e0b", priorityColor: "#f59e0b" };
  return { status: "منخفض", readiness: "أولية", priority: "عاجلة", statusColor: "#ef4444", priorityColor: "#ef4444" };
}

const IMPACT_NOTE = `<div style="margin-top:6px;padding:5px 10px;background:rgba(255,255,255,0.03);border-right:2px solid rgba(34,197,94,0.3);border-radius:0 6px 6px 0;"><span style="font-size:8px;color:#475569;font-style:italic;">هذا التحليل تشخيص أولي لفرص التحسين. التفاصيل والخطة التنفيذية تُحدد في جلسة التحليل المتقدم.</span></div>`;

function getCurrentSeason(): { name: string; emoji: string; color: string; urgency: string; tip: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const mmdd = month * 100 + day; // MMDD للمقارنة السريعة

  // ===== تواريخ رمضان الدقيقة (ميلادية) =====
  const ramadanRanges: Record<number, [number, number]> = {
    2025: [301, 330],  // 1 مارس - 30 مارس 2025
    2026: [218, 319],  // 18 فبراير - 19 مارس 2026
    2027: [208, 308],  // 8 فبراير - 8 مارس 2027
    2028: [128, 226],  // 28 يناير - 26 فبراير 2028
  };
  // عيد الفطر: 3 أيام بعد انتهاء رمضان
  const eidFitrRanges: Record<number, [number, number]> = {
    2025: [330, 402],
    2026: [319, 323],
    2027: [308, 312],
    2028: [226, 302],
  };
  // عيد الأضحى
  const eidAdhaRanges: Record<number, [number, number]> = {
    2025: [606, 613],
    2026: [526, 602],
    2027: [516, 523],
    2028: [504, 511],
  };

  const ramadan = ramadanRanges[year];
  const eidFitr = eidFitrRanges[year];
  const eidAdha = eidAdhaRanges[year];

  // رمضان الكريم
  if (ramadan && mmdd >= ramadan[0] && mmdd <= ramadan[1]) {
    return {
      name: "موسم رمضان المبارك", emoji: "🌙", color: "#a78bfa",
      urgency: "⚡ أعلى موسم مبيعات في السنة — لا تفوّت الفرصة",
      tip: "الآن هو الوقت الأمثل لإطلاق حملات المحتوى والعروض الحصرية"
    };
  }
  // عيد الفطر
  if (eidFitr && mmdd >= eidFitr[0] && mmdd <= eidFitr[1]) {
    return {
      name: "موسم عيد الفطر المبارك", emoji: "🎉", color: "#f59e0b",
      urgency: "🎊 موسم الإنفاق الأعلى — العائلات تتسوق بكثافة",
      tip: "ركّز على العروض العائلية والهدايا والأجواء الاحتفالية"
    };
  }
  // عيد الأضحى
  if (eidAdha && mmdd >= eidAdha[0] && mmdd <= eidAdha[1]) {
    return {
      name: "موسم عيد الأضحى المبارك", emoji: "🐑", color: "#f59e0b",
      urgency: "🎉 موسم الإنفاق العائلي الأعلى — فرصة ذهبية",
      tip: "ركّز على العروض العائلية والخدمات الموسمية والهدايا"
    };
  }
  // اليوم الوطني السعودي: 23 سبتمبر ± 7 أيام
  if (mmdd >= 916 && mmdd <= 1001) {
    return {
      name: "موسم اليوم الوطني السعودي", emoji: "🇸🇦", color: "#22c55e",
      urgency: "🎉 فرصة ذهبية للحملات الوطنية والعروض الخاصة",
      tip: "استخدم الهوية الوطنية في المحتوى لزيادة التفاعل والمبيعات"
    };
  }
  // موسم العودة للمدارس: أغسطس - أوائل سبتمبر
  if (mmdd >= 801 && mmdd <= 915) {
    return {
      name: "موسم العودة للمدارس", emoji: "📚", color: "#0ea5e9",
      urgency: "🎯 موسم شراء نشط — الأسر تبحث عن العروض",
      tip: "ركّز على المحتوى التعليمي والعروض العائلية والمستلزمات المدرسية"
    };
  }
  // موسم الصيف: يونيو - يوليو
  if (mmdd >= 601 && mmdd <= 731) {
    return {
      name: "موسم الصيف والسفر", emoji: "☀️", color: "#eab308",
      urgency: "🌴 موسم السفر والترفيه — فرصة للخدمات الترفيهية",
      tip: "ركّز على المحتوى الترفيهي والعروض الصيفية والسياحة الداخلية"
    };
  }
  // نهاية العام: نوفمبر - ديسمبر
  if (mmdd >= 1101 && mmdd <= 1231) {
    return {
      name: "موسم نهاية العام والجمعة البيضاء", emoji: "🛍️", color: "#f97316",
      urgency: "🛍️ موسم التسوق الأكثر نشاطاً عالمياً",
      tip: "العروض والتخفيضات تحقق أعلى معدلات تحويل — ابدأ التحضير مبكراً"
    };
  }
  // الموسم العادي
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
        ${s.expectedImpact ? `<div style="font-size:9px;color:#64748b;margin-top:3px;font-style:italic;">الأثر المتوقع على النشاط: ${s.expectedImpact}</div>` : ""}
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
  const impactOnTrust = getImpactOnTrust(analysis, lead);
  const topImpactLabel = getTopImpactLabel(analysis, lead);
  const priorityOneLabel = getPriorityOneLabel(analysis, lead);
  const season = data.seasonOverride || getCurrentSeason();
  const reportSerial = `RPT-${lead.id.toString().padStart(4, "0")}-${generatedAt.getFullYear()}`;
  const radarChart = buildRadarChart(analysis, lead);
  const platformBlocks = buildPlatformBlocks(lead, analysis);
  const recommendations = buildRecommendations(analysis);
  const prColor = getPriorityColor(priorityScore);
  const prBg = getPriorityBg(priorityScore);
  const prBorder = getPriorityBorder(priorityScore);
  const confidenceScore = analysis?.aiConfidenceScore || Math.round(priorityScore * 8 + 20);
  const seo = data.seoData || null;
  const hasSeo = !!seo;
  const web = data.websiteData || null;
  const hasWeb = !!web && web.hasWebsite;
  // استخدام الدرجات الحقيقية من websiteData إذا كانت متاحة
  const websiteScore = web?.overallScore ?? (lead.website ? Math.min(priorityScore + 1, 10) : 2);
  const digitalScore = !!(lead.instagramUrl || lead.tiktokUrl || lead.snapchatUrl) ? Math.min(priorityScore + 2, 10) : 3;
  const snap = data.socialSnapshot || null;
  const socialArr = data.socialAnalyses || [];
  const hasSocial = !!(snap || socialArr.length > 0);
  const reviews = data.reviewsAnalysis || null;
  const hasReviews = !!(reviews || (lead.reviewCount && lead.reviewCount > 0));
  // حساب عدد الصفحات الكلي (page5 دائماً آخر صفحة)
  const totalPages = 5 + (hasWeb ? 1 : 0) + (hasSocial ? 1 : 0) + (hasSeo ? 1 : 0) + (hasReviews ? 1 : 0);


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

  // ===== صفحة SEO المتقدم =====
  const seoHealthColor: Record<string, string> = { critical: "#ef4444", weak: "#f97316", average: "#f59e0b", good: "#22c55e", excellent: "#06b6d4" };
  const seoHealthLabel: Record<string, string> = { critical: "حرج", weak: "ضعيف", average: "متوسط", good: "جيد", excellent: "ممتاز" };
  const seoColor = seoHealthColor[seo?.overallSeoHealth || "average"] || "#f59e0b";
  const seoLabel = seoHealthLabel[seo?.overallSeoHealth || "average"] || "متوسط";
  const backlinkQualityLabel: Record<string, string> = { weak: "ضعيف", average: "متوسط", good: "جيد", strong: "قوي" };

  // ===== صفحة تحليل الموقع الحقيقي =====
  const webScoreColor = (s: number | null | undefined) => !s ? "#64748b" : s >= 7 ? "#22c55e" : s >= 5 ? "#f59e0b" : "#ef4444";
  const webScoreLabel = (s: number | null | undefined) => !s ? "غير محلل" : s >= 7 ? "جيد" : s >= 5 ? "متوسط" : "يحتاج تحسين";
  const webPageNum = 4;
  const pageWebsite = hasWeb ? `<div style="${PAGE_STYLE}">
    ${WATERMARK_HTML}
    ${HEADER_HTML(webPageNum, totalPages, "تحليل الموقع الإلكتروني", "السرعة · SEO · المحتوى · تجربة الجوال · الثغرات", "#0ea5e9")}
    <div style="padding:14px 28px;position:relative;z-index:1;">
      <div style="display:flex;gap:10px;margin-bottom:14px;">
        <div style="flex:1;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#64748b;margin-bottom:3px;">الدرجة الكلية</div>
          <div style="font-size:28px;font-weight:900;color:${webScoreColor(web!.overallScore)};">${web!.overallScore != null ? Math.round(web!.overallScore * 10) / 10 : "—"}</div>
          <div style="font-size:9px;color:#475569;">${webScoreLabel(web!.overallScore)}</div>
        </div>
        <div style="flex:2;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${[["⚡ السرعة", web!.loadSpeedScore],["📱 الجوال", web!.mobileExperienceScore],["🔍 SEO", web!.seoScore],["📝 المحتوى", web!.contentQualityScore],["🎨 التصميم", web!.designScore],["🎯 وضوح العرض", web!.offerClarityScore]].map(([lbl, sc]) => {
            const s = sc as number | null | undefined;
            const c = webScoreColor(s);
            return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:7px 10px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:9px;color:#94a3b8;">${lbl}</span><span style="font-size:13px;font-weight:900;color:${c};">${s != null ? Math.round(s * 10) / 10 : "—"}</span></div>`;
          }).join("")}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        ${[["📅 صفحة موسمية", web!.hasSeasonalPage],["🛒 حجز أونلاين", web!.hasOnlineBooking],["💳 خيارات دفع", web!.hasPaymentOptions],["🚚 معلومات توصيل", web!.hasDeliveryInfo]].map(([lbl, val]) => `<div style="padding:5px 12px;border-radius:20px;font-size:9px;font-weight:700;background:${val ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)"};color:${val ? "#22c55e" : "#ef4444"};border:1px solid ${val ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)"}">${val ? "✅" : "❌"} ${lbl}</div>`).join("")}
      </div>
      ${web!.summary ? `<div style="margin-bottom:12px;padding:12px 14px;background:rgba(14,165,233,0.04);border:1px solid rgba(14,165,233,0.15);border-radius:12px;"><div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:4px;">📋 ملخص تحليل الموقع</div><div style="font-size:10px;color:#cbd5e1;line-height:1.7;">${web!.summary}</div></div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${(web!.technicalGaps?.length || 0) > 0 ? `<div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:10px 12px;"><div style="font-size:9px;font-weight:800;color:#ef4444;margin-bottom:6px;">🔧 ثغرات تقنية</div>${(web!.technicalGaps!).slice(0,5).map((g: string) => `<div style="font-size:9px;color:#e2e8f0;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.04);">⚠️ ${g}</div>`).join("")}</div>` : ""}
        ${(web!.contentGaps?.length || 0) > 0 ? `<div style="background:rgba(249,115,22,0.04);border:1px solid rgba(249,115,22,0.15);border-radius:10px;padding:10px 12px;"><div style="font-size:9px;font-weight:800;color:#f97316;margin-bottom:6px;">📄 ثغرات المحتوى</div>${(web!.contentGaps!).slice(0,5).map((g: string) => `<div style="font-size:9px;color:#e2e8f0;padding:2px 0;border-bottom:1px solid rgba(255,255,255,0.04);">⚠️ ${g}</div>`).join("")}</div>` : ""}
      </div>
      ${(web!.recommendations?.length || 0) > 0 ? `<div style="margin-top:10px;background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:10px 12px;"><div style="font-size:9px;font-weight:800;color:#22c55e;margin-bottom:6px;">✅ توصيات الموقع</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">${(web!.recommendations!).slice(0,6).map((r: string, i: number) => `<div style="font-size:9px;color:#e2e8f0;padding:2px 0;"><span style="color:#22c55e;font-weight:700;">${i+1}.</span> ${r}</div>`).join("")}</div></div>` : ""}
    </div>
    ${FOOTER_HTML(webPageNum, reportSerial)}
  </div>` : "";

  // ===== صفحة تحليل السوشيال الكاملة =====
  const socialPageNum = hasWeb ? 5 : 4;
  const getPlatformLabel = (p: string) => ({ instagram: "إنستغرام", tiktok: "تيك توك", twitter: "تويتر/X", snapchat: "سناب شات", facebook: "فيسبوك" }[p] || p);
  const getPlatformColor = (p: string) => ({ instagram: "#e1306c", tiktok: "#69c9d0", twitter: "#1da1f2", snapchat: "#fffc00", facebook: "#1877f2" }[p] || "#94a3b8");
  const getPlatformIcon = (p: string) => ({ instagram: "📸", tiktok: "🎵", twitter: "🐦", snapchat: "👻", facebook: "📘" }[p] || "📱");
  const fmtNum = (n: number | null | undefined) => n == null ? "—" : n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : n.toString();

  const pageSocial = hasSocial ? `<div style="${PAGE_STYLE}">
    ${WATERMARK_HTML}
    ${HEADER_HTML(socialPageNum, totalPages, "تحليل السوشيال ميديا", "إنستغرام · تيك توك · تويتر · سناب شات — أرقام حقيقية وتحليل ذكي", "#e1306c")}
    <div style="padding:14px 28px;position:relative;z-index:1;">
      ${snap ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;">
        ${snap.instagramFollowers != null ? `<div style="background:rgba(225,48,108,0.06);border:1px solid rgba(225,48,108,0.2);border-radius:12px;padding:12px;text-align:center;"><div style="font-size:9px;color:#f472b6;font-weight:700;margin-bottom:3px;">📸 إنستغرام</div><div style="font-size:22px;font-weight:900;color:#f472b6;">${fmtNum(snap.instagramFollowers)}</div><div style="font-size:8px;color:#64748b;">متابع${snap.instagramVerified ? " · ✅ موثّق" : ""}</div>${snap.instagramEngagementRate != null ? `<div style="font-size:8px;color:#94a3b8;margin-top:2px;">تفاعل: ${(snap.instagramEngagementRate*100).toFixed(1)}%</div>` : ""}</div>` : ""}
        ${snap.tiktokFollowers != null ? `<div style="background:rgba(105,201,208,0.06);border:1px solid rgba(105,201,208,0.2);border-radius:12px;padding:12px;text-align:center;"><div style="font-size:9px;color:#69c9d0;font-weight:700;margin-bottom:3px;">🎵 تيك توك</div><div style="font-size:22px;font-weight:900;color:#69c9d0;">${fmtNum(snap.tiktokFollowers)}</div><div style="font-size:8px;color:#64748b;">متابع${snap.tiktokVerified ? " · ✅ موثّق" : ""}</div>${snap.tiktokHearts != null ? `<div style="font-size:8px;color:#94a3b8;margin-top:2px;">❤️ ${fmtNum(snap.tiktokHearts)} إعجاب</div>` : ""}</div>` : ""}
        ${snap.twitterFollowers != null ? `<div style="background:rgba(29,161,242,0.06);border:1px solid rgba(29,161,242,0.2);border-radius:12px;padding:12px;text-align:center;"><div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:3px;">🐦 تويتر/X</div><div style="font-size:22px;font-weight:900;color:#7dd3fc;">${fmtNum(snap.twitterFollowers)}</div><div style="font-size:8px;color:#64748b;">متابع${snap.twitterVerified || snap.twitterBlueVerified ? " · ✅ موثّق" : ""}</div>${snap.twitterTweetsCount != null ? `<div style="font-size:8px;color:#94a3b8;margin-top:2px;">${fmtNum(snap.twitterTweetsCount)} تغريدة</div>` : ""}</div>` : ""}
      </div>` : ""}
      ${socialArr.length > 0 ? `<div style="display:flex;flex-direction:column;gap:10px;">
        ${socialArr.slice(0,4).map(sa => {
          const pc = getPlatformColor(sa.platform);
          const pi = getPlatformIcon(sa.platform);
          const pl = getPlatformLabel(sa.platform);
          const sc = sa.overallScore;
          const scColor = sc != null ? (sc >= 7 ? "#22c55e" : sc >= 5 ? "#f59e0b" : "#ef4444") : "#64748b";
          return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:12px 14px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:18px;">${pi}</span><div><div style="font-size:11px;font-weight:800;color:#f1f5f9;">${pl}</div>${sa.profileUrl ? `<div style="font-size:8px;color:#475569;">${sa.profileUrl.replace(/https?:\/\/(www\.)?/,"").slice(0,40)}</div>` : ""}</div></div>
              ${sc != null ? `<div style="text-align:center;"><div style="font-size:20px;font-weight:900;color:${scColor};">${Math.round(sc)}</div><div style="font-size:8px;color:#64748b;">/10</div></div>` : ""}
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px;">
              ${[["📊 التفاعل",sa.engagementScore],["📝 المحتوى",sa.contentQualityScore],["🗓️ التكرار",sa.postingFrequencyScore],["🎯 الاستراتيجية",sa.contentStrategyScore]].map(([lbl,val]) => { const v = val as number|null|undefined; const c2 = v != null ? (v>=7?"#22c55e":v>=5?"#f59e0b":"#ef4444") : "#64748b"; return `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:5px;text-align:center;"><div style="font-size:8px;color:#64748b;margin-bottom:2px;">${lbl}</div><div style="font-size:14px;font-weight:900;color:${c2};">${v != null ? Math.round(v) : "—"}</div></div>`; }).join("")}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
              ${sa.hasSeasonalContent ? `<span style="font-size:8px;padding:2px 8px;background:rgba(34,197,94,0.1);color:#22c55e;border-radius:10px;border:1px solid rgba(34,197,94,0.2);">✅ محتوى موسمي</span>` : `<span style="font-size:8px;padding:2px 8px;background:rgba(239,68,68,0.08);color:#ef4444;border-radius:10px;border:1px solid rgba(239,68,68,0.2);">❌ لا محتوى موسمي</span>`}
              ${sa.hasPricingContent ? `<span style="font-size:8px;padding:2px 8px;background:rgba(34,197,94,0.1);color:#22c55e;border-radius:10px;border:1px solid rgba(34,197,94,0.2);">✅ أسعار معروضة</span>` : `<span style="font-size:8px;padding:2px 8px;background:rgba(239,68,68,0.08);color:#ef4444;border-radius:10px;border:1px solid rgba(239,68,68,0.2);">❌ لا أسعار</span>`}
              ${sa.hasCallToAction ? `<span style="font-size:8px;padding:2px 8px;background:rgba(34,197,94,0.1);color:#22c55e;border-radius:10px;border:1px solid rgba(34,197,94,0.2);">✅ CTA واضح</span>` : `<span style="font-size:8px;padding:2px 8px;background:rgba(239,68,68,0.08);color:#ef4444;border-radius:10px;border:1px solid rgba(239,68,68,0.2);">❌ لا CTA</span>`}
            </div>
            ${sa.summary ? `<div style="font-size:9px;color:#94a3b8;line-height:1.6;padding:6px 10px;background:rgba(0,0,0,0.2);border-radius:8px;">${sa.summary}</div>` : ""}
            ${(sa.gaps?.length || 0) > 0 ? `<div style="margin-top:6px;font-size:8.5px;color:#fca5a5;">${(sa.gaps!).slice(0,3).map((g:string)=>`⚠️ ${g}`).join(" · ")}</div>` : ""}
          </div>`;
        }).join("")}
      </div>` : ""}
    </div>
    ${FOOTER_HTML(socialPageNum, reportSerial)}
  </div>` : "";

  const pageSEO = hasSeo ? `
  <div style="${PAGE_STYLE}">
    ${HEADER_HTML(4 + (hasWeb?1:0) + (hasSocial?1:0) + 1, totalPages, "تحليل SEO المتقدم", "الكلمات المفتاحية · الروابط الخارجية · المنافسون · ترتيب البحث", "#06b6d4")}
    <div style="padding:16px 28px;">
      <div style="display:flex;gap:12px;margin-bottom:14px;">
        <div style="flex:1;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:12px 16px;text-align:center;">
          <div style="font-size:9px;color:#64748b;margin-bottom:4px;">الصحة العامة</div>
          <div style="font-size:22px;font-weight:900;color:${seoColor};">${seoLabel}</div>
        </div>
        ${seo?.localSeoScore != null ? `<div style="flex:1;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:12px 16px;text-align:center;"><div style="font-size:9px;color:#64748b;margin-bottom:4px;">درجة SEO المحلي</div><div style="font-size:22px;font-weight:900;color:#22c55e;">${seo!.localSeoScore}/100</div></div>` : ""}
        ${seo?.estimatedBacklinks != null ? `<div style="flex:1;background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:12px 16px;text-align:center;"><div style="font-size:9px;color:#64748b;margin-bottom:4px;">الروابط الخارجية</div><div style="font-size:22px;font-weight:900;color:#a78bfa;">${seo!.estimatedBacklinks}</div><div style="font-size:8px;color:#f59e0b;font-weight:700;">تقدير · ${backlinkQualityLabel[seo!.backlinkQuality || "weak"] || ""}</div></div>` : ""}
      </div>
      ${seo?.seoSummary ? `<div style="background:rgba(6,182,212,0.04);border:1px solid rgba(6,182,212,0.15);border-radius:10px;padding:10px 14px;margin-bottom:12px;"><div style="font-size:9px;color:#06b6d4;font-weight:700;margin-bottom:4px;">📋 ملخص تحليل SEO</div><div style="font-size:10px;color:#cbd5e1;line-height:1.7;">${seo!.seoSummary}</div></div>` : ""}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">🔑 الكلمات المفتاحية</div>
          ${(seo?.topKeywords?.length || 0) > 0 ? (seo!.topKeywords!).slice(0,5).map((k: {keyword:string;volume:string;position:number|null;difficulty:string}) => `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:9px;color:#e2e8f0;">${k.keyword}</span><span style="font-size:8px;color:#64748b;">${k.volume}</span></div>`).join("") : `<div style="font-size:9px;color:#475569;text-align:center;padding:8px;">لا توجد بيانات</div>`}
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">💡 فرص كلمات مفتاحية</div>
          ${(seo?.keywordOpportunities?.length || 0) > 0 ? (seo!.keywordOpportunities!).slice(0,5).map((k: string) => `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:9px;color:#a78bfa;">◆ </span><span style="font-size:9px;color:#e2e8f0;">${k}</span></div>`).join("") : `<div style="font-size:9px;color:#475569;text-align:center;padding:8px;">لا توجد بيانات</div>`}
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">📊 ترتيب في نتائج البحث</div>
          ${(seo?.searchRankings?.length || 0) > 0 ? (seo!.searchRankings!).slice(0,4).map((r: {keyword:string;position:number|null;url:string;snippet:string}) => `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><div style="display:flex;justify-content:space-between;"><span style="font-size:9px;color:#e2e8f0;">${r.keyword}</span>${r.position != null ? `<span style="font-size:8px;font-weight:800;color:${r.position<=10?"#22c55e":r.position<=30?"#f59e0b":"#ef4444"};">\u0645\u0631\u0643\u0632 ${r.position}</span>` : `<span style="font-size:8px;color:#475569;">\u063a\u064a\u0631 \u0645\u0631\u062a\u0628</span>`}</div></div>`).join("") : `<div style="font-size:9px;color:#475569;text-align:center;padding:8px;">لا توجد بيانات</div>`}
        </div>
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">🏆 مقارنة المنافسين</div>
          ${(seo?.competitors?.length || 0) > 0 ? (seo!.competitors!).slice(0,3).map((c: {name:string;url:string;seoScore:number;strengths:string[]}) => `<div style="padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.04);"><div style="display:flex;justify-content:space-between;"><span style="font-size:9px;color:#e2e8f0;font-weight:700;">${c.name}</span><span style="font-size:8px;background:rgba(6,182,212,0.1);color:#06b6d4;border-radius:4px;padding:1px 5px;">${c.seoScore}/100</span></div>${c.strengths?.length>0?`<div style="font-size:8px;color:#64748b;">${c.strengths.slice(0,2).join(" · ")}</div>`:""}</div>`).join("") : `<div style="font-size:9px;color:#475569;text-align:center;padding:8px;">لا توجد بيانات</div>`}
        </div>
      </div>
      ${(seo?.priorityActions?.length || 0) > 0 ? `<div style="margin-top:12px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:10px 14px;"><div style="font-size:10px;font-weight:800;color:#ef4444;margin-bottom:6px;">🚨 إجراءات SEO ذات أولوية</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">${(seo!.priorityActions!).slice(0,6).map((a: string, i: number) => `<div style="font-size:9px;color:#e2e8f0;padding:3px 0;"><span style="color:#ef4444;font-weight:700;">${i+1}.</span> ${a}</div>`).join("")}</div></div>` : ""}
      <div style="margin-top:12px;padding:10px 14px;background:linear-gradient(135deg,rgba(167,139,250,0.06),rgba(6,182,212,0.04));border:1px solid rgba(167,139,250,0.25);border-radius:10px;">
        <div style="font-size:9px;font-weight:800;color:#a78bfa;margin-bottom:5px;">📊 ملاحظة حول بيانات الروابط الخارجية</div>
        <div style="font-size:8.5px;color:#94a3b8;line-height:1.7;">بيانات الـ Backlinks المعروضة هي <span style="color:#f59e0b;font-weight:700;">تقديرات مبنية على SERP</span> وليست بيانات دقيقة. للحصول على تحليل دقيق يشمل عدد الروابط الحقيقي، جودتها، والنطاقات المرجعية بالتفصيل، نوصي بـ:</div>
        <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap;">
          <div style="padding:4px 10px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:6px;font-size:8px;color:#22c55e;font-weight:700;">🗓️ حجز استشارة مجانية 30 دقيقة</div>
          <div style="padding:4px 10px;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:6px;font-size:8px;color:#06b6d4;font-weight:700;">📊 طلب تحليل Backlinks متقدم</div>
        </div>
      </div>
    </div>
    ${FOOTER_HTML(4 + (hasWeb?1:0) + (hasSocial?1:0) + 1, reportSerial)}
  </div>` : "";

  // ===== PAGE 1: الغلاف =====
  const page1 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-100px;right:-100px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-80px;left:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    <div style="padding:14px 36px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.06);background:linear-gradient(135deg,rgba(0,0,0,0.4),rgba(34,197,94,0.03));">
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
    <div style="padding:22px 36px 16px;text-align:center;position:relative;z-index:1;">
      <div style="font-size:9px;color:#475569;font-weight:700;letter-spacing:3px;margin-bottom:8px;">تقرير تنفيذي مخصص لعناية</div>
      <div style="font-size:36px;font-weight:900;color:#f8fafc;margin-bottom:5px;text-shadow:0 0 50px rgba(34,197,94,0.2);">${lead.companyName}</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:14px;">${lead.businessType} <span style="color:#334155;margin:0 5px;">·</span> ${lead.city}${lead.country ? ` · ${lead.country}` : ""}${sectorLabel ? `<span style="color:#334155;margin:0 5px;">·</span> ${sectorLabel}` : ""}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:7px 18px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:24px;">
        <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div>
        <span style="font-size:10px;color:#22c55e;font-weight:700;">تحليل رقمي شامل · ${totalPages} صفحة تحليلية</span>
      </div>
    </div>
    <div style="padding:0 36px 12px;position:relative;z-index:1;">
      <div style="font-size:9px;color:#334155;font-weight:700;text-align:center;margin-bottom:8px;letter-spacing:2px;">المؤشرات الرئيسية</div>
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
    <div style="margin:0 36px 14px;padding:14px 18px;background:linear-gradient(135deg,rgba(34,197,94,0.07),rgba(14,165,233,0.04));border:1px solid rgba(34,197,94,0.25);border-radius:14px;position:relative;z-index:1;">
      <div style="font-size:9px;color:#86efac;font-weight:700;letter-spacing:1px;margin-bottom:6px;">🎯 أبرز فرصة تحسين</div>
      <div style="font-size:12px;font-weight:800;color:#f1f5f9;margin-bottom:6px;">${priorityOneLabel}</div>
      <div style="font-size:9px;color:#94a3b8;line-height:1.7;">${impactOnTrust}</div>
      <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
        <div style="padding:3px 10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:20px;font-size:8px;color:#fca5a5;">⚡ ${topImpactLabel}</div>
        <div style="padding:3px 10px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:20px;font-size:8px;color:#86efac;">الأولوية الآن: ${priorityOneLabel}</div>
      </div>
    </div>
    ${FOOTER_HTML(1, reportSerial)}
  </div>`;

  // ===== PAGE 2: الملخص التنفيذي =====
  const page2 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-60px;left:-60px;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(2, totalPages, "الملخص التنفيذي", "تقييم شامل للحضور الرقمي والفرص المتاحة")}
    <div style="padding:16px 36px;position:relative;z-index:1;">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:6px;letter-spacing:1px;">الحالة العامة</div>
          <div style="font-size:22px;font-weight:900;color:#0ea5e9;line-height:1;margin-bottom:5px;">${getDigitalReadinessLabel(priorityScore).status}</div>
          <div style="font-size:9px;color:#475569;">${priorityScore > 0 ? priorityScore + "/10" : "—"}</div>
          <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;"><div style="height:100%;width:${priorityScore * 10}%;background:#0ea5e9;border-radius:2px;"></div></div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;letter-spacing:1px;">جاهزية رقمية</div>
          <div style="font-size:22px;font-weight:900;color:#ef4444;line-height:1;margin-bottom:5px;">${getDigitalReadinessLabel(priorityScore).readiness}</div>
          <div style="font-size:9px;color:#475569;">${getDigitalReadinessLabel(priorityScore).readiness === 'أولية' ? 'تحتاج تطوير أساسي' : getDigitalReadinessLabel(priorityScore).readiness === 'متوسطة' ? 'مجال واسع للتحسين' : 'حضور جيد قابل للتعزيز'}</div>
        </div>
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:14px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:6px;letter-spacing:1px;">أولوية التحسين</div>
          <div style="font-size:22px;font-weight:900;color:#22c55e;line-height:1;margin-bottom:5px;">${getDigitalReadinessLabel(priorityScore).priority}</div>
          <div style="font-size:9px;color:#475569;">فرص قابلة للتحسين</div>
          <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:8px;"><div style="height:100%;width:85%;background:#22c55e;border-radius:2px;"></div></div>
        </div>
      </div>
      <div style="margin-bottom:16px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,0.06),rgba(14,165,233,0.04));border:1px solid rgba(34,197,94,0.2);border-radius:16px;">
        <div style="font-size:10px;color:#86efac;font-weight:800;margin-bottom:10px;letter-spacing:1px;">🎯 أثر التحسين المتوقع على النشاط</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="padding:10px 12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:10px;">
            <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:4px;">✅ رفع مستوى الثقة</div>
            <div style="font-size:8.5px;color:#94a3b8;line-height:1.6;">تحسين الأصل الرقمي يعزز الانطباع الأول ويدعم قرار العميل</div>
          </div>
          <div style="padding:10px 12px;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:10px;">
            <div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:4px;">✅ تحسين وضوح النشاط</div>
            <div style="font-size:8.5px;color:#94a3b8;line-height:1.6;">عرض القيمة بشكل أوضح يقلل التردد ويسرّع القرار</div>
          </div>
          <div style="padding:10px 12px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.2);border-radius:10px;">
            <div style="font-size:9px;color:#c4b5fd;font-weight:700;margin-bottom:4px;">✅ رفع جودة التحويل</div>
            <div style="font-size:8.5px;color:#94a3b8;line-height:1.6;">استثمار الظهور الحالي بشكل أفضل يحوّل الزوار لعملاء</div>
          </div>
          <div style="padding:10px 12px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:10px;">
            <div style="font-size:9px;color:#fdba74;font-weight:700;margin-bottom:4px;">✅ تعزيز التميز التنافسي</div>
            <div style="font-size:8.5px;color:#94a3b8;line-height:1.6;">حضور رقمي أقوى يقلل مجال المنافس ويرفع الظهور</div>
          </div>
        </div>
        <div style="padding-top:10px;border-top:1px solid rgba(34,197,94,0.1);">
          <div style="font-size:9px;color:#475569;line-height:1.7;">⚡ الأولوية الآن: <span style="color:#86efac;font-weight:700;">${priorityOneLabel}</span> — هذه هي الخطوة الأكثر تأثيراً في المرحلة الحالية.</div>
        </div>
      </div>
      ${analysis?.marketingGapSummary ? `<div style="margin-bottom:12px;padding:14px 18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#7dd3fc;margin-bottom:7px;">🔍 ملخص الفجوة التسويقية</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.marketingGapSummary}</div></div>` : ""}
      ${analysis?.primaryOpportunity ? `<div style="margin-bottom:12px;padding:14px 18px;background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#86efac;margin-bottom:7px;">🎯 أبرز فرصة غير مستثمرة</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.primaryOpportunity}</div>${IMPACT_NOTE}</div>` : ""}
      ${analysis?.competitivePosition ? `<div style="padding:14px 18px;background:rgba(167,139,250,0.04);border:1px solid rgba(167,139,250,0.15);border-radius:14px;"><div style="font-size:10px;font-weight:800;color:#c4b5fd;margin-bottom:7px;">🏆 الموقع التنافسي</div><div style="font-size:10px;color:#94a3b8;line-height:1.8;">${analysis.competitivePosition}</div></div>` : ""}
    </div>
    ${FOOTER_HTML(2, reportSerial)}
  </div>`;

  // ===== PAGE 3: التحليل العميق =====
  const page3 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(167,139,250,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(3, totalPages, "التحليل العميق", "مقارنة الأداء بمعيار السوق وتحليل المنصات", "#a78bfa")}
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
            { label: "السرعة", score: web?.loadSpeedScore ?? websiteScore, icon: "⚡" },
            { label: "SEO", score: web?.seoScore ?? Math.min(websiteScore + 1, 10), icon: "🔍" },
            { label: "المحتوى", score: web?.contentQualityScore ?? Math.max(websiteScore - 1, 1), icon: "📝" },
            { label: "الجوال", score: web?.mobileExperienceScore ?? Math.max(websiteScore - 2, 1), icon: "📱" },
          ].map(m => {
            const s = Math.round((m.score as number) ?? 0);
            const c = s >= 7 ? "#22c55e" : s >= 5 ? "#f59e0b" : "#ef4444";
            return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:9px;text-align:center;"><div style="font-size:15px;margin-bottom:3px;">${m.icon}</div><div style="font-size:20px;font-weight:900;color:${c};line-height:1;">${s}</div><div style="font-size:8px;color:#64748b;margin-top:2px;">${m.label}</div></div>`;
          }).join("")}
        </div>
        ${web?.summary ? `<div style="margin-top:8px;padding:7px 10px;background:rgba(14,165,233,0.05);border:1px solid rgba(14,165,233,0.15);border-radius:8px;font-size:9px;color:#7dd3fc;line-height:1.6;">${web.summary}</div>` : ""}
        ${!lead.website ? `<div style="margin-top:8px;padding:7px 10px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:9px;color:#fde68a;">💡 غياب الموقع يجعل العملاء الباحثين على جوجل لا يجدون نقطة تحويل واضحة — فرصة تحسين ذات أثر مباشر على الثقة</div>` : ""}
      </div>
      ${analysis?.sectorInsights || analysis?.benchmarkComparison ? `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:14px;padding:12px 14px;"><div style="font-size:10px;font-weight:800;color:#94a3b8;margin-bottom:7px;">💡 رؤى قطاعية ومقارنة بالسوق</div>${analysis?.sectorInsights ? `<div style="font-size:9px;color:#64748b;line-height:1.7;margin-bottom:5px;">${analysis.sectorInsights}</div>` : ""}${analysis?.benchmarkComparison ? `<div style="font-size:9px;color:#64748b;line-height:1.7;">${analysis.benchmarkComparison}</div>` : ""}</div>` : ""}
    </div>
    ${FOOTER_HTML(3, reportSerial)}
  </div>`;

  // ===== PAGE 4: التوصيات والموسم =====
  const page4 = `<div style="${PAGE_STYLE}">
    <div style="position:absolute;bottom:-80px;right:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(249,115,22,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(4, totalPages, "التوصيات والخطة", "الأولويات المرتبة وتوقيت التنفيذ المثالي", "#f97316")}
    <div style="padding:14px 36px;position:relative;z-index:1;">
      <div style="margin-bottom:16px;padding:16px 18px;background:linear-gradient(135deg,${season.color}18,${season.color}08);border:1.5px solid ${season.color}50;border-radius:16px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-20px;left:-20px;font-size:80px;opacity:0.07;">${season.emoji}</div>
        <div style="display:flex;align-items:flex-start;gap:12px;position:relative;z-index:1;">
          <div style="font-size:36px;flex-shrink:0;">${season.emoji}</div>
          <div style="flex:1;">
            <div style="font-size:9px;font-weight:700;color:${season.color};letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">🗓️ الموسم التسويقي الحالي</div>
            <div style="font-size:13px;font-weight:900;color:#e2e8f0;margin-bottom:5px;">${season.name}</div>
            ${season.urgency ? `<div style="font-size:10px;color:${season.color};font-weight:700;margin-bottom:6px;">${season.urgency}</div>` : ""}
            ${season.tip ? `<div style="font-size:9.5px;color:#94a3b8;line-height:1.8;padding:8px 12px;background:rgba(0,0,0,0.25);border-radius:8px;border-right:3px solid ${season.color};">${season.tip}</div>` : ""}
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
    ${HEADER_HTML(totalPages, totalPages, "الإغلاق والتواصل", "شهادة الاعتماد وقنوات التواصل المباشر", "#22c55e")}
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
    ${FOOTER_HTML(totalPages, reportSerial)}
  </div>`;

  // ===== REVIEWS PAGE =====
  const reviewsPageNum = 5 + (hasWeb ? 1 : 0) + (hasSocial ? 1 : 0) + (hasSeo ? 1 : 0) + 1;
  const reviewCount = reviews?.reviewCount ?? lead.reviewCount ?? 0;
  const googleRating = reviews?.googleRating ?? null;
  const sentPos = reviews?.sentimentPositive ?? (reviewCount > 50 ? 72 : reviewCount > 20 ? 65 : 60);
  const sentNeg = reviews?.sentimentNegative ?? (reviewCount > 50 ? 12 : reviewCount > 20 ? 18 : 22);
  const sentNeu = reviews?.sentimentNeutral ?? (100 - sentPos - sentNeg);
  const repScore = reviews?.reputationScore ?? (googleRating ? Math.round(googleRating * 10) / 10 : (reviewCount > 100 ? 7.5 : reviewCount > 30 ? 6.5 : 5.5));
  const repLabel = reviews?.reputationLabel ?? (repScore >= 8 ? "سمعة ممتازة" : repScore >= 6 ? "سمعة جيدة" : repScore >= 4 ? "سمعة متوسطة" : "تحتاج تحسين");
  const repColor = repScore >= 8 ? "#22c55e" : repScore >= 6 ? "#f59e0b" : repScore >= 4 ? "#f97316" : "#ef4444";
  const posKeywords = reviews?.topPositiveKeywords ?? ["جودة", "خدمة", "سرعة", "احتراف", "توصية"];
  const negKeywords = reviews?.topNegativeKeywords ?? ["تأخير", "سعر", "تواصل"];
  const topThemes = reviews?.topThemes ?? ["جودة الخدمة", "سرعة التسليم", "التعامل مع العملاء"];
  const reviewsRecs = reviews?.recommendations ?? ["تفعيل الرد على التعليقات في خلال 24 ساعة", "تشجيع العملاء الراضين على كتابة تقييمات", "معالجة التعليقات السلبية باحترافية"];
  const pageReviews = hasReviews ? `<div style="${PAGE_STYLE}">
    <div style="position:absolute;top:-60px;right:-40px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(251,191,36,0.06) 0%,transparent 70%);pointer-events:none;"></div>
    ${WATERMARK_HTML}
    ${HEADER_HTML(reviewsPageNum, totalPages, "تحليل التعليقات والسمعة", "التقييمات · مؤشرات المشاعر · أبرز الكلمات · السمعة الرقمية", "#fbbf24")}
    <div style="padding:14px 28px;position:relative;z-index:1;">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">
        <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fde68a;font-weight:700;margin-bottom:4px;">عدد التقييمات</div>
          <div style="font-size:26px;font-weight:900;color:#fbbf24;line-height:1;">${reviewCount > 0 ? reviewCount.toLocaleString("ar-SA") : "—"}</div>
          <div style="font-size:8px;color:#64748b;margin-top:2px;">تقييم على Google</div>
        </div>
        <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fde68a;font-weight:700;margin-bottom:4px;">تقييم Google</div>
          <div style="font-size:26px;font-weight:900;color:#fbbf24;line-height:1;">${googleRating ? googleRating.toFixed(1) : "—"}</div>
          <div style="font-size:8px;color:#64748b;margin-top:2px;">من 5 نجوم</div>
        </div>
        <div style="background:rgba(${repScore >= 6 ? "34,197,94" : "239,68,68"},0.06);border:1px solid rgba(${repScore >= 6 ? "34,197,94" : "239,68,68"},0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:${repColor};font-weight:700;margin-bottom:4px;">درجة السمعة</div>
          <div style="font-size:26px;font-weight:900;color:${repColor};line-height:1;">${repScore.toFixed(1)}</div>
          <div style="font-size:8px;color:#64748b;margin-top:2px;">${repLabel}</div>
        </div>
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:4px;">إيجابي</div>
          <div style="font-size:26px;font-weight:900;color:#22c55e;line-height:1;">${sentPos}%</div>
          <div style="font-size:8px;color:#64748b;margin-top:2px;">مشاعر إيجابية</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px 16px;margin-bottom:12px;">
        <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">📊 توزيع المشاعر</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="font-size:9px;color:#22c55e;width:55px;">🟢 إيجابي</div>
          <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:14px;overflow:hidden;"><div style="height:100%;width:${sentPos}%;background:linear-gradient(90deg,#22c55e,#16a34a);border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:700;color:#22c55e;width:35px;text-align:left;">${sentPos}%</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="font-size:9px;color:#94a3b8;width:55px;">⚪ محايد</div>
          <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:14px;overflow:hidden;"><div style="height:100%;width:${sentNeu}%;background:linear-gradient(90deg,#64748b,#475569);border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:700;color:#94a3b8;width:35px;text-align:left;">${sentNeu}%</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:9px;color:#ef4444;width:55px;">🔴 سلبي</div>
          <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:4px;height:14px;overflow:hidden;"><div style="height:100%;width:${sentNeg}%;background:linear-gradient(90deg,#ef4444,#dc2626);border-radius:4px;"></div></div>
          <div style="font-size:9px;font-weight:700;color:#ef4444;width:35px;text-align:left;">${sentNeg}%</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div style="background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#86efac;margin-bottom:8px;">💬 أبرز الكلمات الإيجابية</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">${posKeywords.slice(0,6).map((k: string) => `<span style="padding:3px 10px;background:rgba(34,197,94,0.1);color:#22c55e;border:1px solid rgba(34,197,94,0.25);border-radius:20px;font-size:9px;font-weight:700;">${k}</span>`).join("")}</div>
        </div>
        <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#fca5a5;margin-bottom:8px;">⚠️ نقاط التحسين</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">${negKeywords.slice(0,6).map((k: string) => `<span style="padding:3px 10px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:20px;font-size:9px;font-weight:700;">${k}</span>`).join("")}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#f1f5f9;margin-bottom:8px;">📋 أبرز المحاور</div>
          ${topThemes.slice(0,4).map((t: string, i: number) => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:9px;color:#e2e8f0;"><span style="color:#fbbf24;font-weight:700;">${i+1}.</span> ${t}</div>`).join("")}
        </div>
        <div style="background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.15);border-radius:12px;padding:12px;">
          <div style="font-size:10px;font-weight:800;color:#fde68a;margin-bottom:8px;">💡 توصيات تحسين السمعة</div>
          ${reviewsRecs.slice(0,3).map((r: string) => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:9px;color:#e2e8f0;"><span style="color:#fbbf24;font-weight:700;">◆</span> ${r}</div>`).join("")}
        </div>
      </div>
      ${reviews?.aiSummary ? `<div style="margin-top:10px;padding:10px 14px;background:rgba(251,191,36,0.04);border:1px solid rgba(251,191,36,0.15);border-radius:10px;"><div style="font-size:9px;color:#fde68a;font-weight:700;margin-bottom:4px;">🤖 تقييم الذكاء الاصطناعي</div><div style="font-size:9px;color:#94a3b8;line-height:1.7;">${reviews.aiSummary}</div></div>` : ""}
    </div>
    ${FOOTER_HTML(reviewsPageNum, reportSerial)}
  </div>` : "";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>تقرير تنفيذي - ${lead.companyName}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&family=Cairo:wght@300;400;600;700;900&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Tajawal','Cairo','Noto Sans Arabic',sans-serif; direction:rtl; text-align:right; background:#0a0f1e; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  @media print { body { background:#020810; margin:0; padding:0; } #print-toolbar { display:none !important; } .page-wrapper { box-shadow:none !important; margin:0 !important; } }
  @page { size:A4 portrait; margin:0; }
  #print-toolbar { position:fixed; top:0; left:0; right:0; z-index:99999; background:linear-gradient(135deg,#020810,#0a1628); border-bottom:2px solid rgba(34,197,94,0.4); padding:8px 20px; display:flex; align-items:center; justify-content:space-between; gap:10px; font-family:'Tajawal',sans-serif; direction:rtl; box-shadow:0 4px 30px rgba(0,0,0,0.7); }
  #print-toolbar .title { color:#f1f5f9; font-size:13px; font-weight:800; }
  #print-toolbar .subtitle { color:#475569; font-size:9px; margin-top:1px; }
  #print-toolbar .hint { color:#334155; font-size:9px; margin-top:2px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.2); border-radius:6px; padding:3px 8px; }
  #print-toolbar .btn-print { background:linear-gradient(135deg,#16a34a,#22c55e); color:#000; border:none; border-radius:8px; padding:8px 22px; font-size:12px; font-weight:900; cursor:pointer; font-family:'Tajawal',sans-serif; box-shadow:0 0 20px rgba(34,197,94,0.5); transition:all 0.2s; }
  #print-toolbar .btn-print:hover { transform:scale(1.03); box-shadow:0 0 30px rgba(34,197,94,0.7); }
  #print-toolbar .btn-close { background:rgba(255,255,255,0.04); color:#64748b; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:8px 14px; font-size:12px; cursor:pointer; font-family:'Tajawal',sans-serif; }
  .pages-container { padding:60px 16px 20px; display:flex; flex-direction:column; align-items:center; gap:16px; }
  @media print { .pages-container { padding:0; gap:0; } }
  .page-wrapper { width:210mm; box-shadow:0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(34,197,94,0.04); position:relative; overflow:hidden; }
  .page-wrapper::after { content:"حصري من مكسب"; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:56px; font-weight:900; color:rgba(34,197,94,0.035); white-space:nowrap; pointer-events:none; z-index:9999; font-family:'Cairo',sans-serif; letter-spacing:6px; }
</style>
</head>
<body>
<div id="print-toolbar">
  <div>
    <div class="title">📄 تقرير تنفيذي — ${lead.companyName}</div>
    <div class="subtitle">مكسب لخدمات الاعمال · ${totalPages} صفحة تحليلية</div>
  </div>
  <div class="hint">⚠️ لحفظ PDF: فعّل "رسومات الخلفية" (Background graphics) في إعدادات الطباعة</div>
  <div style="display:flex;gap:8px;">
    <button class="btn-print" onclick="window.print()">⬇️ حفظ PDF</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
</div>
<div class="pages-container">
  <div class="page-wrapper">${page1}</div>
  <div class="page-wrapper">${page2}</div>
  <div class="page-wrapper">${page3}</div>
  ${hasWeb ? `<div class="page-wrapper">${pageWebsite}</div>` : ""}
  ${hasSocial ? `<div class="page-wrapper">${pageSocial}</div>` : ""}
  ${hasSeo ? `<div class="page-wrapper">${pageSEO}</div>` : ""}
  ${hasReviews ? `<div class="page-wrapper">${pageReviews}</div>` : ""}
  <div class="page-wrapper">${page4}</div>
  <div class="page-wrapper">${page5}</div>
</div>
</body>
</html>`;
}
