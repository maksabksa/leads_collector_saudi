// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — Dark Professional Report v7 (Print-Ready Dark)
//  صفحة 1: الغلاف  |  صفحة 2: الملخص التنفيذي
//  صفحة 3: التحليل الرقمي + Radar  |  صفحة 4: التوصيات + CTA
// ═══════════════════════════════════════════════════════════════════════

interface GeneratePDFOptions {
  lead?: any;
  websiteAnalysis?: any;
  socialAnalyses?: any[];
  report?: any;
  company?: any;
  competitors?: any[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sc(v?: number | null) {
  if (!v) return "#64748b";
  if (v >= 8) return "#22c55e";
  if (v >= 6) return "#eab308";
  if (v >= 4) return "#f97316";
  return "#ef4444";
}
function sg(v?: number | null) {
  if (!v) return "none";
  if (v >= 8) return "0 0 20px rgba(34,197,94,0.7)";
  if (v >= 6) return "0 0 20px rgba(234,179,8,0.7)";
  if (v >= 4) return "0 0 20px rgba(249,115,22,0.7)";
  return "0 0 20px rgba(239,68,68,0.7)";
}
function fmt(v?: number | null) { return v ? Number(v).toFixed(1) : "—"; }
function fmtK(v?: number | null) {
  if (!v) return "—";
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 1000) return (v / 1000).toFixed(1) + "K";
  return String(v);
}
function cleanPhone(v?: string | number | null) {
  if (!v) return "";
  const s = String(v).trim();
  return (s === "0" || s === "") ? "" : s;
}
function cleanUrl(url?: string | null, platform = "") {
  if (!url) return "";
  try {
    let c = url.replace(/https?:\/\/(www\.)?/, "");
    const patterns: Record<string, RegExp> = {
      instagram: /instagram\.com\/([^/?&]+)/,
      twitter: /(?:twitter|x)\.com\/([^/?&]+)/,
      tiktok: /tiktok\.com\/@?([^/?&]+)/,
      snapchat: /snapchat\.com\/add\/([^/?&]+)/,
    };
    const re = patterns[platform];
    if (re) { const m = c.match(re); return m ? `@${m[1]}` : c.split("/")[1] || c; }
    return c.split("/")[0];
  } catch { return url; }
}
function cleanMarkdown(t: string) {
  return t
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#f1f5f9;'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p style='margin-top:8px;'>")
    .replace(/\n/g, "<br>");
}
function parseSocialExtra(raw?: string | null) {
  if (!raw) return {};
  try { const o = JSON.parse(raw); return typeof o === "object" ? o : {}; } catch { return {}; }
}
function urg(level?: string | null) {
  switch (level) {
    case "high":   return { text: "أولوية عالية",   color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)" };
    case "medium": return { text: "أولوية متوسطة", color: "#eab308", bg: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.4)" };
    case "low":    return { text: "أولوية منخفضة", color: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.4)" };
    default:       return { text: "غير محدد",       color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)" };
  }
}
function pm(p: string) {
  const map: Record<string, { name: string; color: string; icon: string }> = {
    instagram: { name: "إنستغرام", color: "#e1306c", icon: "📸" },
    twitter:   { name: "تويتر / X", color: "#1da1f2", icon: "🐦" },
    tiktok:    { name: "تيك توك",   color: "#69c9d0", icon: "🎵" },
    snapchat:  { name: "سناب شات", color: "#fffc00", icon: "👻" },
    facebook:  { name: "فيسبوك",   color: "#1877f2", icon: "📘" },
    linkedin:  { name: "لينكد إن", color: "#0a66c2", icon: "💼" },
  };
  return map[p?.toLowerCase()] || { name: p || "منصة", color: "#64748b", icon: "📱" };
}

// ─── Score ring (dark) ────────────────────────────────────────────────────────
function ring(v?: number | null, size = 80, label = "") {
  const color = sc(v); const glow = sg(v);
  const d = v ? Number(v).toFixed(1) : "—";
  const fs = size > 70 ? 26 : 18;
  return `<div style="text-align:center;">
    <div style="width:${size}px;height:${size}px;border-radius:50%;
      border:3px solid ${color};box-shadow:${glow};
      display:flex;align-items:center;justify-content:center;
      font-size:${fs}px;font-weight:900;color:${color};
      background:rgba(6,13,26,0.9);margin:0 auto ${label ? "8px" : "0"};">
      ${d}
    </div>
    ${label ? `<div style="font-size:10px;color:#94a3b8;font-weight:600;letter-spacing:0.5px;">${label}</div>` : ""}
  </div>`;
}

// ─── Progress bar (dark) ──────────────────────────────────────────────────────
function bar(v?: number | null, label = "", max = 10) {
  const pct = v ? Math.min((v / max) * 100, 100) : 0;
  const color = sc(v);
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
      <span style="font-size:11.5px;color:#cbd5e1;font-weight:600;">${label}</span>
      <span style="font-size:12px;font-weight:800;color:${color};text-shadow:0 0 8px ${color}88;">${fmt(v)}</span>
    </div>
    <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;
        background:linear-gradient(90deg,${color},${color}cc);
        border-radius:4px;box-shadow:0 0 10px ${color}66;"></div>
    </div>
  </div>`;
}

// ─── Radar Chart SVG (dark) ───────────────────────────────────────────────────
function radarChart(axes: { label: string; value: number | null; market: number }[], size = 240) {
  const n = axes.length;
  if (n < 3) return "";
  const cx = size / 2, cy = size / 2, r = size * 0.36, levels = 5;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, ratio: number) => ({
    x: cx + r * ratio * Math.cos(angle(i)),
    y: cy + r * ratio * Math.sin(angle(i)),
  });

  let gridLines = "";
  for (let l = 1; l <= levels; l++) {
    const ratio = l / levels;
    const pts = Array.from({ length: n }, (_, i) => pt(i, ratio));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
    gridLines += `<path d="${d}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>`;
  }

  let axisLines = "";
  for (let i = 0; i < n; i++) {
    const p = pt(i, 1);
    axisLines += `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>`;
  }

  const mPts = axes.map((a, i) => pt(i, (a.market || 5) / 10));
  const mPath = mPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  const cPts = axes.map((a, i) => pt(i, Math.min(Math.max((a.value || 0) / 10, 0), 1)));
  const cPath = cPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  let labels = "";
  for (let i = 0; i < n; i++) {
    const a = angle(i);
    const lx = cx + (r + 26) * Math.cos(a);
    const ly = cy + (r + 26) * Math.sin(a);
    const anchor = Math.cos(a) > 0.1 ? "start" : Math.cos(a) < -0.1 ? "end" : "middle";
    const ax = axes[i];
    const valStr = ax.value !== null && ax.value !== undefined ? Number(ax.value).toFixed(1) : "—";
    const valColor = sc(ax.value);
    labels += `<text x="${lx.toFixed(1)}" y="${(ly - 4).toFixed(1)}" text-anchor="${anchor}" font-size="8.5" fill="#cbd5e1" font-weight="700" font-family="Tajawal,Arial,sans-serif">${ax.label}</text>`;
    labels += `<text x="${lx.toFixed(1)}" y="${(ly + 9).toFixed(1)}" text-anchor="${anchor}" font-size="9" fill="${valColor}" font-weight="900" font-family="Tajawal,Arial,sans-serif">${valStr}</text>`;
  }

  let dots = "";
  cPts.forEach(p => {
    dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#22c55e" stroke="rgba(34,197,94,0.3)" stroke-width="4"/>`;
  });

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;">
    ${gridLines}${axisLines}
    <path d="${mPath}" fill="rgba(100,116,139,0.15)" stroke="rgba(100,116,139,0.5)" stroke-width="1.5" stroke-dasharray="4,2"/>
    <path d="${cPath}" fill="rgba(34,197,94,0.12)" stroke="#22c55e" stroke-width="2.5" filter="url(#glow)"/>
    <defs><filter id="glow"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    ${dots}${labels}
  </svg>`;
}

// ─── Section header (dark) ────────────────────────────────────────────────────
function sh(title: string, sub = "") {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
    <div style="width:4px;height:24px;border-radius:2px;
      background:linear-gradient(180deg,#22c55e,#0ea5e9);
      box-shadow:0 0 10px rgba(34,197,94,0.6);flex-shrink:0;"></div>
    <div>
      <div style="font-size:15px;font-weight:800;color:#f1f5f9;letter-spacing:0.3px;">${title}</div>
      ${sub ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">${sub}</div>` : ""}
    </div>
  </div>`;
}

// ─── Card (dark) ──────────────────────────────────────────────────────────────
function card(content: string, accent = "#22c55e", extraStyle = "") {
  return `<div style="background:linear-gradient(135deg,#0d1f3c 0%,#080f1e 100%);
    border:1px solid ${accent}22;border-radius:14px;padding:18px 20px;
    position:relative;overflow:hidden;${extraStyle}">
    <div style="position:absolute;top:0;right:0;width:100px;height:100px;
      background:radial-gradient(circle,${accent}08 0%,transparent 70%);pointer-events:none;"></div>
    ${content}
  </div>`;
}

// ─── Page wrapper (dark A4) ───────────────────────────────────────────────────
function page(content: string, pageBreak = true) {
  return `<div style="width:210mm;min-height:297mm;padding:0;margin:0 auto;
    background:linear-gradient(160deg,#020810 0%,#060d1a 60%,#020810 100%);
    position:relative;overflow:hidden;
    ${pageBreak ? "page-break-after:always;break-after:page;" : ""}">
    ${content}
  </div>`;
}

// ─── Info row (dark) ──────────────────────────────────────────────────────────
function infoRow(label: string, value: string, icon = "") {
  if (!value) return "";
  return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
    <span style="font-size:11px;color:#475569;min-width:80px;flex-shrink:0;">${icon} ${label}</span>
    <span style="font-size:11px;color:#cbd5e1;font-weight:600;flex:1;word-break:break-all;">${value}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════
export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company, competitors = [] } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");

  // ─── Auto-fill missing data intelligently ────────────────────────────────────
  function autoFillData() {
    const biz = lead.businessType || "نشاط تجاري";
    const city = lead.city || "الرياض";
    const hasSocial = socialAnalyses.length > 0;
    const hasWebsite = !!lead.website;
    const avgSocialScore = hasSocial
      ? socialAnalyses.reduce((sum: number, s: any) => sum + (Number(s.engagementScore) || 0), 0) / socialAnalyses.length
      : 0;

    // Auto-compute priority score if missing
    if (!lead.leadPriorityScore) {
      let score = 5.0;
      if (hasSocial && avgSocialScore >= 7) score += 1.5;
      else if (hasSocial && avgSocialScore >= 5) score += 0.8;
      if (hasWebsite) score += 0.5;
      if (lead.phone || lead.verifiedPhone) score += 0.5;
      if (socialAnalyses.length >= 3) score += 0.5;
      lead.leadPriorityScore = Math.min(score, 9.5).toFixed(1);
    }

    // Auto-compute data quality score if missing
    if (!lead.dataQualityScore) {
      let score = 3.0;
      if (lead.phone || lead.verifiedPhone) score += 1.5;
      if (hasWebsite) score += 1.0;
      if (hasSocial) score += 1.5;
      if (lead.city) score += 0.5;
      if (lead.businessType) score += 0.5;
      if (lead.instagramUrl || lead.tiktokUrl) score += 0.5;
      lead.dataQualityScore = Math.min(score, 9.5).toFixed(1);
    }

    // Auto-generate marketing gaps if missing
    if (!lead.biggestMarketingGap) {
      const autoGaps: string[] = [];
      if (!hasWebsite) autoGaps.push(`غياب الموقع الإلكتروني يُضعف المصداقية ويُفوّت عملاء يبحثون عن ${biz} في ${city}`);
      if (!hasSocial) autoGaps.push(`لا يوجد حضور على منصات التواصل الاجتماعي مما يُقلّص الوصول للعملاء المحتملين`);
      if (hasSocial && avgSocialScore < 6) autoGaps.push(`ضعف التفاعل على السوشيال ميديا (${avgSocialScore.toFixed(1)}/10) يُشير لمحتوى غير جذاب أو نشر غير منتظم`);
      if (!lead.phone && !lead.verifiedPhone) autoGaps.push(`غياب معلومات الاتصال المباشر يُصعّب على العملاء التواصل والشراء`);
      if (hasSocial && !lead.website) autoGaps.push(`وجود حضور رقمي دون موقع إلكتروني يُفوّت فرصة تحويل المتابعين لعملاء فعليين`);
      if (!lead.instagramUrl && !lead.tiktokUrl) autoGaps.push(`غياب الحضور على إنستغرام وتيك توك يُضيّع شريحة واسعة من العملاء الشباب في ${city}`);
      if (autoGaps.length === 0) autoGaps.push(`إمكانية تحسين استراتيجية المحتوى الرقمي لزيادة التفاعل والتحويل`);
      lead.biggestMarketingGap = autoGaps.join("\n");
    }

    // Auto-generate recommendations if missing
    if (!report) return;
    if (!report.recommendations) {
      const autoRecs: string[] = [];
      if (!hasWebsite) autoRecs.push(`إنشاء موقع إلكتروني احترافي لـ${biz} في ${city} مع صفحة هبوط تُبرز الخدمات وتحتوي على نموذج تواصل واضح`);
      if (hasSocial && avgSocialScore < 7) autoRecs.push(`تحسين استراتيجية المحتوى على ${socialAnalyses.map((s: any) => pm(s.platform).name).join(' و')} بنشر محتوى يومي منتظم يُظهر المنتجات والخدمات بشكل جذاب`);
      if (!lead.instagramUrl) autoRecs.push(`إنشاء حساب إنستغرام احترافي مع هوية بصرية موحدة وجدول نشر أسبوعي منتظم`);
      if (!lead.tiktokUrl) autoRecs.push(`الانطلاق على تيك توك بمقاطع قصيرة تُظهر ${biz} بأسلوب ترفيهي لاستهداف الجيل الجديد`);
      autoRecs.push(`تفعيل حملات إعلانية مدفوعة على منصات التواصل الاجتماعي لاستهداف العملاء في ${city} وزيادة الوصول`);
      report.recommendations = autoRecs.join("\n");
    }

    // Auto-generate executive summary if missing
    if (!report.executiveSummary && !report.summary) {
      const platforms = socialAnalyses.map((s: any) => pm(s.platform).name).join(" و ");
      report.executiveSummary = `يمتلك ${lead.companyName || biz} في ${city} حضوراً رقمياً ${hasSocial ? `على منصات ${platforms}` : "محدوداً"} مع إمكانات نمو واعدة. ${hasWebsite ? "الموقع الإلكتروني موجود لكن يحتاج تحسيناً." : "غياب الموقع الإلكتروني يُمثّل فرصة كبيرة للتطوير."} التحليل يُشير إلى فرص واضحة لتعزيز الحضور الرقمي وزيادة قاعدة العملاء من خلال استراتيجية تسويقية متكاملة.`;
    }

    // Auto-generate revenue opportunity if missing
    if (!lead.revenueOpportunity) {
      lead.revenueOpportunity = `بناءً على حجم السوق في ${city} ونوع النشاط (${biz})، تُقدَّر الفرصة الإيرادية الشهرية بـ 15,000 - 45,000 ريال إضافية من خلال تحسين الحضور الرقمي واستهداف العملاء المحتملين بشكل أكثر فعالية.`;
    }

    // Auto-generate entry angle if missing
    if (!lead.entryAngle) {
      lead.entryAngle = `البدء بتقديم حزمة إدارة السوشيال ميديا المتكاملة لـ${biz} مع ضمان نتائج خلال 30 يوماً، مع تقديم تقرير أداء أسبوعي شفاف لبناء الثقة وإثبات الكفاءة.`;
    }
  }
  autoFillData();

  const coName     = company?.companyName || "مكسب";
  const coLogo     = company?.logoUrl || "";
  const clLogo     = lead.clientLogoUrl || "";
  const reportDate = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const urgency    = urg(lead.urgencyLevel || lead.priority);
  const priScore   = lead.leadPriorityScore ? Number(lead.leadPriorityScore) : null;
  const qualScore  = lead.dataQualityScore  ? Number(lead.dataQualityScore)  : null;
  const wsScore    = websiteAnalysis?.overallScore ? Number(websiteAnalysis.overallScore) : null;

  // ── Phones ──
  const phones: string[] = [];
  const vp = cleanPhone(lead.verifiedPhone), lp = cleanPhone(lead.phone);
  if (vp) phones.push(vp);
  if (lp && lp !== vp) phones.push(lp);
  try {
    const arr = typeof lead.additionalPhones === "string" ? JSON.parse(lead.additionalPhones) : lead.additionalPhones;
    if (Array.isArray(arr)) arr.forEach((p: string) => { const cp = cleanPhone(p); if (cp && !phones.includes(cp)) phones.push(cp); });
  } catch {}

  // ── Gaps ──
  const gaps: string[] = [];
  if (lead.biggestMarketingGap) {
    lead.biggestMarketingGap.split(/\n|•|-/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5).forEach((g: string) => gaps.push(g));
  }
  if (!gaps.length && report?.gaps) {
    try {
      const arr = typeof report.gaps === "string" ? JSON.parse(report.gaps) : report.gaps;
      if (Array.isArray(arr)) arr.slice(0, 5).forEach((g: any) => gaps.push(typeof g === "string" ? g : g.title || g.gap || ""));
    } catch {}
  }

  // ── Social ──
  const bestSocial = socialAnalyses.reduce((best: any, s: any) => {
    if (!best || (s.engagementScore || 0) > (best.engagementScore || 0)) return s;
    return best;
  }, null);

  // ── Recs ──
  const recs: string[] = [];
  if (report?.recommendations) {
    report.recommendations.split(/\n|•|-|\d+\./).map((s: string) => s.trim()).filter(Boolean).slice(0, 5).forEach((r: string) => recs.push(r));
  }
  if (!recs.length && lead.entryAngle) {
    lead.entryAngle.split(/\n/).map((s: string) => s.trim()).filter(Boolean).slice(0, 3).forEach((r: string) => recs.push(r));
  }

  // ── Radar axes ──
  const radarAxes = [
    { label: "الأولوية",    value: priScore,                              market: 6 },
    { label: "الموقع",      value: wsScore,                               market: 5 },
    { label: "السوشيال",    value: bestSocial?.engagementScore ?? null,   market: 5.5 },
    { label: "المحتوى",     value: bestSocial?.contentQualityScore ?? null, market: 5 },
    { label: "SEO",          value: websiteAnalysis?.seoScore ?? null,     market: 4.5 },
    { label: "البيانات",    value: qualScore,                              market: 6 },
  ];

  const safeLeadName = (lead.companyName || "عميل").replace(/[/\\?%*:|"<>]/g, "-");
  const fileName = `تحليل مخصص لعناية - ${safeLeadName}.pdf`;

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 1 — COVER (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p1 = page(`
    <!-- Decorative bg elements -->
    <div style="position:absolute;top:-80px;right:-80px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-100px;left:-60px;width:400px;height:400px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- Top bar -->
    <div style="padding:22px 40px 18px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:14px;">
        ${coLogo
          ? `<img src="${coLogo}" style="height:46px;width:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.1);padding:4px;background:rgba(255,255,255,0.05);" alt="logo">`
          : `<div style="width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:white;">${coName.charAt(0)}</div>`}
        <div>
          <div style="font-size:20px;font-weight:900;color:#f1f5f9;letter-spacing:0.5px;">${coName}</div>
          <div style="font-size:10px;color:#475569;margin-top:2px;letter-spacing:1px;">تقرير تحليل تسويقي متخصص</div>
        </div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:10px;color:#475569;margin-bottom:3px;">تاريخ الإصدار</div>
        <div style="font-size:13px;font-weight:700;color:#94a3b8;">${reportDate}</div>
        <div style="margin-top:8px;padding:4px 12px;background:${urgency.bg};border:1px solid ${urgency.border};
          border-radius:20px;font-size:10px;font-weight:700;color:${urgency.color};display:inline-block;
          box-shadow:0 0 12px ${urgency.border};">${urgency.text}</div>
      </div>
    </div>

    <!-- Client hero -->
    <div style="padding:44px 40px 36px;text-align:center;position:relative;">
      ${clLogo ? `<div style="margin-bottom:24px;"><img src="${clLogo}" style="height:90px;width:auto;max-width:220px;border-radius:16px;border:2px solid rgba(255,255,255,0.1);padding:10px;background:rgba(255,255,255,0.04);" alt="client logo"></div>` : ""}
      <div style="font-size:11px;color:#475569;font-weight:600;letter-spacing:3px;margin-bottom:10px;">تقرير تحليل مخصص لعناية</div>
      <div style="font-size:38px;font-weight:900;color:#f8fafc;margin-bottom:10px;
        text-shadow:0 0 40px rgba(34,197,94,0.2);letter-spacing:0.5px;">${lead.companyName || "العميل"}</div>
      <div style="font-size:15px;color:#64748b;margin-bottom:20px;">
        ${lead.businessType || ""} ${lead.city ? `<span style="color:#334155;">·</span> ${lead.city}` : ""}
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 24px;
        background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:24px;
        box-shadow:0 0 20px rgba(34,197,94,0.1);">
        <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div>
        <span style="font-size:12px;color:#22c55e;font-weight:700;letter-spacing:0.5px;">تحليل رقمي شامل · 4 محاور رئيسية</span>
      </div>
    </div>

    <!-- Score rings -->
    <div style="padding:0 40px 28px;">
      <div style="font-size:11px;color:#334155;font-weight:700;text-align:center;margin-bottom:18px;
        letter-spacing:2px;text-transform:uppercase;">ملخص التقييم الرقمي</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
        ${[
          { v: priScore,                           label: "الأولوية" },
          { v: qualScore,                          label: "جودة البيانات" },
          { v: wsScore,                            label: "تقييم الموقع" },
          { v: bestSocial?.engagementScore ?? null, label: "التفاعل الرقمي" },
        ].map(({ v, label }) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
          border-radius:14px;padding:16px 10px;text-align:center;">
          ${ring(v, 72)}
          <div style="font-size:10px;color:#475569;margin-top:10px;font-weight:600;">${label}</div>
        </div>`).join("")}
      </div>
    </div>

    <!-- Contact info -->
    <div style="padding:0 40px 28px;">
      <div style="font-size:11px;color:#334155;font-weight:700;margin-bottom:12px;letter-spacing:1px;">معلومات الاتصال</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 30px;">
        ${infoRow("الهاتف", phones.slice(0, 2).join(" | "), "📞")}
        ${infoRow("الموقع", cleanUrl(lead.website), "🌐")}
        ${infoRow("إنستغرام", cleanUrl(lead.instagramUrl, "instagram"), "📸")}
        ${infoRow("تيك توك", cleanUrl(lead.tiktokUrl, "tiktok"), "🎵")}
        ${infoRow("سناب شات", cleanUrl(lead.snapchatUrl, "snapchat"), "👻")}
        ${infoRow("تويتر", cleanUrl(lead.twitterUrl, "twitter"), "🐦")}
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 40px;
      background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 1 من 4</div>
    </div>

    <!-- Watermark -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);
      font-size:64px;font-weight:900;color:rgba(34,197,94,0.03);white-space:nowrap;
      pointer-events:none;z-index:0;letter-spacing:6px;">حصري من ${coName}</div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 2 — EXECUTIVE SUMMARY (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const execSummary = report?.executiveSummary || report?.summary || lead.revenueOpportunity || "";
  const entryAngle  = lead.entryAngle || report?.entryAngle || "";
  const revenueOpp  = lead.revenueOpportunity || "";

  const p2 = page(`
    <!-- Decorative -->
    <div style="position:absolute;top:-60px;left:-60px;width:300px;height:300px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- Page header -->
    <div style="padding:22px 40px 18px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:28px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);box-shadow:0 0 12px rgba(34,197,94,0.5);"></div>
        <div style="font-size:18px;font-weight:900;color:#f1f5f9;">الملخص التنفيذي</div>
      </div>
      <div style="font-size:10px;color:#334155;">${lead.companyName || ""} · ${coName} · صفحة 2/4</div>
    </div>

    <div style="padding:24px 40px;">

      <!-- Executive summary -->
      ${execSummary ? `
      <div style="margin-bottom:22px;">
        ${sh("نظرة عامة على الوضع الحالي", "تقييم شامل للحضور الرقمي والفرص المتاحة")}
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.15);
          border-right:4px solid #0ea5e9;border-radius:0 12px 12px 0;padding:16px 20px;">
          <p style="font-size:12.5px;color:#cbd5e1;line-height:1.9;margin:0;">${cleanMarkdown(execSummary)}</p>
        </div>
      </div>` : ""}

      <!-- Gaps -->
      ${gaps.length ? `
      <div style="margin-bottom:22px;">
        ${sh("أبرز الثغرات التسويقية", "نقاط الضعف التي تستوجب معالجة فورية لتحقيق النمو")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${gaps.map((g, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
            background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:10px;">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(239,68,68,0.2);
              border:1px solid rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center;
              flex-shrink:0;margin-top:1px;">
              <span style="font-size:11px;font-weight:900;color:#ef4444;">${i + 1}</span>
            </div>
            <span style="font-size:11.5px;color:#cbd5e1;line-height:1.6;">${g}</span>
          </div>`).join("")}
        </div>
      </div>` : ""}

      <!-- Missed Opportunities Section -->
      ${gaps.length ? `
      <div style="margin-bottom:22px;">
        ${sh("الفرص الضائعة وتأثيرها المالي", "كل فرصة ضائعة = إيراد مفقود يمكن استعادته")}
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${gaps.map((g, i) => {
            const colors = ["#ef4444","#f97316","#eab308","#22c55e","#0ea5e9"];
            const icons = ["⚠️","📉","💡","🔗","🎯"];
            const impacts = ["8,000 - 20,000 ريال/شهر","5,000 - 15,000 ريال/شهر","3,000 - 10,000 ريال/شهر","2,000 - 8,000 ريال/شهر","1,500 - 5,000 ريال/شهر"];
            const solutions = ["حزمة مكسب الشاملة","إدارة سوشيال ميديا","تصميم موقع إلكتروني","حملات إعلانية مدفوعة","استشارة تسويقية"];
            const c = colors[i % colors.length];
            return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
              background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
              border-right:3px solid ${c};border-radius:0 10px 10px 0;">
              <div style="flex-shrink:0;font-size:16px;margin-top:1px;">${icons[i % icons.length]}</div>
              <div style="flex:1;">
                <div style="font-size:11.5px;color:#cbd5e1;line-height:1.6;margin-bottom:6px;">${g}</div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="font-size:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:2px 10px;color:#fca5a5;font-weight:700;">فرصة ضائعة: ${impacts[i % impacts.length]}</span>
                  <span style="font-size:10px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:2px 10px;color:#86efac;font-weight:700;">الحل: ${solutions[i % solutions.length]}</span>
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}

      <!-- Revenue & Entry -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;">
        ${revenueOpp ? `
        <div>
          ${sh("فرصة الإيراد المتاحة")}
          ${card(`<p style="font-size:12px;color:#94a3b8;line-height:1.8;margin:0;">${cleanMarkdown(revenueOpp)}</p>`, "#22c55e")}
        </div>` : ""}
        ${entryAngle ? `
        <div>
          ${sh("زاوية الدخول المقترحة")}
          ${card(`<p style="font-size:12px;color:#94a3b8;line-height:1.8;margin:0;">${cleanMarkdown(entryAngle)}</p>`, "#0ea5e9")}
        </div>` : ""}
      </div>

      <!-- KPI bars -->
      <div>
        ${sh("مؤشرات الأداء الرئيسية", "مقارنة شاملة لأبعاد الحضور الرقمي")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 30px;">
          ${bar(priScore, "درجة الأولوية التسويقية")}
          ${bar(qualScore, "جودة وشمولية البيانات")}
          ${bar(wsScore, "تقييم الموقع الإلكتروني")}
          ${bar(bestSocial?.engagementScore, "التفاعل على السوشيال ميديا")}
          ${bar(websiteAnalysis?.seoScore, "تحسين محركات البحث SEO")}
          ${bar(websiteAnalysis?.mobileScore, "تجربة المستخدم على الجوال")}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">${coName} · تقرير سري ومخصص</div>
      <div style="font-size:9px;color:#334155;">صفحة 2 من 4</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 3 — DIGITAL ANALYSIS + RADAR (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p3 = page(`
    <!-- Decorative -->
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.04) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- Page header -->
    <div style="padding:22px 40px 18px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:28px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);box-shadow:0 0 12px rgba(34,197,94,0.5);"></div>
        <div style="font-size:18px;font-weight:900;color:#f1f5f9;">التحليل الرقمي التفصيلي</div>
      </div>
      <div style="font-size:10px;color:#334155;">${lead.companyName || ""} · ${coName} · صفحة 3/4</div>
    </div>

    <div style="padding:20px 40px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

        <!-- Left: Website + Social bars -->
        <div>
          <!-- Website -->
          <div style="margin-bottom:18px;">
            ${sh("تحليل الموقع الإلكتروني", lead.website ? cleanUrl(lead.website) : "لا يوجد موقع")}
            ${wsScore !== null ? `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
              ${[
                { v: wsScore,                           label: "الكلي" },
                { v: websiteAnalysis?.speedScore,       label: "السرعة" },
                { v: websiteAnalysis?.mobileScore,      label: "الجوال" },
              ].map(({ v, label }) => `
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 8px;text-align:center;">
                ${ring(v, 56)}
                <div style="font-size:9px;color:#475569;margin-top:8px;font-weight:600;">${label}</div>
              </div>`).join("")}
            </div>
            ${bar(websiteAnalysis?.seoScore, "تحسين SEO")}
            ${bar(websiteAnalysis?.contentQualityScore, "جودة المحتوى")}
            ${bar(websiteAnalysis?.designScore, "التصميم والتجربة")}
            ${bar(websiteAnalysis?.conversionScore, "وضوح العروض والـ CTA")}
            ` : `${card('<div style="text-align:center;padding:10px;font-size:11px;color:#475569;">لم يتم تحليل الموقع بعد</div>', "#475569")}`}
          </div>

          <!-- Social -->
          <div>
            ${sh("تحليل السوشيال ميديا", bestSocial ? `أفضل منصة: ${pm(bestSocial.platform).name}` : "")}
            ${bestSocial ? `
            ${(() => {
              const extra = parseSocialExtra(bestSocial.rawData);
              const followers = extra.followers || extra.followersCount || bestSocial.followersCount;
              const posts = extra.posts || extra.postsCount || bestSocial.postsCount;
              const following = extra.following || extra.followingCount;
              return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
                ${[
                  { v: fmtK(followers), label: "متابع", color: "#22c55e" },
                  { v: fmtK(posts),     label: "منشور", color: "#0ea5e9" },
                  { v: fmtK(following), label: "يتابع",  color: "#a78bfa" },
                ].map(({ v, label, color }) => `
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:12px 8px;text-align:center;">
                  <div style="font-size:18px;font-weight:900;color:${color};text-shadow:0 0 12px ${color}66;">${v}</div>
                  <div style="font-size:9px;color:#475569;margin-top:4px;font-weight:600;">${label}</div>
                </div>`).join("")}
              </div>`;
            })()}
            ${bar(bestSocial.engagementScore, "درجة التفاعل")}
            ${bar(bestSocial.contentQualityScore, "جودة المحتوى")}
            ${bar(bestSocial.overallScore, "التقييم الإجمالي")}
            ` : `${card('<div style="text-align:center;padding:10px;font-size:11px;color:#475569;">لم يتم تحليل السوشيال ميديا بعد</div>', "#475569")}`}
          </div>
        </div>

        <!-- Right: Radar chart -->
        <div>
          ${sh("مخطط المقارنة بمتوسط السوق", "العميل (أخضر) مقابل متوسط السوق (رمادي)")}
          <div style="display:flex;justify-content:center;margin-bottom:14px;">
            ${radarChart(radarAxes, 230)}
          </div>
          <!-- Legend -->
          <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:24px;height:3px;background:#22c55e;border-radius:2px;box-shadow:0 0 6px #22c55e;"></div>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">${lead.companyName || "العميل"}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <div style="width:24px;height:3px;background:#64748b;border-radius:2px;border-top:2px dashed #64748b;"></div>
              <span style="font-size:10px;color:#94a3b8;font-weight:600;">متوسط السوق</span>
            </div>
          </div>

          <!-- All platforms -->
          ${socialAnalyses.length > 0 ? `
          <div style="margin-top:4px;">
            ${sh("أداء المنصات", `${socialAnalyses.length} منصة محللة`)}
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
              ${socialAnalyses.slice(0, 4).map(s => {
                const meta = pm(s.platform);
                const score = s.engagementScore ? Number(s.engagementScore) : null;
                const color = sc(score);
                return `<div style="padding:10px 12px;background:rgba(255,255,255,0.03);
                  border:1px solid rgba(255,255,255,0.06);border-radius:10px;
                  border-right:3px solid ${meta.color};display:flex;align-items:center;gap:10px;">
                  <div style="font-size:18px;">${meta.icon}</div>
                  <div>
                    <div style="font-size:11px;font-weight:700;color:#f1f5f9;">${meta.name}</div>
                    <div style="font-size:18px;font-weight:900;color:${color};text-shadow:0 0 10px ${color}66;line-height:1.2;">${fmt(score)}</div>
                    <div style="font-size:9px;color:#475569;">درجة التفاعل</div>
                  </div>
                </div>`;
              }).join("")}
            </div>
          </div>` : ""}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">${coName} · تقرير سري ومخصص</div>
      <div style="font-size:9px;color:#334155;">صفحة 3 من 5</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 4 — RECOMMENDATIONS + CTA (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p4 = page(`
    <!-- Decorative -->
    <div style="position:absolute;bottom:-80px;right:-60px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- Page header -->
    <div style="padding:22px 40px 18px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:28px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);box-shadow:0 0 12px rgba(34,197,94,0.5);"></div>
        <div style="font-size:18px;font-weight:900;color:#f1f5f9;">التوصيات والخطوات التالية</div>
      </div>
      <div style="font-size:10px;color:#334155;">${lead.companyName || ""} · ${coName} · صفحة 4/4</div>
    </div>

    <div style="padding:24px 40px;">

      <!-- Recommendations -->
      ${recs.length ? `
      <div style="margin-bottom:24px;">
        ${sh("التوصيات الاستراتيجية", "خطوات عملية مرتبة بالأولوية لتحسين الأداء التسويقي")}
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${recs.map((r, i) => {
            const accent = i === 0 ? "#22c55e" : i === 1 ? "#0ea5e9" : i === 2 ? "#a78bfa" : "#f97316";
            return `<div style="display:flex;align-items:flex-start;gap:14px;padding:14px 18px;
              background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
              border-right:3px solid ${accent};border-radius:0 12px 12px 0;">
              <div style="width:28px;height:28px;border-radius:50%;
                background:rgba(255,255,255,0.05);border:2px solid ${accent}44;
                display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <span style="font-size:13px;font-weight:900;color:${accent};text-shadow:0 0 8px ${accent};">${i + 1}</span>
              </div>
              <div style="flex:1;">
                <div style="font-size:12.5px;color:#cbd5e1;line-height:1.7;">${r}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}

      <!-- Report notes -->
      ${report?.fullReport ? `
      <div style="margin-bottom:22px;">
        ${sh("ملاحظات تحليلية إضافية")}
        <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
          border-radius:12px;padding:16px 18px;max-height:100px;overflow:hidden;">
          <p style="font-size:11.5px;color:#64748b;line-height:1.8;margin:0;">${cleanMarkdown(report.fullReport.substring(0, 450))}...</p>
        </div>
      </div>` : ""}

      <!-- CTA -->
      <div style="background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 50%,#0a1628 100%);
        border:1px solid rgba(34,197,94,0.2);border-radius:16px;padding:30px 36px;
        text-align:center;position:relative;overflow:hidden;
        box-shadow:0 0 40px rgba(34,197,94,0.08);">
        <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;
          background:radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%);pointer-events:none;"></div>
        <div style="position:absolute;bottom:-50px;left:-30px;width:180px;height:180px;border-radius:50%;
          background:radial-gradient(circle,rgba(14,165,233,0.06) 0%,transparent 70%);pointer-events:none;"></div>
        <div style="position:relative;z-index:1;">
          <div style="font-size:11px;color:#334155;margin-bottom:10px;letter-spacing:2px;font-weight:600;">الخطوة التالية</div>
          <div style="font-size:22px;font-weight:900;color:#f8fafc;margin-bottom:10px;
            text-shadow:0 0 30px rgba(34,197,94,0.2);">
            هل أنت مستعد للارتقاء بـ ${lead.companyName || "عملك"}؟
          </div>
          <div style="font-size:13px;color:#64748b;margin-bottom:24px;line-height:1.7;max-width:400px;margin-left:auto;margin-right:auto;">
            تواصل معنا اليوم للحصول على استشارة مجانية وخطة عمل تسويقية مخصصة لنشاطك
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
            ${company?.phone ? `
            <div style="padding:10px 22px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);
              border-radius:24px;font-size:12px;font-weight:700;color:#22c55e;
              box-shadow:0 0 16px rgba(34,197,94,0.15);">📞 ${company.phone}</div>` : ""}
            <div style="padding:10px 22px;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.3);
              border-radius:24px;font-size:12px;font-weight:700;color:#0ea5e9;
              box-shadow:0 0 16px rgba(14,165,233,0.15);">🌐 ${company?.website || "maksab-ksa.com"}</div>
            ${company?.email ? `
            <div style="padding:10px 22px;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);
              border-radius:24px;font-size:12px;font-weight:700;color:#a78bfa;
              box-shadow:0 0 16px rgba(167,139,250,0.15);">✉️ ${company.email}</div>` : ""}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 40px;
      background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 4 من 5</div>
    </div>
  `, false);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 5 — COMPETITOR COMPARISON (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  function buildCompetitorRow(comp: any, rank: number, isClient = false) {
    const priScore = comp.leadPriorityScore ? Number(comp.leadPriorityScore) : null;
    const qualScore = comp.dataQualityScore ? Number(comp.dataQualityScore) : null;
    const platforms = [
      comp.instagramUrl ? 'إنستغرام' : null,
      comp.tiktokUrl ? 'تيك توك' : null,
      comp.twitterUrl ? 'تويتر/X' : null,
      comp.snapchatUrl ? 'سناب شات' : null,
      comp.facebookUrl ? 'فيسبوك' : null,
      comp.linkedinUrl ? 'لينكدإن' : null,
    ].filter(Boolean);
    const platformCount = platforms.length;
    const hasWebsite = !!comp.website;
    const hasPhone = !!(comp.phone || comp.verifiedPhone);
    const accent = isClient ? '#22c55e' : rank === 1 ? '#f97316' : rank === 2 ? '#eab308' : '#64748b';
    const bg = isClient ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)';
    const border = isClient ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)';
    const label = isClient ? '⭐ أنت' : `#${rank}`;
    return `<div style="display:grid;grid-template-columns:32px 1fr 70px 70px 80px 80px 60px;gap:8px;align-items:center;
      padding:12px 16px;background:${bg};border:1px solid ${border};
      border-right:3px solid ${accent};border-radius:0 10px 10px 0;margin-bottom:6px;">
      <div style="font-size:11px;font-weight:900;color:${accent};text-align:center;">${label}</div>
      <div>
        <div style="font-size:12px;font-weight:700;color:#f1f5f9;">${comp.companyName || 'غير معروف'}</div>
        <div style="font-size:9.5px;color:#475569;margin-top:2px;">${comp.businessType || ''} ${comp.city ? '· ' + comp.city : ''}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:14px;font-weight:900;color:${sc(priScore)};text-shadow:0 0 8px ${sc(priScore)}66;">${fmt(priScore)}</div>
        <div style="font-size:8px;color:#475569;">الأولوية</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:14px;font-weight:900;color:${sc(qualScore)};text-shadow:0 0 8px ${sc(qualScore)}66;">${fmt(qualScore)}</div>
        <div style="font-size:8px;color:#475569;">جودة البيانات</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:13px;font-weight:800;color:${platformCount >= 3 ? '#22c55e' : platformCount >= 1 ? '#eab308' : '#ef4444'};">${platformCount} منصة</div>
        <div style="font-size:8px;color:#475569;">${platforms.slice(0, 2).join(' · ') || 'لا يوجد'}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:13px;">${hasWebsite ? '✅' : '❌'}</div>
        <div style="font-size:8px;color:#475569;">موقع إلكتروني</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:13px;">${hasPhone ? '✅' : '❌'}</div>
        <div style="font-size:8px;color:#475569;">هاتف</div>
      </div>
    </div>`;
  }

  // حساب ترتيب العميل بين المنافسين
  const allEntities = [
    { ...lead, isClient: true },
    ...competitors.slice(0, 5),
  ].sort((a, b) => (Number(b.leadPriorityScore) || 0) - (Number(a.leadPriorityScore) || 0));

  const clientRank = allEntities.findIndex((e: any) => e.isClient) + 1;
  const totalInComparison = allEntities.length;

  // تحليل نقاط القوة والضعف مقارنةً بالمنافسين
  const avgCompPriority = competitors.length
    ? competitors.reduce((s, c) => s + (Number(c.leadPriorityScore) || 0), 0) / competitors.length
    : 0;
  const avgCompPlatforms = competitors.length
    ? competitors.reduce((s, c) => s + [c.instagramUrl, c.tiktokUrl, c.twitterUrl, c.snapchatUrl, c.facebookUrl, c.linkedinUrl].filter(Boolean).length, 0) / competitors.length
    : 0;
  const clientPlatforms = [lead.instagramUrl, lead.tiktokUrl, lead.twitterUrl, lead.snapchatUrl, lead.facebookUrl, lead.linkedinUrl].filter(Boolean).length;
  const clientPri = Number(lead.leadPriorityScore) || 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (clientPri > avgCompPriority + 0.5) strengths.push(`درجة الأولوية (${clientPri.toFixed(1)}) أعلى من متوسط المنافسين (${avgCompPriority.toFixed(1)})`);
  else if (clientPri < avgCompPriority - 0.5) weaknesses.push(`درجة الأولوية (${clientPri.toFixed(1)}) أقل من متوسط المنافسين (${avgCompPriority.toFixed(1)})`);
  if (clientPlatforms > avgCompPlatforms + 0.5) strengths.push(`حضور على ${clientPlatforms} منصات مقابل متوسط ${avgCompPlatforms.toFixed(1)} للمنافسين`);
  else if (clientPlatforms < avgCompPlatforms - 0.5) weaknesses.push(`حضور على ${clientPlatforms} منصات فقط مقابل متوسط ${avgCompPlatforms.toFixed(1)} للمنافسين`);
  if (lead.website && competitors.filter((c: any) => c.website).length < competitors.length / 2) strengths.push('يمتلك موقعاً إلكترونياً بينما أغلب المنافسين لا يمتلكون');
  if (!lead.website && competitors.filter((c: any) => c.website).length > competitors.length / 2) weaknesses.push('لا يمتلك موقعاً إلكترونياً بينما أغلب المنافسين يمتلكون');
  if (strengths.length === 0) strengths.push('يمتلك إمكانات تنافسية واعدة في السوق المحلي');
  if (weaknesses.length === 0) weaknesses.push('يحتاج تعزيز الحضور الرقمي لمواكبة المنافسين');

  const p5 = competitors.length === 0 ? '' : page(`
    <!-- Decorative -->
    <div style="position:absolute;top:-60px;left:-60px;width:300px;height:300px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.06) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- Header -->
    <div style="padding:22px 40px 18px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:4px;height:28px;border-radius:2px;background:linear-gradient(180deg,#0ea5e9,#a78bfa);box-shadow:0 0 12px rgba(14,165,233,0.5);"></div>
        <div style="font-size:18px;font-weight:900;color:#f1f5f9;">تحليل المنافسين والموقع التنافسي</div>
      </div>
      <div style="font-size:10px;color:#334155;">${lead.companyName || ''} · ${coName} · صفحة 5/5</div>
    </div>

    <div style="padding:20px 40px;">

      <!-- Ranking badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:70px;height:70px;border-radius:50%;
            background:linear-gradient(135deg,rgba(34,197,94,0.15),rgba(14,165,233,0.1));
            border:2px solid rgba(34,197,94,0.4);
            display:flex;flex-direction:column;align-items:center;justify-content:center;
            box-shadow:0 0 20px rgba(34,197,94,0.2);">
            <div style="font-size:22px;font-weight:900;color:#22c55e;">#${clientRank}</div>
            <div style="font-size:8px;color:#475569;">من ${totalInComparison}</div>
          </div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#f1f5f9;">الترتيب التنافسي لـ ${lead.companyName || 'العميل'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px;">في ${lead.businessType || 'المجال'} بـ${lead.city || 'المدينة'}</div>
          </div>
        </div>
        <div style="text-align:center;padding:12px 20px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
          <div style="font-size:11px;color:#475569;margin-bottom:4px;">متوسط الأولوية للمنافسين</div>
          <div style="font-size:20px;font-weight:900;color:${sc(avgCompPriority)};">${avgCompPriority.toFixed(1)}</div>
        </div>
      </div>

      <!-- Comparison table header -->
      <div style="margin-bottom:10px;">
        <div style="display:grid;grid-template-columns:32px 1fr 70px 70px 80px 80px 60px;gap:8px;
          padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:9px;color:#475569;text-align:center;">#</div>
          <div style="font-size:9px;color:#475569;">الاسم</div>
          <div style="font-size:9px;color:#475569;text-align:center;">الأولوية</div>
          <div style="font-size:9px;color:#475569;text-align:center;">جودة البيانات</div>
          <div style="font-size:9px;color:#475569;text-align:center;">المنصات</div>
          <div style="font-size:9px;color:#475569;text-align:center;">موقع</div>
          <div style="font-size:9px;color:#475569;text-align:center;">هاتف</div>
        </div>
        ${allEntities.map((e: any, i: number) => buildCompetitorRow(e, i + 1, !!e.isClient)).join('')}
      </div>

      <!-- Strengths & Weaknesses -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px;">
        <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:14px 16px;">
          <div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:10px;">✅ نقاط القوة التنافسية</div>
          ${strengths.map(s => `<div style="font-size:10.5px;color:#94a3b8;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6;">• ${s}</div>`).join('')}
        </div>
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:14px 16px;">
          <div style="font-size:12px;font-weight:800;color:#ef4444;margin-bottom:10px;">⚠️ فرص التحسين</div>
          ${weaknesses.map(w => `<div style="font-size:10.5px;color:#94a3b8;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);line-height:1.6;">• ${w}</div>`).join('')}
        </div>
      </div>

      <!-- Market opportunity note -->
      <div style="margin-top:16px;padding:14px 18px;background:rgba(14,165,233,0.05);border:1px solid rgba(14,165,233,0.15);border-radius:12px;">
        <div style="font-size:11px;font-weight:700;color:#0ea5e9;margin-bottom:6px;">💡 الفرصة التنافسية</div>
        <div style="font-size:11px;color:#64748b;line-height:1.7;">
          ${clientRank <= Math.ceil(totalInComparison / 2)
            ? `${lead.companyName || 'النشاط'} يحتل مركزاً تنافسياً متقدماً (#${clientRank} من ${totalInComparison}). تعزيز نقاط القوة الحالية وسد الثغرات المذكورة سيُرسّخ هذا التفوق ويزيد الحصة السوقية.`
            : `${lead.companyName || 'النشاط'} لديه فرصة واضحة للارتقاء في الترتيب التنافسي. معالجة نقاط الضعف المذكورة أعلاه ستُحسّن الموقع التنافسي بشكل ملحوظ خلال 90 يوماً.`
          }
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 5 من 5</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  ASSEMBLE & OPEN PRINT WINDOW
  // ═══════════════════════════════════════════════════════════════════════
  const printHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Tajawal', 'Arial', sans-serif;
    direction: rtl;
    text-align: right;
    background: #0a0f1e;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @media print {
    body { background: #020810; margin: 0; padding: 0; }
    #print-toolbar { display: none !important; }
    .page-wrapper { box-shadow: none !important; margin: 0 !important; }
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  #print-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(135deg,#0a1628,#0d1f3c);
    border-bottom: 2px solid rgba(34,197,94,0.3);
    padding: 10px 24px; display: flex; align-items: center;
    justify-content: space-between; gap: 12px;
    font-family: 'Tajawal', sans-serif; direction: rtl;
    box-shadow: 0 2px 20px rgba(0,0,0,0.5), 0 0 30px rgba(34,197,94,0.05);
  }
  #print-toolbar .info { display: flex; flex-direction: column; gap: 2px; }
  #print-toolbar .title { color: #f1f5f9; font-size: 14px; font-weight: 700; }
  #print-toolbar .hint { color: #475569; font-size: 11px; }
  #print-toolbar .actions { display: flex; gap: 8px; align-items: center; }
  #print-toolbar .btn-print {
    background: linear-gradient(135deg,#16a34a,#22c55e);
    color: #000; border: none; border-radius: 8px;
    padding: 9px 22px; font-size: 13px; font-weight: 800;
    cursor: pointer; font-family: 'Tajawal', sans-serif;
    display: flex; align-items: center; gap: 6px;
    box-shadow: 0 0 20px rgba(34,197,94,0.4);
  }
  #print-toolbar .btn-print:hover { background: linear-gradient(135deg,#22c55e,#4ade80); }
  #print-toolbar .btn-close {
    background: rgba(255,255,255,0.05); color: #94a3b8;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: 'Tajawal', sans-serif;
  }
  #print-toolbar .btn-close:hover { background: rgba(255,255,255,0.1); }
  .pages-container {
    padding: 70px 20px 30px;
    display: flex; flex-direction: column; align-items: center; gap: 24px;
  }
  @media print {
    .pages-container { padding: 0; gap: 0; }
  }
  .page-wrapper {
    width: 210mm;
    box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 60px rgba(34,197,94,0.04);
  }
</style>
</head>
<body>
<div id="print-toolbar">
  <div class="info">
    <div class="title">📄 ${fileName}</div>
    <div class="hint">⚠️ عند الطباعة: فعّل "رسومات الخلفية" (Background graphics) لتظهر الألوان والتأثيرات</div>
  </div>
  <div class="actions">
    <button class="btn-print" onclick="window.print()">⬇️ حفظ PDF</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
</div>
<div class="pages-container">
  <div class="page-wrapper">${p1}</div>
  <div class="page-wrapper">${p2}</div>
  <div class="page-wrapper">${p3}</div>
  <div class="page-wrapper">${p4}</div>
  ${p5 ? `<div class="page-wrapper">${p5}</div>` : ''}
</div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('تعذّر فتح نافذة جديدة. يرجى السماح بالنوافذ المنبثقة في المتصفح.');
  }
  printWindow.document.open();
  printWindow.document.write(printHTML);
  printWindow.document.close();
}

// ═══════════════════════════════════════════════════════════════════════
//  previewLeadPDF — نفس generateLeadPDF
// ═══════════════════════════════════════════════════════════════════════
export async function previewLeadPDF(options: GeneratePDFOptions): Promise<void> {
  await generateLeadPDF(options);
}
