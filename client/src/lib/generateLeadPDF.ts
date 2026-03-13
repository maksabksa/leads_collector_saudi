// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — 4-Page Structured Report v5
//  صفحة 1: الغلاف  |  صفحة 2: الملخص التنفيذي
//  صفحة 3: التقييم الرقمي  |  صفحة 4: التوصيات + CTA
// ═══════════════════════════════════════════════════════════════════════

interface GeneratePDFOptions {
  lead?: any;
  websiteAnalysis?: any;
  socialAnalyses?: any[];
  report?: any;
  company?: any;
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
  if (v >= 8) return "0 0 16px rgba(34,197,94,0.6)";
  if (v >= 6) return "0 0 16px rgba(234,179,8,0.6)";
  if (v >= 4) return "0 0 16px rgba(249,115,22,0.6)";
  return "0 0 16px rgba(239,68,68,0.6)";
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
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}
function parseSocialExtra(raw?: string | null) {
  if (!raw) return {};
  try { const o = JSON.parse(raw); return typeof o === "object" ? o : {}; } catch { return {}; }
}

// ─── Platform meta ────────────────────────────────────────────────────────────
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

// ─── Score ring ───────────────────────────────────────────────────────────────
function ring(v?: number | null, size = 72, label = "") {
  const color = sc(v); const glow = sg(v);
  const d = v ? Number(v).toFixed(0) : "—";
  const fs = size > 60 ? 24 : 16;
  return `<div style="text-align:center;">
    <div style="width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid ${color};
      box-shadow:${glow};display:flex;align-items:center;justify-content:center;
      font-size:${fs}px;font-weight:900;color:${color};background:#060d1a;margin:0 auto ${label ? "6px" : "0"};">
      ${d}
    </div>
    ${label ? `<div style="font-size:10px;color:#64748b;font-weight:600;">${label}</div>` : ""}
  </div>`;
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function bar(v?: number | null, label = "", max = 10) {
  const pct = v ? Math.min((v / max) * 100, 100) : 0;
  const color = sc(v);
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
    <span style="font-size:11px;color:#64748b;min-width:90px;text-align:right;">${label}</span>
    <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${color},${color}88);
        border-radius:3px;box-shadow:0 0 8px ${color}55;"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:${color};min-width:26px;">${fmt(v)}</span>
  </div>`;
}

// ─── QR ───────────────────────────────────────────────────────────────────────
function qr(data: string, color = "22c55e") {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}&bgcolor=060d1a&color=${color}&format=svg&margin=4`;
}

// ─── Urgency ──────────────────────────────────────────────────────────────────
function urg(level?: string | null) {
  switch (level) {
    case "high":   return { text: "أولوية عالية",     color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" };
    case "medium": return { text: "أولوية متوسطة",   color: "#eab308", bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.3)" };
    case "low":    return { text: "أولوية منخفضة",   color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.3)" };
    default:       return { text: "غير محدد",         color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)" };
  }
}

// ─── Stat box ─────────────────────────────────────────────────────────────────
function statBox(icon: string, label: string, value: string, color = "#94a3b8", sub = "") {
  return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);
    border-radius:10px;padding:14px 16px;text-align:center;">
    <div style="font-size:20px;margin-bottom:6px;">${icon}</div>
    <div style="font-size:20px;font-weight:900;color:${color};text-shadow:0 0 12px ${color}55;line-height:1;">${value}</div>
    ${sub ? `<div style="font-size:10px;color:#475569;margin-top:2px;">${sub}</div>` : ""}
    <div style="font-size:10px;color:#475569;margin-top:4px;font-weight:600;">${label}</div>
  </div>`;
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
function page(content: string, pageBreak = true) {
  return `<div style="min-height:100vh;display:flex;flex-direction:column;padding:0;
    ${pageBreak ? "page-break-after:always;" : ""}
    background:linear-gradient(160deg,#020810 0%,#060d1a 50%,#020810 100%);">
    ${content}
  </div>`;
}

// ─── Section header ───────────────────────────────────────────────────────────
function sh(title: string, sub = "") {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
    <div style="width:3px;height:22px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);
      box-shadow:0 0 8px rgba(34,197,94,0.5);flex-shrink:0;"></div>
    <div>
      <div style="font-size:15px;font-weight:800;color:#f8fafc;">${title}</div>
      ${sub ? `<div style="font-size:11px;color:#475569;margin-top:1px;">${sub}</div>` : ""}
    </div>
  </div>`;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function card(content: string, accent = "#22c55e", style = "") {
  return `<div style="background:linear-gradient(135deg,#0d1f3c,#080f1e);
    border:1px solid ${accent}18;border-radius:12px;padding:18px 20px;
    position:relative;overflow:hidden;${style}">
    <div style="position:absolute;top:0;right:0;width:80px;height:80px;
      background:radial-gradient(circle,${accent}06 0%,transparent 70%);"></div>
    ${content}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════
export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");

  const coName    = company?.companyName || "مكسب";
  const coLogo    = company?.logoUrl || "";
  const clLogo    = lead.clientLogoUrl || "";
  const reportDate = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const urgency   = urg(lead.urgencyLevel || lead.priority);
  const priScore  = lead.leadPriorityScore ? Number(lead.leadPriorityScore) : null;
  const qualScore = lead.dataQualityScore  ? Number(lead.dataQualityScore)  : null;
  const wsScore   = websiteAnalysis?.overallScore ? Number(websiteAnalysis.overallScore) : null;

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
    lead.biggestMarketingGap.split(/\n|•|-/).map((s: string) => s.trim()).filter(Boolean).slice(0, 6).forEach((g: string) => gaps.push(g));
  }

  // ── Social analyses ──
  const socials = socialAnalyses.map((sa: any) => {
    const ex = parseSocialExtra(sa.rawAnalysis);
    return {
      ...sa,
      followersCount:        sa.followersCount        || ex.followersCount        || ex.followers_count        || null,
      postsCount:            sa.postsCount            || ex.postsCount            || ex.posts_count            || null,
      engagementRate:        sa.engagementRate        || ex.engagementRate        || ex.engagement_rate        || null,
      avgLikes:              sa.avgLikes              || ex.avgLikes              || ex.avg_likes              || null,
      avgViews:              sa.avgViews              || ex.avgViews              || ex.avg_views              || null,
      analysisText:          sa.analysisText          || sa.summary               || ex.summary                || null,
      overallScore:          sa.overallScore          || ex.overallScore          || null,
      postingFrequencyScore: sa.postingFrequencyScore || ex.postingFrequencyScore || null,
      engagementScore:       sa.engagementScore       || ex.engagementScore       || null,
      contentQualityScore:   sa.contentQualityScore   || ex.contentQualityScore   || null,
      gaps:                  sa.gaps                  || ex.gaps                  || [],
    };
  });

  // ── Website scores ──
  const wsItems = websiteAnalysis ? [
    { label: "الإجمالي",  value: websiteAnalysis.overallScore },
    { label: "السرعة",    value: websiteAnalysis.loadSpeedScore },
    { label: "الجوال",    value: websiteAnalysis.mobileExperienceScore },
    { label: "SEO",       value: websiteAnalysis.seoScore },
    { label: "المحتوى",   value: websiteAnalysis.contentQualityScore },
    { label: "التصميم",   value: websiteAnalysis.designScore },
  ] : [];

  // ── Social links ──
  const sLinks = [
    lead.instagramUrl && { icon: "📸", label: "إنستغرام", val: cleanUrl(lead.instagramUrl, "instagram") },
    lead.twitterUrl   && { icon: "🐦", label: "تويتر",    val: cleanUrl(lead.twitterUrl,   "twitter")   },
    lead.tiktokUrl    && { icon: "🎵", label: "تيك توك",  val: cleanUrl(lead.tiktokUrl,    "tiktok")    },
    lead.snapchatUrl  && { icon: "👻", label: "سناب",     val: cleanUrl(lead.snapchatUrl,  "snapchat")  },
    lead.facebookUrl  && { icon: "📘", label: "فيسبوك",   val: cleanUrl(lead.facebookUrl,  "facebook")  },
    lead.linkedinUrl  && { icon: "💼", label: "لينكد إن", val: cleanUrl(lead.linkedinUrl,  "linkedin")  },
  ].filter(Boolean) as { icon: string; label: string; val: string }[];

  // ── Avg social score ──
  const socialScores = socials.map(s => s.overallScore ? Number(s.overallScore) : null).filter(Boolean) as number[];
  const avgSocialScore = socialScores.length ? socialScores.reduce((a, b) => a + b, 0) / socialScores.length : null;

  // ── Total followers ──
  const totalFollowers = socials.reduce((sum, s) => sum + (s.followersCount ? Number(s.followersCount) : 0), 0);

  // ─────────────────────────────────────────────────────────────────────
  //  PAGE 1 — COVER
  // ─────────────────────────────────────────────────────────────────────
  const p1 = page(`
    <!-- Grid background -->
    <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(34,197,94,0.02) 1px,transparent 1px),
      linear-gradient(90deg,rgba(34,197,94,0.02) 1px,transparent 1px);background-size:44px 44px;pointer-events:none;"></div>
    <!-- Glow -->
    <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 65%);pointer-events:none;"></div>
    <div style="position:absolute;bottom:-80px;left:-80px;width:350px;height:350px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 65%);pointer-events:none;"></div>

    <!-- Top bar -->
    <div style="padding:24px 48px;display:flex;justify-content:space-between;align-items:center;
      border-bottom:1px solid rgba(255,255,255,0.05);position:relative;z-index:1;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${coLogo
          ? `<img src="${coLogo}" style="width:44px;height:44px;border-radius:10px;object-fit:contain;background:#0f172a;padding:3px;border:1px solid rgba(34,197,94,0.2);" alt="${coName}">`
          : `<div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(34,197,94,0.25);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#22c55e;">${coName.charAt(0)}</div>`
        }
        <div>
          <div style="font-size:16px;font-weight:800;color:#f8fafc;">${coName}</div>
          <div style="font-size:10px;color:#475569;letter-spacing:0.5px;">${company?.reportHeaderText || "تقرير تحليل الوضع الرقمي"}</div>
        </div>
      </div>
      <div style="text-align:left;font-size:10px;color:#334155;line-height:1.8;">
        <div>رقم التقرير: <strong style="color:#22c55e;">#${String(lead.id || "—").padStart(6, "0")}</strong></div>
        <div>${reportDate}</div>
        ${company?.licenseNumber ? `<div>ترخيص: ${company.licenseNumber}</div>` : ""}
      </div>
    </div>

    <!-- Center body -->
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:32px 60px;position:relative;z-index:1;text-align:center;">

      <!-- Client logo -->
      <div style="margin-bottom:20px;">
        ${clLogo
          ? `<img src="${clLogo}" style="width:100px;height:100px;border-radius:20px;object-fit:contain;
              background:#0f172a;padding:6px;border:2px solid rgba(255,255,255,0.1);
              box-shadow:0 0 30px rgba(255,255,255,0.06),0 8px 32px rgba(0,0,0,0.5);" alt="${lead.companyName}"
              onerror="this.style.display='none';">`
          : `<div style="width:100px;height:100px;border-radius:20px;background:linear-gradient(135deg,#1e293b,#0f172a);
              border:2px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;
              font-size:40px;font-weight:900;color:#64748b;box-shadow:0 8px 32px rgba(0,0,0,0.5);margin:0 auto;">
              ${(lead.companyName || "?").charAt(0)}
            </div>`
        }
      </div>

      <!-- Label -->
      <div style="font-size:11px;font-weight:700;letter-spacing:3px;color:#22c55e;opacity:0.7;margin-bottom:14px;">
        تقرير تحليل رقمي شامل
      </div>

      <!-- Client name -->
      <div style="font-size:52px;font-weight:900;background:linear-gradient(135deg,#ffffff 0%,#94a3b8 70%);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.1;margin-bottom:10px;">
        ${lead.companyName || "—"}
      </div>

      <!-- Meta row -->
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;
        font-size:13px;color:#475569;margin-bottom:24px;">
        ${lead.businessType ? `<span>${lead.businessType}</span>` : ""}
        ${lead.businessType && lead.city ? `<span style="color:#1e293b;">·</span>` : ""}
        ${lead.city ? `<span>${lead.city}</span>` : ""}
        ${lead.crNumber ? `<span style="color:#1e293b;">·</span><span style="color:#0ea5e9;font-weight:700;">سجل: ${lead.crNumber}</span>` : ""}
        ${lead.socialSince ? `<span style="color:#1e293b;">·</span><span>منذ ${lead.socialSince}</span>` : ""}
      </div>

      <!-- Divider -->
      <div style="width:100px;height:2px;background:linear-gradient(90deg,transparent,#22c55e,transparent);
        margin:0 auto 28px;box-shadow:0 0 10px rgba(34,197,94,0.4);"></div>

      <!-- Score rings -->
      ${(priScore || qualScore || wsScore || lead.rating) ? `
      <div style="display:flex;gap:32px;justify-content:center;flex-wrap:wrap;margin-bottom:24px;">
        ${priScore  ? ring(priScore,  80, "الأولوية")    : ""}
        ${qualScore ? ring(qualScore, 80, "جودة البيانات") : ""}
        ${wsScore   ? ring(wsScore,   80, "تقييم الموقع") : ""}
        ${lead.rating ? `<div style="text-align:center;">
          <div style="font-size:32px;font-weight:900;color:#eab308;text-shadow:0 0 16px rgba(234,179,8,0.6);line-height:1;">⭐ ${lead.rating}</div>
          ${lead.reviewCount ? `<div style="font-size:10px;color:#64748b;margin-top:6px;">${lead.reviewCount} تقييم</div>` : ""}
          <div style="font-size:10px;color:#64748b;font-weight:600;margin-top:4px;">جوجل</div>
        </div>` : ""}
      </div>` : ""}

      <!-- Urgency pill -->
      <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 24px;border-radius:24px;
        font-size:12px;font-weight:700;background:${urgency.bg};color:${urgency.color};
        border:1px solid ${urgency.border};box-shadow:0 0 14px ${urgency.color}22;">
        ${urgency.text}
      </div>
    </div>

    <!-- Bottom bar -->
    <div style="padding:20px 48px;border-top:1px solid rgba(255,255,255,0.04);
      display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">
      <div style="font-size:10px;color:#334155;line-height:1.8;">
        <div style="font-weight:700;color:#22c55e;font-size:11px;margin-bottom:2px;">${coName}</div>
        <div>${company?.website || "maksab-ksa.com"}</div>
        ${company?.phone ? `<div>${company.phone}</div>` : ""}
      </div>
      <div style="font-size:9px;color:#1e293b;letter-spacing:2px;text-transform:uppercase;">
        حصري · سري · للاستخدام الداخلي فقط
      </div>
    </div>
  `);

  // ─────────────────────────────────────────────────────────────────────
  //  PAGE 2 — EXECUTIVE SUMMARY + GAPS + OPPORTUNITY
  // ─────────────────────────────────────────────────────────────────────
  const p2 = page(`
    <!-- Page header strip -->
    <div style="background:linear-gradient(135deg,#0a1628,#0d1f3c);border-bottom:1px solid rgba(34,197,94,0.1);
      padding:18px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:18px;font-weight:800;color:#f8fafc;">الملخص التنفيذي</div>
      <div style="font-size:11px;color:#334155;">${lead.companyName} · صفحة 2</div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#8b5cf6,#22c55e);"></div>

    <div style="padding:28px 40px;flex:1;display:flex;flex-direction:column;gap:22px;">

      <!-- Contact + basic info -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        ${card(`
          <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:12px;letter-spacing:0.5px;">بيانات التواصل</div>
          ${phones.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            ${phones.map(p => `<span style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);
              border-radius:6px;padding:4px 12px;font-size:13px;font-weight:700;color:#22c55e;font-family:monospace;direction:ltr;">${p}</span>`).join("")}
          </div>` : ""}
          ${lead.email ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">📧 ${lead.email}</div>` : ""}
          ${lead.website ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:4px;">🌐 ${lead.website}</div>` : ""}
          ${sLinks.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
            ${sLinks.map(s => `<span style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
              border-radius:5px;padding:3px 8px;font-size:10px;color:#64748b;">${s.icon} ${s.val}</span>`).join("")}
          </div>` : ""}
        `)}
        ${card(`
          <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:12px;letter-spacing:0.5px;">بيانات النشاط</div>
          ${lead.businessType ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">🏢 ${lead.businessType}</div>` : ""}
          ${lead.city ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">📍 ${lead.city}${lead.country ? "، " + lead.country : ""}</div>` : ""}
          ${lead.crNumber ? `<div style="font-size:12px;color:#0ea5e9;margin-bottom:6px;font-weight:700;">📋 سجل تجاري: ${lead.crNumber}</div>` : ""}
          ${lead.socialSince ? `<div style="font-size:12px;color:#94a3b8;margin-bottom:6px;">📅 على السوشيال منذ: ${lead.socialSince}</div>` : ""}
          ${lead.rating ? `<div style="font-size:12px;color:#eab308;margin-bottom:6px;">⭐ تقييم جوجل: ${lead.rating}${lead.reviewCount ? " (" + lead.reviewCount + " تقييم)" : ""}</div>` : ""}
          <div style="margin-top:8px;display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:12px;
            font-size:11px;font-weight:700;background:${urgency.bg};color:${urgency.color};border:1px solid ${urgency.border};">
            ${urgency.text}
          </div>
        `)}
      </div>

      <!-- Gaps -->
      ${gaps.length > 0 ? `
      <div>
        ${sh("أبرز الفجوات التشغيلية", "نقاط الضعف الحرجة التي تحتاج معالجة فورية")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${gaps.slice(0, 6).map((g, i) => `
            <div style="display:flex;align-items:flex-start;gap:10px;background:rgba(239,68,68,0.04);
              border:1px solid rgba(239,68,68,0.1);border-radius:8px;padding:10px 12px;">
              <div style="width:22px;height:22px;border-radius:50%;background:rgba(239,68,68,0.12);
                display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;
                color:#ef4444;flex-shrink:0;">${i + 1}</div>
              <span style="font-size:12px;color:#94a3b8;line-height:1.6;">${g}</span>
            </div>
          `).join("")}
        </div>
      </div>` : ""}

      <!-- Revenue opportunity -->
      ${lead.revenueOpportunity ? `
      <div>
        ${sh("الفرصة التجارية", "تقدير الإمكانية الاستراتيجية")}
        <div style="background:linear-gradient(135deg,rgba(34,197,94,0.06),rgba(14,165,233,0.04));
          border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:18px 20px;">
          <div style="font-size:13px;color:#94a3b8;line-height:1.85;">${lead.revenueOpportunity}</div>
        </div>
      </div>` : ""}

      <!-- Sales angle -->
      ${lead.suggestedSalesEntryAngle ? `
      <div>
        ${sh("زاوية الدخول المقترحة")}
        ${card(`<div style="font-size:13px;color:#94a3b8;line-height:1.85;">${lead.suggestedSalesEntryAngle}</div>`, "#0ea5e9")}
      </div>` : ""}

      <!-- Ice breaker -->
      ${lead.iceBreaker ? `
      <div style="background:rgba(139,92,246,0.06);border:1px solid rgba(139,92,246,0.15);
        border-radius:10px;padding:14px 18px;display:flex;align-items:flex-start;gap:12px;">
        <div style="font-size:20px;flex-shrink:0;">💬</div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#8b5cf6;margin-bottom:6px;">مقترح فاتحة الحديث</div>
          <div style="font-size:12px;color:#94a3b8;line-height:1.7;">${lead.iceBreaker}</div>
        </div>
      </div>` : ""}

    </div>
  `);

  // ─────────────────────────────────────────────────────────────────────
  //  PAGE 3 — DIGITAL ASSESSMENT (numbers + visualization)
  // ─────────────────────────────────────────────────────────────────────
  const p3 = page(`
    <div style="background:linear-gradient(135deg,#0a1628,#0d1f3c);border-bottom:1px solid rgba(14,165,233,0.1);
      padding:18px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:18px;font-weight:800;color:#f8fafc;">التقييم الرقمي</div>
      <div style="font-size:11px;color:#334155;">${lead.companyName} · صفحة 3</div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#8b5cf6,#22c55e);"></div>

    <div style="padding:28px 40px;flex:1;display:flex;flex-direction:column;gap:22px;">

      <!-- Overall score overview -->
      <div>
        ${sh("نظرة عامة على الأداء الرقمي")}
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
          ${statBox("🎯", "الأولوية", priScore ? priScore.toFixed(0) + "/10" : "—", sc(priScore))}
          ${statBox("📱", "متوسط السوشيال", avgSocialScore ? avgSocialScore.toFixed(1) + "/10" : "—", sc(avgSocialScore))}
          ${statBox("🌐", "تقييم الموقع", wsScore ? wsScore.toFixed(1) + "/10" : "—", sc(wsScore))}
          ${statBox("👥", "إجمالي المتابعين", fmtK(totalFollowers || null), "#0ea5e9")}
        </div>
      </div>

      <!-- Website analysis -->
      ${websiteAnalysis ? `
      <div>
        ${sh("تحليل الموقع الإلكتروني", lead.website || "")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            ${wsItems.filter(i => i.value).map(i => bar(i.value, i.label)).join("")}
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${wsItems.filter(i => i.value).map(i => `
              <div style="background:rgba(255,255,255,0.03);border:1px solid ${sc(i.value)}18;
                border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:900;color:${sc(i.value)};
                  text-shadow:${sg(i.value)};line-height:1;">${fmt(i.value)}</div>
                <div style="font-size:9px;color:#475569;margin-top:4px;font-weight:600;">${i.label}</div>
              </div>
            `).join("")}
          </div>
        </div>
        ${websiteAnalysis.summary ? `<div style="margin-top:12px;font-size:12px;color:#64748b;line-height:1.7;
          background:rgba(255,255,255,0.02);border-radius:8px;padding:12px 14px;">${websiteAnalysis.summary}</div>` : ""}
      </div>` : ""}

      <!-- Social media numbers -->
      ${socials.length > 0 ? `
      <div>
        ${sh("أرقام منصات التواصل الاجتماعي")}
        <div style="display:grid;grid-template-columns:repeat(${Math.min(socials.length, 3)},1fr);gap:12px;">
          ${socials.map(sa => {
            const m = pm(sa.platform);
            return `
              <div style="background:linear-gradient(135deg,#0d1f3c,#080f1e);border:1px solid ${m.color}18;
                border-radius:12px;padding:16px;position:relative;overflow:hidden;">
                <div style="position:absolute;top:0;right:0;width:60px;height:60px;
                  background:radial-gradient(circle,${m.color}08 0%,transparent 70%);"></div>
                <!-- Platform header -->
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                  <div style="display:flex;align-items:center;gap:7px;">
                    <span style="font-size:16px;">${m.icon}</span>
                    <span style="font-size:13px;font-weight:700;color:${m.color};">${m.name}</span>
                  </div>
                  ${sa.overallScore ? ring(Number(sa.overallScore), 36) : ""}
                </div>
                <!-- Key numbers -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
                  ${sa.followersCount ? `<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:7px 8px;text-align:center;">
                    <div style="font-size:16px;font-weight:900;color:${m.color};">${fmtK(sa.followersCount)}</div>
                    <div style="font-size:9px;color:#475569;">متابع</div>
                  </div>` : ""}
                  ${sa.postsCount ? `<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:7px 8px;text-align:center;">
                    <div style="font-size:16px;font-weight:900;color:#94a3b8;">${fmtK(sa.postsCount)}</div>
                    <div style="font-size:9px;color:#475569;">منشور</div>
                  </div>` : ""}
                  ${sa.engagementRate ? `<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:7px 8px;text-align:center;">
                    <div style="font-size:16px;font-weight:900;color:#22c55e;">${Number(sa.engagementRate).toFixed(2)}%</div>
                    <div style="font-size:9px;color:#475569;">تفاعل</div>
                  </div>` : ""}
                  ${sa.avgLikes ? `<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:7px 8px;text-align:center;">
                    <div style="font-size:16px;font-weight:900;color:#f97316;">${fmtK(sa.avgLikes)}</div>
                    <div style="font-size:9px;color:#475569;">متوسط إعجاب</div>
                  </div>` : ""}
                </div>
                <!-- Sub-scores bars -->
                ${(sa.postingFrequencyScore || sa.engagementScore || sa.contentQualityScore) ? `
                <div style="border-top:1px solid rgba(255,255,255,0.04);padding-top:10px;">
                  ${bar(sa.postingFrequencyScore, "التكرار")}
                  ${bar(sa.engagementScore,       "التفاعل")}
                  ${bar(sa.contentQualityScore,   "المحتوى")}
                </div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>` : ""}

      <!-- Full report excerpt -->
      ${report?.fullReport ? `
      <div>
        ${sh("التحليل التفصيلي")}
        ${card(`<div style="font-size:12px;color:#94a3b8;line-height:1.9;">
          <p>${cleanMarkdown(typeof report.fullReport === "string" ? report.fullReport.slice(0, 800) + (report.fullReport.length > 800 ? "..." : "") : "")}</p>
        </div>`)}
      </div>` : ""}

    </div>
  `);

  // ─────────────────────────────────────────────────────────────────────
  //  PAGE 4 — PLATFORMS ASSESSMENT + TARGETS + CTA + FOOTER
  // ─────────────────────────────────────────────────────────────────────
  const p4 = page(`
    <div style="background:linear-gradient(135deg,#0a1628,#0d1f3c);border-bottom:1px solid rgba(139,92,246,0.1);
      padding:18px 40px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:18px;font-weight:800;color:#f8fafc;">التوصيات والخطوة القادمة</div>
      <div style="font-size:11px;color:#334155;">${lead.companyName} · صفحة 4</div>
    </div>
    <div style="height:2px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#8b5cf6,#22c55e);"></div>

    <div style="padding:28px 40px;flex:1;display:flex;flex-direction:column;gap:22px;">

      <!-- Before / After comparison -->
      <div>
        ${sh("مقارنة الوضع الحالي مع المستهدف")}
        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:0;align-items:stretch;">
          <!-- Current -->
          <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);
            border-radius:12px 0 0 12px;padding:18px 20px;">
            <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:14px;">⚠️ الوضع الحالي</div>
            ${gaps.slice(0, 4).map(g => `
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:5px;"></div>
                <span style="font-size:11px;color:#64748b;line-height:1.6;">${g}</span>
              </div>
            `).join("")}
            ${!gaps.length ? `
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">غياب استراتيجية رقمية موثقة</span></div>
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">محدودية الظهور في البحث المحلي</span></div>
              <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#ef4444;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">ضعف استثمار قنوات التواصل</span></div>
            ` : ""}
            <div style="margin-top:14px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#ef4444;text-shadow:0 0 14px rgba(239,68,68,0.5);">
                ${wsScore ? wsScore.toFixed(0) : (priScore ? priScore.toFixed(0) : "—")}/10
              </div>
              <div style="font-size:10px;color:#475569;margin-top:3px;">الدرجة الحالية</div>
            </div>
          </div>
          <!-- Arrow -->
          <div style="display:flex;align-items:center;justify-content:center;padding:0 16px;
            background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.04);
            border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="font-size:28px;color:#334155;">→</div>
          </div>
          <!-- Target -->
          <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.15);
            border-radius:0 12px 12px 0;padding:18px 20px;">
            <div style="font-size:12px;font-weight:700;color:#22c55e;margin-bottom:14px;">✅ مع ${coName}</div>
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">حضور رقمي متكامل عبر جميع المنصات</span></div>
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">استراتيجية محتوى مبنية على بيانات الجمهور</span></div>
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">تعزيز الظهور العضوي في محركات البحث</span></div>
            <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#22c55e;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#64748b;">تحويل الزيارات إلى إيراد قابل للقياس</span></div>
            ${lead.revenueOpportunity ? `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;"><div style="width:6px;height:6px;border-radius:50%;background:#0ea5e9;flex-shrink:0;margin-top:5px;"></div><span style="font-size:11px;color:#0ea5e9;font-weight:600;">${lead.revenueOpportunity.slice(0, 90)}${lead.revenueOpportunity.length > 90 ? "..." : ""}</span></div>` : ""}
            <div style="margin-top:14px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#22c55e;text-shadow:0 0 14px rgba(34,197,94,0.5);">9+/10</div>
              <div style="font-size:10px;color:#475569;margin-top:3px;">الهدف المستهدف</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Social platform assessment (text summaries) -->
      ${socials.filter(s => s.analysisText).length > 0 ? `
      <div>
        ${sh("تقييم المنصات", "ملخص الأداء والتوصيات لكل منصة")}
        <div style="display:grid;grid-template-columns:repeat(${Math.min(socials.filter(s => s.analysisText).length, 2)},1fr);gap:10px;">
          ${socials.filter(s => s.analysisText).map(sa => {
            const m = pm(sa.platform);
            const gapsList: string[] = Array.isArray(sa.gaps) ? sa.gaps.slice(0, 2) : [];
            return `
              <div style="background:rgba(255,255,255,0.02);border:1px solid ${m.color}15;border-radius:10px;padding:14px 16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <span>${m.icon}</span>
                  <span style="font-size:12px;font-weight:700;color:${m.color};">${m.name}</span>
                  ${sa.overallScore ? `<span style="font-size:11px;font-weight:800;color:${sc(Number(sa.overallScore))};margin-right:auto;">${Number(sa.overallScore).toFixed(0)}/10</span>` : ""}
                </div>
                <div style="font-size:11px;color:#64748b;line-height:1.65;margin-bottom:8px;">
                  ${sa.analysisText.slice(0, 180)}${sa.analysisText.length > 180 ? "..." : ""}
                </div>
                ${gapsList.length > 0 ? gapsList.map(g => `<div style="font-size:10px;color:#ef4444;margin-bottom:3px;">• ${g}</div>`).join("") : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>` : ""}

      <!-- Spacer -->
      <div style="flex:1;"></div>

      <!-- CTA -->
      <div style="background:linear-gradient(135deg,rgba(34,197,94,0.08),rgba(14,165,233,0.05));
        border:1px solid rgba(34,197,94,0.2);border-radius:14px;padding:20px 24px;
        display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:16px;font-weight:800;color:#f8fafc;margin-bottom:6px;">
            هل أنت مستعد للخطوة القادمة؟
          </div>
          <div style="font-size:12px;color:#475569;line-height:1.6;">
            يسعدنا تقديم عرض مخصص يتوافق مع أهداف نشاطكم التجاري وميزانيتكم
          </div>
        </div>
        <div style="text-align:center;flex-shrink:0;">
          <div style="font-size:18px;font-weight:900;color:#22c55e;text-shadow:0 0 12px rgba(34,197,94,0.5);">
            ${company?.phone || company?.email || "maksab-ksa.com"}
          </div>
          <div style="font-size:9px;color:#334155;margin-top:2px;letter-spacing:1px;">تواصل معنا الآن</div>
        </div>
      </div>

    </div>

    <!-- ══ FOOTER ══ -->
    <div style="background:#030810;border-top:1px solid rgba(34,197,94,0.07);padding:20px 40px;
      display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
      <!-- QR codes -->
      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;">
        <!-- QR موقع الشركة -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
          <img src="${qr(company?.website || "https://maksab-ksa.com")}"
            style="width:80px;height:80px;border-radius:8px;border:1px solid rgba(34,197,94,0.2);background:#0f172a;padding:3px;" alt="QR الموقع">
          <div style="font-size:8px;font-weight:700;color:#22c55e;letter-spacing:0.3px;">موقع ${coName}</div>
        </div>
        <!-- QR السجل التجاري -->
        ${lead.crNumber ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
          <img src="${qr("https://mc.gov.sa/ar/eservices/Pages/ServiceDetails.aspx?sID=" + lead.crNumber, "0ea5e9")}"
            style="width:80px;height:80px;border-radius:8px;border:1px solid rgba(14,165,233,0.2);background:#0f172a;padding:3px;" alt="QR السجل">
          <div style="font-size:8px;font-weight:700;color:#0ea5e9;">السجل التجاري</div>
          <div style="font-size:7px;color:#334155;font-family:monospace;">${lead.crNumber}</div>
        </div>` : ""}
        <!-- QR موقع العميل -->
        ${lead.website ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
          <img src="${qr(lead.website, "8b5cf6")}"
            style="width:80px;height:80px;border-radius:8px;border:1px solid rgba(139,92,246,0.2);background:#0f172a;padding:3px;" alt="QR موقع العميل">
          <div style="font-size:8px;font-weight:700;color:#8b5cf6;">موقع العميل</div>
        </div>` : ""}
        <!-- QR خرائط جوجل -->
        ${lead.googleMapsUrl ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:5px;">
          <img src="${qr(lead.googleMapsUrl, "eab308")}"
            style="width:80px;height:80px;border-radius:8px;border:1px solid rgba(234,179,8,0.2);background:#0f172a;padding:3px;" alt="QR خرائط">
          <div style="font-size:8px;font-weight:700;color:#eab308;">خرائط جوجل</div>
        </div>` : ""}
        <!-- Company info -->
        <div style="font-size:10px;color:#334155;line-height:1.8;padding-top:4px;">
          <div style="font-weight:700;color:#22c55e;font-size:11px;margin-bottom:3px;">${coName}</div>
          <div>${company?.website || "maksab-ksa.com"}</div>
          ${company?.email ? `<div>${company.email}</div>` : ""}
          ${company?.phone ? `<div>${company.phone}</div>` : ""}
          ${company?.address ? `<div style="margin-top:2px;">${company.address}</div>` : ""}
          ${company?.reportFooterText ? `<div style="margin-top:2px;color:#1e293b;">${company.reportFooterText}</div>` : ""}
        </div>
      </div>
      <!-- Date + confidential -->
      <div style="text-align:left;font-size:10px;color:#334155;line-height:1.8;">
        <div>تاريخ الإصدار: ${reportDate}</div>
        <div style="color:#22c55e22;font-size:9px;margin-top:2px;">حصري من ${coName} — جميع الحقوق محفوظة</div>
        <div style="font-size:8px;color:#1e293b;margin-top:3px;letter-spacing:1.5px;">CONFIDENTIAL</div>
      </div>
    </div>
  `, false);

  // ═══════════════════════════════════════════════════════════════════════
  //  ASSEMBLE HTML
  // ═══════════════════════════════════════════════════════════════════════
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير ${lead.companyName || "عميل"} — ${coName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Tajawal',sans-serif;direction:rtl;text-align:right;background:#060d1a;color:#e2e8f0;font-size:13px;line-height:1.65;}
    .print-bar{position:fixed;top:0;left:0;right:0;background:rgba(6,13,26,0.97);backdrop-filter:blur(10px);
      border-bottom:1px solid rgba(34,197,94,0.15);padding:9px 28px;display:flex;justify-content:space-between;
      align-items:center;z-index:9999;}
    .print-bar-title{font-size:13px;font-weight:700;color:#94a3b8;}
    .btn-print{background:linear-gradient(135deg,#22c55e,#16a34a);color:#000;border:none;padding:7px 20px;
      border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;cursor:pointer;
      box-shadow:0 0 14px rgba(34,197,94,0.35);}
    .btn-close{background:transparent;color:#475569;border:1px solid #1e293b;padding:7px 14px;
      border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;margin-right:6px;}
    .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:80px;
      font-weight:900;color:rgba(34,197,94,0.025);white-space:nowrap;pointer-events:none;z-index:9998;letter-spacing:8px;}
    .pw{margin-top:48px;}
    @media print{
      .print-bar{display:none!important;}
      .pw{margin-top:0!important;}
      body{background:#060d1a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .wm{color:rgba(34,197,94,0.04)!important;}
    }
  </style>
</head>
<body>
<div class="wm">حصري من ${coName}</div>
<div class="print-bar">
  <span class="print-bar-title">تقرير تحليل: ${lead.companyName || "—"} · ${coName}</span>
  <div>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
  </div>
</div>
<div class="pw">
  ${p1}
  ${p2}
  ${p3}
  ${p4}
</div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=960,height=840");
  if (!printWindow) throw new Error("تعذّر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة في المتصفح.");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1800);
  });
}
