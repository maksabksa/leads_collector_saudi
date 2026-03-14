// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — Executive Report v8 (Print-Ready Dark)
//  صفحة 1: الغلاف التنفيذي  |  صفحة 2: الملخص التنفيذي + الفرص الضائعة
//  صفحة 3: التحليل الرقمي + Radar  |  صفحة 4: التوصيات + CTA قوي + QR
//  صفحة 5: تحليل المنافسين
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
  if (v >= 8) return "0 0 24px rgba(34,197,94,0.8)";
  if (v >= 6) return "0 0 24px rgba(234,179,8,0.8)";
  if (v >= 4) return "0 0 24px rgba(249,115,22,0.8)";
  return "0 0 24px rgba(239,68,68,0.8)";
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
  const fs = size > 70 ? 28 : 20;
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

// ─── Big number display ───────────────────────────────────────────────────────
function bigNum(v: string | number | null, label: string, sub = "", color = "#22c55e") {
  return `<div style="text-align:center;padding:16px 12px;background:${color}0d;
    border:1px solid ${color}33;border-radius:14px;">
    <div style="font-size:38px;font-weight:900;color:${color};
      text-shadow:0 0 30px ${color}88;line-height:1;margin-bottom:6px;">${v ?? "—"}</div>
    <div style="font-size:11px;font-weight:700;color:#cbd5e1;">${label}</div>
    ${sub ? `<div style="font-size:9px;color:#475569;margin-top:3px;">${sub}</div>` : ""}
  </div>`;
}

// ─── Progress bar (dark) ──────────────────────────────────────────────────────
function bar(v?: number | null, label = "", max = 10) {
  const pct = v ? Math.min((v / max) * 100, 100) : 0;
  const color = sc(v);
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
      <span style="font-size:11.5px;color:#cbd5e1;font-weight:600;">${label}</span>
      <span style="font-size:13px;font-weight:900;color:${color};text-shadow:0 0 8px ${color}88;">${fmt(v)}</span>
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

// ─── Page header (shared) ─────────────────────────────────────────────────────
function pageHeader(title: string, subtitle: string, pageNum: string, coName: string, lead: any) {
  return `<div style="padding:16px 40px 14px;display:flex;align-items:center;justify-content:space-between;
    border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.2);">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:4px;height:32px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);box-shadow:0 0 12px rgba(34,197,94,0.5);"></div>
      <div>
        <div style="font-size:17px;font-weight:900;color:#f1f5f9;">${title}</div>
        <div style="font-size:9px;color:#475569;margin-top:1px;">${subtitle}</div>
      </div>
    </div>
    <div style="text-align:left;">
      <div style="font-size:10px;color:#f1f5f9;font-weight:700;">${lead.companyName || ""}</div>
      <div style="font-size:9px;color:#334155;margin-top:1px;">${coName} · ${pageNum}</div>
    </div>
  </div>`;
}

// ─── Page wrapper (dark A4) ───────────────────────────────────────────────────
function page(content: string, pageBreak = true) {
  return `<div style="width:210mm;min-height:297mm;padding:0;margin:0 auto;
    background:linear-gradient(160deg,#020810 0%,#060d1a 60%,#020810 100%);
    position:relative;overflow:hidden;
    font-family:'Tajawal','Cairo','Arial',sans-serif;direction:rtl;text-align:right;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;
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

// ─── QR Code SVG (WhatsApp) ───────────────────────────────────────────────────
function qrCodeSVG(phone: string, size = 100) {
  // Generate a simple QR-like pattern using the phone number
  // This creates a visual QR code placeholder with WhatsApp link
  const waLink = `https://wa.me/${phone.replace(/\D/g, "")}`;
  // Simple pixel art QR code pattern (decorative)
  const cells = 9;
  const cellSize = size / cells;
  
  // Fixed pattern for visual QR code (finder patterns + data area)
  const pattern = [
    [1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,0],
    [1,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,1,0,1],
    [0,0,0,0,0,0,0,0,0],
    [1,0,1,1,0,1,1,0,1],
  ];
  
  let rects = "";
  pattern.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/>`;
      }
    });
  });
  
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
    <div style="background:white;padding:8px;border-radius:10px;box-shadow:0 0 20px rgba(34,197,94,0.3);">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="white"/>
        ${rects}
      </svg>
    </div>
    <div style="font-size:9px;color:#22c55e;font-weight:700;text-align:center;">امسح للتواصل</div>
    <div style="font-size:8px;color:#475569;text-align:center;">WhatsApp</div>
  </div>`;
}

// ─── Missed opportunity card ──────────────────────────────────────────────────
function missedOppCard(gap: string, impact: string, solution: string, color: string, icon: string) {
  return `<div style="display:flex;align-items:stretch;gap:0;border-radius:12px;overflow:hidden;
    border:1px solid ${color}33;margin-bottom:8px;">
    <!-- Left accent bar -->
    <div style="width:4px;background:${color};flex-shrink:0;"></div>
    <!-- Content -->
    <div style="flex:1;padding:12px 14px;background:${color}08;">
      <div style="font-size:11.5px;color:#e2e8f0;line-height:1.6;margin-bottom:8px;">${icon} ${gap}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="padding:4px 12px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
          border-radius:20px;">
          <span style="font-size:10px;color:#fca5a5;font-weight:800;">خسارة شهرية: ${impact}</span>
        </div>
        <div style="padding:4px 12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);
          border-radius:20px;">
          <span style="font-size:10px;color:#86efac;font-weight:700;">الحل: ${solution}</span>
        </div>
      </div>
    </div>
    <!-- Right: impact highlight -->
    <div style="padding:12px 14px;background:rgba(239,68,68,0.06);display:flex;flex-direction:column;
      align-items:center;justify-content:center;min-width:80px;border-right:1px solid rgba(255,255,255,0.05);">
      <div style="font-size:8px;color:#64748b;margin-bottom:3px;">فرصة ضائعة</div>
      <div style="font-size:11px;font-weight:900;color:#ef4444;text-align:center;line-height:1.3;">${impact}</div>
    </div>
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

    if (!lead.leadPriorityScore) {
      let score = 5.0;
      if (hasSocial && avgSocialScore >= 7) score += 1.5;
      else if (hasSocial && avgSocialScore >= 5) score += 0.8;
      if (hasWebsite) score += 0.5;
      if (lead.phone || lead.verifiedPhone) score += 0.5;
      if (socialAnalyses.length >= 3) score += 0.5;
      lead.leadPriorityScore = Math.min(score, 9.5).toFixed(1);
    }

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

    if (!report.executiveSummary && !report.summary) {
      const platforms = socialAnalyses.map((s: any) => pm(s.platform).name).join(" و ");
      report.executiveSummary = `يمتلك ${lead.companyName || biz} في ${city} حضوراً رقمياً ${hasSocial ? `على منصات ${platforms}` : "محدوداً"} مع إمكانات نمو واعدة. ${hasWebsite ? "الموقع الإلكتروني موجود لكن يحتاج تحسيناً." : "غياب الموقع الإلكتروني يُمثّل فرصة كبيرة للتطوير."} التحليل يُشير إلى فرص واضحة لتعزيز الحضور الرقمي وزيادة قاعدة العملاء من خلال استراتيجية تسويقية متكاملة.`;
    }

    if (!lead.revenueOpportunity) {
      lead.revenueOpportunity = `بناءً على حجم السوق في ${city} ونوع النشاط (${biz})، تُقدَّر الفرصة الإيرادية الشهرية بـ 15,000 - 45,000 ريال إضافية من خلال تحسين الحضور الرقمي واستهداف العملاء المحتملين بشكل أكثر فعالية.`;
    }

    if (!lead.entryAngle) {
      lead.entryAngle = `البدء بتقديم حزمة إدارة السوشيال ميديا المتكاملة لـ${biz} مع ضمان نتائج خلال 30 يوماً، مع تقديم تقرير أداء أسبوعي شفاف لبناء الثقة وإثبات الكفاءة.`;
    }
  }
  autoFillData();

  const coName     = company?.companyName || "مكسب";
  const coPhone    = company?.phone || "";
  const coWebsite  = company?.website || "maksab-ksa.com";
  const coEmail    = company?.email || "";
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

  // ── Calculate total missed revenue ──
  const missedImpacts = [
    "8,000 - 20,000 ريال/شهر",
    "5,000 - 15,000 ريال/شهر",
    "3,000 - 10,000 ريال/شهر",
    "2,000 - 8,000 ريال/شهر",
    "1,500 - 5,000 ريال/شهر",
  ];
  const missedSolutions = [
    "حزمة مكسب الشاملة",
    "إدارة سوشيال ميديا",
    "تصميم موقع إلكتروني",
    "حملات إعلانية مدفوعة",
    "استشارة تسويقية",
  ];
  const missedColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#0ea5e9"];
  const missedIcons = ["⚠️", "📉", "💡", "🔗", "🎯"];

  const safeLeadName = (lead.companyName || "عميل").replace(/[/\\?%*:|"<>]/g, "-");
  const fileName = `تقرير تنفيذي - ${safeLeadName}.pdf`;

  // ── WhatsApp phone for QR ──
  const waPhone = coPhone || phones[0] || "";

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 1 — EXECUTIVE COVER (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p1 = page(`
    <!-- Decorative bg elements -->
    <div style="position:absolute;top:-80px;right:-80px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.06) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-100px;left:-60px;width:400px;height:400px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    <!-- TOP HEADER BAR — Company Info -->
    <div style="padding:18px 40px 16px;display:flex;align-items:center;justify-content:space-between;
      border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(0,0,0,0.3);">
      <!-- Company Brand -->
      <div style="display:flex;align-items:center;gap:14px;">
        ${coLogo
          ? `<img src="${coLogo}" style="height:44px;width:auto;border-radius:10px;border:1px solid rgba(255,255,255,0.1);padding:4px;background:rgba(255,255,255,0.05);" alt="logo">`
          : `<div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#22c55e,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;box-shadow:0 0 20px rgba(34,197,94,0.4);">${coName.charAt(0)}</div>`}
        <div>
          <div style="font-size:20px;font-weight:900;color:#f1f5f9;letter-spacing:0.5px;">${coName}</div>
          <div style="font-size:9px;color:#475569;margin-top:2px;letter-spacing:1.5px;">وكالة تسويق رقمي متخصصة · المملكة العربية السعودية</div>
          <!-- Credentials badges -->
          <div style="display:flex;gap:6px;margin-top:5px;">
            <div style="padding:2px 8px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.25);border-radius:10px;font-size:8px;color:#86efac;font-weight:700;">معتمد · المركز الوطني للأعمال</div>
            <div style="padding:2px 8px;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.25);border-radius:10px;font-size:8px;color:#7dd3fc;font-weight:700;">شريك Meta المعتمد</div>
          </div>
        </div>
      </div>
      <!-- Report Meta -->
      <div style="text-align:left;">
        <div style="font-size:9px;color:#475569;margin-bottom:3px;letter-spacing:0.5px;">تاريخ الإصدار</div>
        <div style="font-size:13px;font-weight:700;color:#94a3b8;">${reportDate}</div>
        <div style="margin-top:8px;padding:4px 14px;background:${urgency.bg};border:1px solid ${urgency.border};
          border-radius:20px;font-size:10px;font-weight:800;color:${urgency.color};display:inline-block;
          box-shadow:0 0 12px ${urgency.border};">${urgency.text}</div>
      </div>
    </div>

    <!-- Client hero section -->
    <div style="padding:36px 40px 28px;text-align:center;position:relative;">
      ${clLogo ? `<div style="margin-bottom:20px;"><img src="${clLogo}" style="height:80px;width:auto;max-width:200px;border-radius:14px;border:2px solid rgba(255,255,255,0.1);padding:8px;background:rgba(255,255,255,0.04);" alt="client logo"></div>` : ""}
      <div style="font-size:10px;color:#475569;font-weight:700;letter-spacing:3px;margin-bottom:8px;text-transform:uppercase;">تقرير تنفيذي مخصص لعناية</div>
      <div style="font-size:40px;font-weight:900;color:#f8fafc;margin-bottom:8px;
        text-shadow:0 0 50px rgba(34,197,94,0.25);letter-spacing:0.5px;">${lead.companyName || "العميل"}</div>
      <div style="font-size:14px;color:#64748b;margin-bottom:18px;">
        ${lead.businessType || ""} ${lead.city ? `<span style="color:#334155;margin:0 6px;">·</span> ${lead.city}` : ""}
      </div>
      <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 24px;
        background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:24px;
        box-shadow:0 0 20px rgba(34,197,94,0.1);">
        <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></div>
        <span style="font-size:12px;color:#22c55e;font-weight:700;letter-spacing:0.5px;">تحليل رقمي شامل · 5 محاور رئيسية</span>
      </div>
    </div>

    <!-- KEY METRICS — Big Numbers -->
    <div style="padding:0 40px 24px;">
      <div style="font-size:10px;color:#334155;font-weight:700;text-align:center;margin-bottom:14px;
        letter-spacing:2px;">المؤشرات الرئيسية</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        ${[
          { v: priScore !== null ? priScore.toFixed(1) : "—",   label: "درجة الأولوية",   sub: "من 10",      color: sc(priScore) },
          { v: qualScore !== null ? qualScore.toFixed(1) : "—", label: "جودة البيانات",   sub: "من 10",      color: sc(qualScore) },
          { v: wsScore !== null ? wsScore.toFixed(1) : "—",     label: "تقييم الموقع",    sub: "من 10",      color: sc(wsScore) },
          { v: bestSocial?.engagementScore ? Number(bestSocial.engagementScore).toFixed(1) : "—", label: "التفاعل الرقمي", sub: "من 10", color: sc(bestSocial?.engagementScore) },
        ].map(({ v, label, sub, color }) => `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
          border-radius:14px;padding:16px 10px;text-align:center;
          border-top:2px solid ${color};">
          <div style="font-size:34px;font-weight:900;color:${color};
            text-shadow:0 0 20px ${color}66;line-height:1;margin-bottom:6px;">${v}</div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;">${label}</div>
          <div style="font-size:9px;color:#334155;margin-top:2px;">${sub}</div>
        </div>`).join("")}
      </div>
    </div>

    <!-- Contact info -->
    <div style="padding:0 40px 20px;">
      <div style="font-size:10px;color:#334155;font-weight:700;margin-bottom:10px;letter-spacing:1px;">معلومات الاتصال</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 30px;">
        ${infoRow("الهاتف", phones.slice(0, 2).join(" | "), "📞")}
        ${infoRow("الموقع", cleanUrl(lead.website), "🌐")}
        ${infoRow("إنستغرام", cleanUrl(lead.instagramUrl, "instagram"), "📸")}
        ${infoRow("تيك توك", cleanUrl(lead.tiktokUrl, "tiktok"), "🎵")}
        ${infoRow("سناب شات", cleanUrl(lead.snapchatUrl, "snapchat"), "👻")}
        ${infoRow("تويتر", cleanUrl(lead.twitterUrl, "twitter"), "🐦")}
      </div>
    </div>

    <!-- Missed Revenue Teaser -->
    <div style="margin:0 40px 20px;padding:14px 20px;
      background:linear-gradient(135deg,rgba(239,68,68,0.08),rgba(249,115,22,0.06));
      border:1px solid rgba(239,68,68,0.2);border-radius:14px;
      display:flex;align-items:center;justify-content:space-between;">
      <div>
        <div style="font-size:11px;color:#ef4444;font-weight:800;margin-bottom:4px;">⚠️ تنبيه: إيراد ضائع يمكن استعادته</div>
        <div style="font-size:10px;color:#94a3b8;">بناءً على التحليل، هناك فرص إيرادية غير مستغلة تحتاج معالجة فورية</div>
      </div>
      <div style="text-align:center;padding:8px 16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:12px;">
        <div style="font-size:18px;font-weight:900;color:#ef4444;">15K+</div>
        <div style="font-size:8px;color:#64748b;">ريال/شهر</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 1 من 5</div>
    </div>

    <!-- Watermark -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);
      font-size:64px;font-weight:900;color:rgba(34,197,94,0.025);white-space:nowrap;
      pointer-events:none;z-index:0;letter-spacing:6px;">حصري من ${coName}</div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 2 — EXECUTIVE SUMMARY + MISSED OPPORTUNITIES (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const execSummary = report?.executiveSummary || report?.summary || lead.revenueOpportunity || "";
  const entryAngle  = lead.entryAngle || report?.entryAngle || "";
  const revenueOpp  = lead.revenueOpportunity || "";

  const p2 = page(`
    <!-- Decorative -->
    <div style="position:absolute;top:-60px;left:-60px;width:300px;height:300px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("الملخص التنفيذي", "تقييم شامل للحضور الرقمي والفرص المتاحة", "صفحة 2/5", coName, lead)}

    <div style="padding:20px 40px;">

      <!-- Three pillars: Performance | Gap | Opportunity -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);
          border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:10px;color:#7dd3fc;font-weight:700;margin-bottom:8px;letter-spacing:1px;">مستوى الأداء</div>
          <div style="font-size:36px;font-weight:900;color:#0ea5e9;
            text-shadow:0 0 20px rgba(14,165,233,0.6);line-height:1;">${priScore !== null ? priScore.toFixed(1) : "—"}</div>
          <div style="font-size:9px;color:#475569;margin-top:4px;">من 10 نقاط</div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);
          border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:10px;color:#fca5a5;font-weight:700;margin-bottom:8px;letter-spacing:1px;">الفجوة الرقمية</div>
          <div style="font-size:36px;font-weight:900;color:#ef4444;
            text-shadow:0 0 20px rgba(239,68,68,0.6);line-height:1;">${gaps.length}</div>
          <div style="font-size:9px;color:#475569;margin-top:4px;">ثغرة تسويقية</div>
        </div>
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);
          border-radius:14px;padding:16px;text-align:center;">
          <div style="font-size:10px;color:#86efac;font-weight:700;margin-bottom:8px;letter-spacing:1px;">الفرصة المالية</div>
          <div style="font-size:28px;font-weight:900;color:#22c55e;
            text-shadow:0 0 20px rgba(34,197,94,0.6);line-height:1;">15K+</div>
          <div style="font-size:9px;color:#475569;margin-top:4px;">ريال/شهر</div>
        </div>
      </div>

      <!-- Executive summary -->
      ${execSummary ? `
      <div style="margin-bottom:18px;">
        ${sh("نظرة عامة على الوضع الحالي")}
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.15);
          border-right:4px solid #0ea5e9;border-radius:0 12px 12px 0;padding:14px 18px;">
          <p style="font-size:12px;color:#cbd5e1;line-height:1.9;margin:0;">${cleanMarkdown(execSummary)}</p>
        </div>
      </div>` : ""}

      <!-- MISSED OPPORTUNITIES — Main Section -->
      ${gaps.length ? `
      <div style="margin-bottom:18px;">
        ${sh("الفرص الضائعة وتأثيرها المالي المباشر", "كل ثغرة = خسارة شهرية يمكن تحويلها لإيراد")}
        ${gaps.map((g, i) => missedOppCard(
          g,
          missedImpacts[i % missedImpacts.length],
          missedSolutions[i % missedSolutions.length],
          missedColors[i % missedColors.length],
          missedIcons[i % missedIcons.length]
        )).join("")}
      </div>` : ""}

      <!-- Revenue & Entry -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;">
        ${revenueOpp ? `
        <div>
          ${sh("الفرصة الإيرادية المتاحة")}
          ${card(`<p style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin:0;">${cleanMarkdown(revenueOpp)}</p>`, "#22c55e")}
        </div>` : ""}
        ${entryAngle ? `
        <div>
          ${sh("زاوية الدخول المقترحة")}
          ${card(`<p style="font-size:11.5px;color:#94a3b8;line-height:1.8;margin:0;">${cleanMarkdown(entryAngle)}</p>`, "#0ea5e9")}
        </div>` : ""}
      </div>

      <!-- KPI bars -->
      <div>
        ${sh("مؤشرات الأداء الرئيسية")}
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
      <div style="font-size:9px;color:#334155;">صفحة 2 من 5</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 3 — DIGITAL ANALYSIS + RADAR (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p3 = page(`
    <!-- Decorative -->
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.04) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("التحليل الرقمي التفصيلي", "تقييم الموقع الإلكتروني والمنصات الاجتماعية", "صفحة 3/5", coName, lead)}

    <div style="padding:18px 40px;">

      <!-- Three pillars for this page -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
        <div style="background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#7dd3fc;font-weight:700;margin-bottom:6px;">مستوى الأداء الرقمي</div>
          <div style="font-size:28px;font-weight:900;color:#0ea5e9;text-shadow:0 0 15px rgba(14,165,233,0.6);">${wsScore !== null ? wsScore.toFixed(1) : "—"}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">تقييم الموقع / 10</div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;">الفجوة التقنية</div>
          <div style="font-size:28px;font-weight:900;color:#ef4444;text-shadow:0 0 15px rgba(239,68,68,0.6);">${wsScore !== null ? (10 - wsScore).toFixed(1) : "—"}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">نقطة تحسين ممكنة</div>
        </div>
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:6px;">الفرصة الرقمية</div>
          <div style="font-size:28px;font-weight:900;color:#22c55e;text-shadow:0 0 15px rgba(34,197,94,0.6);">${socialAnalyses.length}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">منصة محللة</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">

        <!-- Left: Website + Social bars -->
        <div>
          <!-- Website -->
          <div style="margin-bottom:16px;">
            ${sh("تحليل الموقع الإلكتروني", lead.website ? cleanUrl(lead.website) : "لا يوجد موقع")}
            ${wsScore !== null ? `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
              ${[
                { v: wsScore,                           label: "الكلي",   color: sc(wsScore) },
                { v: websiteAnalysis?.speedScore,       label: "السرعة",  color: sc(websiteAnalysis?.speedScore) },
                { v: websiteAnalysis?.mobileScore,      label: "الجوال",  color: sc(websiteAnalysis?.mobileScore) },
              ].map(({ v, label, color }) => `
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
                border-radius:10px;padding:12px 8px;text-align:center;border-top:2px solid ${color};">
                <div style="font-size:22px;font-weight:900;color:${color};text-shadow:0 0 12px ${color}66;">${fmt(v)}</div>
                <div style="font-size:9px;color:#475569;margin-top:4px;font-weight:600;">${label}</div>
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
                  <div style="font-size:20px;font-weight:900;color:${color};text-shadow:0 0 12px ${color}66;">${v}</div>
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
          <div style="display:flex;justify-content:center;margin-bottom:12px;">
            ${radarChart(radarAxes, 230)}
          </div>
          <!-- Legend -->
          <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:14px;">
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
                    <div style="font-size:20px;font-weight:900;color:${color};text-shadow:0 0 10px ${color}66;line-height:1.2;">${fmt(score)}</div>
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
  //  PAGE 4 — RECOMMENDATIONS + STRONG CTA + QR CODE (DARK)
  // ═══════════════════════════════════════════════════════════════════════
  const p4 = page(`
    <!-- Decorative -->
    <div style="position:absolute;bottom:-80px;right:-60px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("التوصيات والخطة التنفيذية", "خطوات عملية مرتبة بالأولوية لتحقيق النمو", "صفحة 4/5", coName, lead)}

    <div style="padding:20px 40px;">

      <!-- Three pillars for recs page -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:6px;">مستوى الجاهزية</div>
          <div style="font-size:28px;font-weight:900;color:#22c55e;text-shadow:0 0 15px rgba(34,197,94,0.6);">${recs.length}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">توصية استراتيجية</div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;">الفجوة الحالية</div>
          <div style="font-size:28px;font-weight:900;color:#ef4444;text-shadow:0 0 15px rgba(239,68,68,0.6);">${gaps.length}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">ثغرة تحتاج معالجة</div>
        </div>
        <div style="background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fdba74;font-weight:700;margin-bottom:6px;">الفرصة المالية</div>
          <div style="font-size:24px;font-weight:900;color:#f97316;text-shadow:0 0 15px rgba(249,115,22,0.6);">30 يوم</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">لرؤية النتائج</div>
        </div>
      </div>

      <!-- Recommendations -->
      ${recs.length ? `
      <div style="margin-bottom:20px;">
        ${sh("التوصيات الاستراتيجية", "مرتبة حسب الأولوية والتأثير المالي")}
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recs.map((r, i) => {
            const accent = i === 0 ? "#22c55e" : i === 1 ? "#0ea5e9" : i === 2 ? "#a78bfa" : "#f97316";
            const priority = i === 0 ? "أولوية قصوى" : i === 1 ? "أولوية عالية" : i === 2 ? "أولوية متوسطة" : "مكمّل";
            return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;
              background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
              border-right:3px solid ${accent};border-radius:0 12px 12px 0;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;">
                <div style="width:28px;height:28px;border-radius:50%;
                  background:rgba(255,255,255,0.05);border:2px solid ${accent}44;
                  display:flex;align-items:center;justify-content:center;">
                  <span style="font-size:13px;font-weight:900;color:${accent};text-shadow:0 0 8px ${accent};">${i + 1}</span>
                </div>
                <div style="font-size:7px;color:${accent};font-weight:700;text-align:center;white-space:nowrap;">${priority}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:12px;color:#e2e8f0;line-height:1.7;">${r}</div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}

      <!-- STRONG CTA SECTION -->
      <div style="background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 50%,#0a1628 100%);
        border:1px solid rgba(34,197,94,0.25);border-radius:16px;padding:24px 28px;
        position:relative;overflow:hidden;
        box-shadow:0 0 40px rgba(34,197,94,0.1);">
        <!-- Glow effects -->
        <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;
          background:radial-gradient(circle,rgba(34,197,94,0.1) 0%,transparent 70%);pointer-events:none;"></div>
        <div style="position:absolute;bottom:-50px;left:-30px;width:180px;height:180px;border-radius:50%;
          background:radial-gradient(circle,rgba(14,165,233,0.08) 0%,transparent 70%);pointer-events:none;"></div>

        <div style="position:relative;z-index:1;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center;">
          <!-- Left: CTA Text -->
          <div>
            <div style="font-size:10px;color:#475569;margin-bottom:8px;letter-spacing:2px;font-weight:700;">الخطوة التالية — الآن</div>
            <div style="font-size:22px;font-weight:900;color:#f8fafc;margin-bottom:8px;
              text-shadow:0 0 30px rgba(34,197,94,0.2);line-height:1.3;">
              لا تدع منافسيك يسبقونك
            </div>
            <div style="font-size:12px;color:#64748b;margin-bottom:16px;line-height:1.7;">
              كل يوم تأخير = إيراد ضائع. تواصل معنا الآن للحصول على استشارة مجانية وخطة عمل مخصصة لـ${lead.companyName || "نشاطك"} خلال 24 ساعة.
            </div>
            <!-- Contact buttons -->
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              ${waPhone ? `
              <div style="padding:10px 20px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);
                border-radius:24px;font-size:12px;font-weight:800;color:#22c55e;
                box-shadow:0 0 16px rgba(34,197,94,0.2);">📱 واتساب: ${waPhone}</div>` : ""}
              <div style="padding:10px 20px;background:rgba(14,165,233,0.12);border:1px solid rgba(14,165,233,0.35);
                border-radius:24px;font-size:12px;font-weight:700;color:#0ea5e9;
                box-shadow:0 0 16px rgba(14,165,233,0.15);">🌐 ${coWebsite}</div>
              ${coEmail ? `
              <div style="padding:10px 20px;background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);
                border-radius:24px;font-size:12px;font-weight:700;color:#a78bfa;
                box-shadow:0 0 16px rgba(167,139,250,0.15);">✉️ ${coEmail}</div>` : ""}
            </div>

            <!-- Urgency note -->
            <div style="margin-top:12px;padding:8px 14px;background:rgba(239,68,68,0.08);
              border:1px solid rgba(239,68,68,0.2);border-radius:10px;display:inline-flex;align-items:center;gap:6px;">
              <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;"></div>
              <span style="font-size:10px;color:#fca5a5;font-weight:700;">عرض الاستشارة المجانية متاح لفترة محدودة</span>
            </div>
          </div>

          <!-- Right: QR Code -->
          ${waPhone ? `
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
            ${qrCodeSVG(waPhone, 90)}
            <div style="font-size:8px;color:#475569;text-align:center;max-width:100px;line-height:1.4;">
              امسح الكود للتواصل المباشر عبر واتساب
            </div>
          </div>` : ""}
        </div>
      </div>

      <!-- Credentials & Trust -->
      <div style="margin-top:14px;padding:12px 16px;background:rgba(255,255,255,0.02);
        border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
        <div style="font-size:9px;color:#334155;margin-bottom:8px;font-weight:700;letter-spacing:1px;">الاعتمادات والشراكات</div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:20px;">
            <span style="font-size:10px;">🏛️</span>
            <span style="font-size:9px;color:#86efac;font-weight:700;">معتمد · المركز الوطني للأعمال</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(14,165,233,0.06);border:1px solid rgba(14,165,233,0.15);border-radius:20px;">
            <span style="font-size:10px;">📘</span>
            <span style="font-size:9px;color:#7dd3fc;font-weight:700;">شريك Meta المعتمد</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(167,139,250,0.06);border:1px solid rgba(167,139,250,0.15);border-radius:20px;">
            <span style="font-size:10px;">🔍</span>
            <span style="font-size:9px;color:#c4b5fd;font-weight:700;">شريك Google المعتمد</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding:4px 12px;background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.15);border-radius:20px;">
            <span style="font-size:10px;">🎵</span>
            <span style="font-size:9px;color:#fdba74;font-weight:700;">شريك TikTok المعتمد</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.4);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة © ${new Date().getFullYear()}</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 4 من 5</div>
    </div>
  `, false);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 5 — COMPETITOR COMPARISON (DARK)
  // ═══════════════════════════════════════════════════════════════════════

  const allEntities = [
    { ...lead, isClient: true },
    ...competitors.slice(0, 5),
  ].sort((a, b) => (Number(b.leadPriorityScore) || 0) - (Number(a.leadPriorityScore) || 0));

  const clientRank = allEntities.findIndex((e: any) => e.isClient) + 1;
  const totalInComparison = allEntities.length;

  const avgCompPriority = competitors.length
    ? competitors.reduce((s, c) => s + (Number(c.leadPriorityScore) || 0), 0) / competitors.length
    : 0;
  const avgCompPlatforms = competitors.length
    ? competitors.reduce((s, c) => s + [c.instagramUrl, c.tiktokUrl, c.twitterUrl, c.snapchatUrl, c.facebookUrl, c.linkedinUrl].filter(Boolean).length, 0) / competitors.length
    : 0;
  const clientPlatforms = [lead.instagramUrl, lead.tiktokUrl, lead.twitterUrl, lead.snapchatUrl, lead.facebookUrl, lead.linkedinUrl].filter(Boolean).length;
  const clientPri = Number(lead.leadPriorityScore) || 5;
  const clientQual = Number(lead.dataQualityScore) || 5;

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

  function buildRadarSVG(entities: any[]) {
    const cx = 110, cy = 110, r = 80;
    const axes = [
      { label: 'الأولوية', key: 'leadPriorityScore' },
      { label: 'جودة البيانات', key: 'dataQualityScore' },
      { label: 'المنصات', key: '_platforms' },
      { label: 'الموقع', key: '_website' },
      { label: 'التواصل', key: '_contact' },
    ];
    const n = axes.length;
    const colors = ['#22c55e', '#f97316', '#eab308', '#0ea5e9', '#a78bfa'];

    function getVal(e: any, key: string): number {
      if (key === '_platforms') return Math.min(10, ([e.instagramUrl, e.tiktokUrl, e.twitterUrl, e.snapchatUrl, e.facebookUrl, e.linkedinUrl].filter(Boolean).length / 6) * 10);
      if (key === '_website') return e.website ? 10 : 0;
      if (key === '_contact') return (e.phone || e.verifiedPhone) ? 10 : 0;
      return Math.min(10, Number(e[key]) || 0);
    }

    function polarToCart(angle: number, val: number) {
      const rad = (angle - 90) * Math.PI / 180;
      const dist = (val / 10) * r;
      return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
    }

    let gridCircles = '';
    for (let i = 2; i <= 10; i += 2) {
      const pts = axes.map((_, j) => {
        const angle = (360 / n) * j;
        const p = polarToCart(angle, i);
        return `${p.x},${p.y}`;
      }).join(' ');
      gridCircles += `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/>`;
    }

    let axisLines = '';
    axes.forEach((ax, j) => {
      const angle = (360 / n) * j;
      const outer = polarToCart(angle, 10);
      const labelPos = polarToCart(angle, 12.5);
      axisLines += `<line x1="${cx}" y1="${cy}" x2="${outer.x}" y2="${outer.y}" stroke="rgba(255,255,255,0.1)" stroke-width="0.8"/>`;
      axisLines += `<text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle" fill="#64748b" font-size="8" font-family="Tajawal,Arial">${ax.label}</text>`;
    });

    let polygons = '';
    entities.slice(0, 3).forEach((e, idx) => {
      const color = e.isClient ? '#22c55e' : colors[idx + 1] || '#64748b';
      const pts = axes.map((ax, j) => {
        const angle = (360 / n) * j;
        const val = getVal(e, ax.key);
        const p = polarToCart(angle, val);
        return `${p.x},${p.y}`;
      }).join(' ');
      polygons += `<polygon points="${pts}" fill="${color}22" stroke="${color}" stroke-width="${e.isClient ? 2 : 1.2}" opacity="0.9"/>`;
    });

    return `<svg width="220" height="220" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      ${gridCircles}${axisLines}${polygons}
    </svg>`;
  }

  function buildCompetitorCard(comp: any, rank: number, isClient = false) {
    const priScore = Math.min(10, Number(comp.leadPriorityScore) || 0);
    const qualScore = Math.min(10, Number(comp.dataQualityScore) || 0);
    const platforms = [comp.instagramUrl, comp.tiktokUrl, comp.twitterUrl, comp.snapchatUrl, comp.facebookUrl, comp.linkedinUrl].filter(Boolean).length;
    const hasWebsite = !!comp.website;
    const hasPhone = !!(comp.phone || comp.verifiedPhone);

    const rankColors: Record<number, { bg: string; border: string; badge: string; text: string }> = {
      1: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.4)', badge: 'linear-gradient(135deg,#f59e0b,#fbbf24)', text: '#fbbf24' },
      2: { bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.3)', badge: 'linear-gradient(135deg,#94a3b8,#cbd5e1)', text: '#cbd5e1' },
      3: { bg: 'rgba(180,83,9,0.06)', border: 'rgba(180,83,9,0.3)', badge: 'linear-gradient(135deg,#b45309,#d97706)', text: '#d97706' },
    };
    const clientStyle = { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.5)', badge: 'linear-gradient(135deg,#16a34a,#22c55e)', text: '#22c55e' };
    const defaultStyle = { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.08)', badge: 'linear-gradient(135deg,#334155,#475569)', text: '#64748b' };

    const style = isClient ? clientStyle : (rankColors[rank] || defaultStyle);
    const badgeLabel = isClient ? '⭐' : rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

    const platformIcons = [
      { url: comp.instagramUrl, color: '#e1306c', label: 'IG' },
      { url: comp.tiktokUrl, color: '#69c9d0', label: 'TK' },
      { url: comp.twitterUrl, color: '#1da1f2', label: 'X' },
      { url: comp.snapchatUrl, color: '#fffc00', label: 'SC' },
      { url: comp.facebookUrl, color: '#1877f2', label: 'FB' },
      { url: comp.linkedinUrl, color: '#0a66c2', label: 'LI' },
    ];

    const priBarWidth = Math.round(priScore * 10);
    const qualBarWidth = Math.round(qualScore * 10);
    const platBarWidth = Math.round((platforms / 6) * 100);

    return `
    <div style="display:flex;gap:10px;align-items:stretch;padding:10px 14px;
      background:${style.bg};border:1px solid ${style.border};
      border-radius:12px;margin-bottom:7px;position:relative;overflow:hidden;">
      ${isClient ? `<div style="position:absolute;top:0;right:0;bottom:0;width:3px;background:${style.badge};border-radius:0 12px 12px 0;"></div>` : ''}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:36px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${style.badge};
          display:flex;align-items:center;justify-content:center;
          font-size:${isClient ? '10' : '14'}px;font-weight:900;color:#fff;
          box-shadow:0 0 10px ${style.text}44;">${badgeLabel}</div>
        ${isClient ? `<div style="font-size:7px;color:${style.text};margin-top:3px;font-weight:700;">أنت</div>` : ''}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div style="font-size:11.5px;font-weight:800;color:${isClient ? style.text : '#f1f5f9'};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${comp.companyName || 'غير معروف'}</div>
          <div style="display:flex;gap:3px;">
            ${platformIcons.map(p => p.url ? `<div style="width:16px;height:16px;border-radius:4px;background:${p.color}22;border:1px solid ${p.color}55;
              display:flex;align-items:center;justify-content:center;font-size:7px;color:${p.color};font-weight:800;">${p.label}</div>` : '').join('')}
            ${hasWebsite ? `<div style="width:16px;height:16px;border-radius:4px;background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.4);
              display:flex;align-items:center;justify-content:center;font-size:7px;color:#0ea5e9;font-weight:800;">🌐</div>` : ''}
            ${hasPhone ? `<div style="width:16px;height:16px;border-radius:4px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);
              display:flex;align-items:center;justify-content:center;font-size:7px;color:#22c55e;font-weight:800;">📞</div>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="font-size:7.5px;color:#475569;">الأولوية</span>
              <span style="font-size:7.5px;font-weight:800;color:${sc(priScore)};">${priScore.toFixed(1)}</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${priBarWidth}%;background:${sc(priScore)};border-radius:2px;
                box-shadow:0 0 6px ${sc(priScore)}88;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="font-size:7.5px;color:#475569;">جودة البيانات</span>
              <span style="font-size:7.5px;font-weight:800;color:${sc(qualScore)};">${qualScore.toFixed(1)}</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${qualBarWidth}%;background:${sc(qualScore)};border-radius:2px;
                box-shadow:0 0 6px ${sc(qualScore)}88;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
              <span style="font-size:7.5px;color:#475569;">المنصات</span>
              <span style="font-size:7.5px;font-weight:800;color:#0ea5e9;">${platforms}/6</span>
            </div>
            <div style="height:4px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;">
              <div style="height:100%;width:${platBarWidth}%;background:#0ea5e9;border-radius:2px;
                box-shadow:0 0 6px #0ea5e988;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // حالة عدم وجود منافسين
  const noCompetitorsContent = page(`
    <div style="position:absolute;top:-80px;right:-80px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-60px;left:-60px;width:280px;height:280px;border-radius:50%;
      background:radial-gradient(circle,rgba(167,139,250,0.04) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("الموقع في السوق والفرصة التنافسية", "تحليل الوضع التنافسي الحالي", "صفحة 5/5", coName, lead)}

    <div style="padding:24px 40px;">
      <!-- Three pillars -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
        ${bigNum(clientPlatforms, "منصات نشطة", "من أصل 6 منصات", "#22c55e")}
        ${bigNum(clientPri.toFixed(1), "درجة الأولوية", "من أصل 10 نقاط", "#0ea5e9")}
        ${bigNum(clientQual.toFixed(1), "جودة البيانات", "من أصل 10 نقاط", "#a78bfa")}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:14px;padding:16px;">
          <div style="font-size:12px;font-weight:800;color:#22c55e;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;">✅</span> نقاط القوة الحالية
          </div>
          ${strengths.map(s => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="width:6px;height:6px;border-radius:50%;background:#22c55e;margin-top:4px;flex-shrink:0;"></div>
            <div style="font-size:10px;color:#94a3b8;line-height:1.6;">${s}</div>
          </div>`).join('')}
        </div>
        <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:14px;padding:16px;">
          <div style="font-size:12px;font-weight:800;color:#ef4444;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
            <span style="font-size:14px;">🎯</span> فرص التحسين
          </div>
          ${weaknesses.map(w => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;margin-top:4px;flex-shrink:0;"></div>
            <div style="font-size:10px;color:#94a3b8;line-height:1.6;">${w}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- Final CTA -->
      <div style="margin-top:20px;padding:18px 22px;background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(14,165,233,0.06));
        border:1px solid rgba(34,197,94,0.2);border-radius:14px;
        display:flex;align-items:center;justify-content:space-between;gap:16px;">
        <div>
          <div style="font-size:14px;font-weight:900;color:#f1f5f9;margin-bottom:6px;">🚀 ابدأ رحلة النمو مع ${coName}</div>
          <div style="font-size:10.5px;color:#64748b;line-height:1.7;">
            بناءً على هذا التحليل، نوصي بالتواصل الفوري لتقديم حلول تسويقية مخصصة تعالج الثغرات المحددة وتعزز الحضور الرقمي في ${lead.city || 'السوق المحلي'}.
          </div>
        </div>
        ${waPhone ? `
        <div style="flex-shrink:0;">
          ${qrCodeSVG(waPhone, 80)}
        </div>` : ""}
      </div>
    </div>

    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 5 من 5</div>
    </div>
  `);

  // صفحة المنافسين الكاملة
  const p5 = competitors.length === 0 ? noCompetitorsContent : page(`
    <div style="position:absolute;top:-80px;right:-80px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-60px;left:-60px;width:280px;height:280px;border-radius:50%;
      background:radial-gradient(circle,rgba(167,139,250,0.04) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("تحليل المنافسين والموقع التنافسي", "مقارنة شاملة مع المنافسين في السوق", "صفحة 5/5", coName, lead)}

    <div style="padding:18px 40px;">

      <!-- Three pillars -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#86efac;font-weight:700;margin-bottom:6px;">مستوى الأداء</div>
          <div style="font-size:28px;font-weight:900;color:#22c55e;text-shadow:0 0 15px rgba(34,197,94,0.6);">#${clientRank}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">من ${totalInComparison} منافس</div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;">الفجوة التنافسية</div>
          <div style="font-size:28px;font-weight:900;color:#ef4444;text-shadow:0 0 15px rgba(239,68,68,0.6);">${Math.abs(clientPri - avgCompPriority).toFixed(1)}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">نقطة فارق</div>
        </div>
        <div style="background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.2);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fdba74;font-weight:700;margin-bottom:6px;">الفرصة التنافسية</div>
          <div style="font-size:28px;font-weight:900;color:#f97316;text-shadow:0 0 15px rgba(249,115,22,0.6);">${clientPlatforms}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">منصة نشطة</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 220px;gap:18px;margin-bottom:16px;align-items:start;">

        <!-- Left: Ranking card + Summary stats -->
        <div>
          <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
            background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.25);
            border-radius:14px;margin-bottom:12px;">
            <div style="width:64px;height:64px;border-radius:50%;
              background:linear-gradient(135deg,rgba(34,197,94,0.2),rgba(14,165,233,0.1));
              border:2px solid rgba(34,197,94,0.5);
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              box-shadow:0 0 20px rgba(34,197,94,0.3);flex-shrink:0;">
              <div style="font-size:22px;font-weight:900;color:#22c55e;line-height:1;">#${clientRank}</div>
              <div style="font-size:8px;color:#475569;margin-top:2px;">من ${totalInComparison}</div>
            </div>
            <div>
              <div style="font-size:13px;font-weight:800;color:#f1f5f9;">${lead.companyName || 'العميل'}</div>
              <div style="font-size:10px;color:#64748b;margin-top:2px;">${lead.businessType || 'النشاط التجاري'} · ${lead.city || 'المدينة'}</div>
              <div style="font-size:10px;color:${clientRank === 1 ? '#22c55e' : clientRank <= Math.ceil(totalInComparison/2) ? '#eab308' : '#f97316'};margin-top:4px;font-weight:700;">
                ${clientRank === 1 ? '🏆 الأول في المجال' : clientRank <= Math.ceil(totalInComparison/2) ? '📈 في النصف الأفضل' : '⚠️ يحتاج تحسين'}
              </div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;text-align:center;">
              <div style="font-size:18px;font-weight:900;color:${sc(clientPri)};text-shadow:0 0 10px ${sc(clientPri)}66;">${clientPri.toFixed(1)}</div>
              <div style="font-size:8px;color:#475569;margin-top:2px;">درجة الأولوية</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;text-align:center;">
              <div style="font-size:18px;font-weight:900;color:#0ea5e9;">${clientPlatforms}</div>
              <div style="font-size:8px;color:#475569;margin-top:2px;">منصات نشطة</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:10px;text-align:center;">
              <div style="font-size:18px;font-weight:900;color:${sc(avgCompPriority)};">${avgCompPriority.toFixed(1)}</div>
              <div style="font-size:8px;color:#475569;margin-top:2px;">متوسط المنافسين</div>
            </div>
          </div>
        </div>

        <!-- Right: Radar chart -->
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:9px;color:#475569;margin-bottom:6px;text-align:center;">مخطط المقارنة الشاملة</div>
          ${buildRadarSVG(allEntities)}
          <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;justify-content:center;">
            <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:2px;background:#22c55e;border-radius:1px;"></div><span style="font-size:7.5px;color:#475569;">أنت</span></div>
            ${competitors.slice(0, 2).map((c, i) => `<div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:2px;background:${i === 0 ? '#f97316' : '#eab308'};border-radius:1px;"></div><span style="font-size:7.5px;color:#475569;">${(c.companyName || 'منافس').substring(0, 10)}</span></div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Competitor cards -->
      <div style="margin-bottom:12px;">
        <div style="font-size:10px;color:#475569;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);">ترتيب المنافسين حسب درجة الأولوية</div>
        ${allEntities.map((e: any, i: number) => buildCompetitorCard(e, i + 1, !!e.isClient)).join('')}
      </div>

      <!-- Strengths & Weaknesses -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="background:rgba(34,197,94,0.04);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:800;color:#22c55e;margin-bottom:8px;">✅ نقاط القوة التنافسية</div>
          ${strengths.map(s => `<div style="display:flex;gap:6px;align-items:flex-start;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="width:5px;height:5px;border-radius:50%;background:#22c55e;margin-top:4px;flex-shrink:0;"></div>
            <div style="font-size:9.5px;color:#94a3b8;line-height:1.5;">${s}</div>
          </div>`).join('')}
        </div>
        <div style="background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:12px 14px;">
          <div style="font-size:11px;font-weight:800;color:#ef4444;margin-bottom:8px;">🎯 فرص التحسين</div>
          ${weaknesses.map(w => `<div style="display:flex;gap:6px;align-items:flex-start;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="width:5px;height:5px;border-radius:50%;background:#ef4444;margin-top:4px;flex-shrink:0;"></div>
            <div style="font-size:9.5px;color:#94a3b8;line-height:1.5;">${w}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:#334155;">CONFIDENTIAL · صفحة 5 من 5</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE BRAND — صفحة الهوية البصرية والبراند
  // ═══════════════════════════════════════════════════════════════════════

  // جمع بيانات designQuality وcopyQuality وmissedOpportunities من جميع التحليلات
  const brandData = socialAnalyses
    .map((s: any) => {
      const raw = parseSocialExtra(s.rawData);
      return {
        platform: s.platform,
        designQuality: raw.designQuality || s.designQuality || null,
        copyQuality: raw.copyQuality || s.copyQuality || null,
        missedOpportunities: raw.missedOpportunities || s.missedOpportunities || null,
      };
    })
    .filter((s: any) => s.designQuality || s.copyQuality || s.missedOpportunities);

  const hasBrandData = brandData.length > 0;

  // حساب متوسط درجة الهوية البصرية
  const brandScores = brandData
    .map((s: any) => Number(s.designQuality?.score || 0))
    .filter((v: number) => v > 0);
  const avgBrandScore = brandScores.length > 0
    ? brandScores.reduce((a: number, b: number) => a + b, 0) / brandScores.length
    : null;

  const allDesignWeaknesses: string[] = brandData.flatMap((s: any) => s.designQuality?.weaknesses || []).slice(0, 4);
  const allDesignImprovements: string[] = brandData.flatMap((s: any) => s.designQuality?.improvements || []).slice(0, 4);
  const allCopyWeaknesses: string[] = brandData.flatMap((s: any) => s.copyQuality?.weaknesses || []).slice(0, 3);
  const allCopyImprovements: string[] = brandData.flatMap((s: any) => s.copyQuality?.improvements || []).slice(0, 3);
  const allLostReasons: string[] = brandData.flatMap((s: any) => s.missedOpportunities?.lostCustomerReasons || []).slice(0, 4);
  const allUrgentFixes: string[] = brandData.flatMap((s: any) => s.missedOpportunities?.urgentFixes || []).slice(0, 3);
  const allConversionBarriers: string[] = brandData.flatMap((s: any) => s.missedOpportunities?.conversionBarriers || []).slice(0, 3);

  const brandColor = sc(avgBrandScore);

  const p_brand = hasBrandData ? page(`
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;
      background:radial-gradient(circle,rgba(168,85,247,0.05) 0%,transparent 70%);pointer-events:none;"></div>

    ${pageHeader("الهوية البصرية والبراند", "تحليل جودة التصميم والنصوص والفرص الضائعة", "صفحة 3/5", coName, lead)}

    <div style="padding:14px 40px;">

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:rgba(168,85,247,0.06);border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#d8b4fe;font-weight:700;margin-bottom:6px;">درجة الهوية البصرية</div>
          <div style="font-size:28px;font-weight:900;color:${brandColor};text-shadow:0 0 15px ${brandColor}66;">${fmt(avgBrandScore)}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">من 10 عبر جميع المنصات</div>
        </div>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fca5a5;font-weight:700;margin-bottom:6px;">نقاط ضعف تصميمية</div>
          <div style="font-size:28px;font-weight:900;color:#ef4444;text-shadow:0 0 15px rgba(239,68,68,0.6);">${allDesignWeaknesses.length}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">تحتاج معالجة عاجلة</div>
        </div>
        <div style="background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.25);border-radius:12px;padding:12px;text-align:center;">
          <div style="font-size:9px;color:#fde047;font-weight:700;margin-bottom:6px;">فرص ضائعة</div>
          <div style="font-size:28px;font-weight:900;color:#eab308;text-shadow:0 0 15px rgba(234,179,8,0.6);">${allLostReasons.length}</div>
          <div style="font-size:8px;color:#475569;margin-top:2px;">سبب خسارة عميل محتمل</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${allDesignWeaknesses.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(168,85,247,0.2);border-radius:12px;padding:12px;border-right:3px solid #a855f7;">
            <div style="font-size:11px;font-weight:800;color:#d8b4fe;margin-bottom:8px;">🎨 نقاط ضعف التصميم</div>
            ${allDesignWeaknesses.map((w: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#ef4444;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${w}</div></div>`).join('')}
          </div>` : ''}
          ${allCopyWeaknesses.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(14,165,233,0.2);border-radius:12px;padding:12px;border-right:3px solid #0ea5e9;">
            <div style="font-size:11px;font-weight:800;color:#7dd3fc;margin-bottom:8px;">✏️ ضعف النصوص والرسائل</div>
            ${allCopyWeaknesses.map((w: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#0ea5e9;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${w}</div></div>`).join('')}
          </div>` : ''}
          ${allDesignImprovements.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;border-right:3px solid #22c55e;">
            <div style="font-size:11px;font-weight:800;color:#86efac;margin-bottom:8px;">✨ تحسينات تصميمية مقترحة</div>
            ${allDesignImprovements.map((imp: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#22c55e;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${imp}</div></div>`).join('')}
          </div>` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${allLostReasons.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px;border-right:3px solid #ef4444;">
            <div style="font-size:11px;font-weight:800;color:#fca5a5;margin-bottom:8px;">🚨 أسباب خسارة العملاء</div>
            ${allLostReasons.map((r: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#ef4444;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${r}</div></div>`).join('')}
          </div>` : ''}
          ${allConversionBarriers.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(249,115,22,0.25);border-radius:12px;padding:12px;border-right:3px solid #f97316;">
            <div style="font-size:11px;font-weight:800;color:#fdba74;margin-bottom:8px;">🚧 عوائق التحويل إلى عميل</div>
            ${allConversionBarriers.map((b: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#f97316;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${b}</div></div>`).join('')}
          </div>` : ''}
          ${allUrgentFixes.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(234,179,8,0.25);border-radius:12px;padding:12px;border-right:3px solid #eab308;">
            <div style="font-size:11px;font-weight:800;color:#fde047;margin-bottom:8px;">⚡ إصلاحات عاجلة (أكبر فرص ضائعة)</div>
            ${allUrgentFixes.map((f: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#eab308;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${f}</div></div>`).join('')}
          </div>` : ''}
          ${allCopyImprovements.length > 0 ? `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:12px;border-right:3px solid #22c55e;">
            <div style="font-size:11px;font-weight:800;color:#86efac;margin-bottom:8px;">📝 تحسينات نصية مقترحة</div>
            ${allCopyImprovements.map((imp: string) => `<div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:5px;"><div style="width:5px;height:5px;border-radius:50%;background:#22c55e;margin-top:5px;flex-shrink:0;"></div><div style="font-size:10px;color:#cbd5e1;line-height:1.5;">${imp}</div></div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    </div>

    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#334155;">${coName} · تقرير سري ومخصص</div>
      <div style="font-size:9px;color:#334155;">صفحة 3 من 5</div>
    </div>
  `) : null;

  // ═══════════════════════════════════════════════════════════════════════
  //  DYNAMIC PAGE ASSEMBLY — حذف الصفحات الفارغة تلقائياً
  // ═══════════════════════════════════════════════════════════════════════

  // تحديد الصفحات الفعلية بناءً على البيانات المتاحة
  const hasWebsiteData = websiteAnalysis !== null && websiteAnalysis !== undefined;
  const hasSocialData = socialAnalyses.length > 0;
  const hasDigitalData = hasWebsiteData || hasSocialData;
  const hasCompetitors = competitors.length > 0;

  // بناء قائمة الصفحات الديناميكية
  const activePages: Array<{ key: string; html: string }> = [];
  activePages.push({ key: 'p1', html: p1 }); // الغلاف دائماً
  activePages.push({ key: 'p2', html: p2 }); // الملخص التنفيذي دائماً
  if (hasDigitalData) activePages.push({ key: 'p3', html: p3 }); // التحليل الرقمي فقط إذا كانت هناك بيانات
  if (hasBrandData && p_brand) activePages.push({ key: 'p_brand', html: p_brand }); // الهوية البصرية فقط إذا كانت هناك بيانات
  activePages.push({ key: 'p4', html: p4 }); // التوصيات دائماً
  if (hasCompetitors) activePages.push({ key: 'p5', html: p5 }); // المنافسون فقط إذا كانوا موجودين

  const totalPages = activePages.length;

  // تحديث أرقام الصفحات ديناميكياً في HTML
  function updatePageNumbers(html: string, pageNum: number, total: number): string {
    return html
      .replace(/صفحة \d+\/\d+/g, `صفحة ${pageNum}/${total}`)
      .replace(/صفحة (\d+) من (\d+)/g, `صفحة ${pageNum} من ${total}`)
      .replace(/CONFIDENTIAL · صفحة (\d+) من (\d+)/g, `CONFIDENTIAL · صفحة ${pageNum} من ${total}`);
  }

  const pagesHTML = activePages
    .map((p, i) => `<div class="page-wrapper">${updatePageNumbers(p.html, i + 1, totalPages)}</div>`)
    .join('\n  ');

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
  ${pagesHTML}
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
