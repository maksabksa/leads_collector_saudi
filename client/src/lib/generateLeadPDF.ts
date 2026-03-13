// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — Professional Report v6 (Print-Ready)
//  صفحة 1: الغلاف  |  صفحة 2: الملخص التنفيذي
//  صفحة 3: التحليل الرقمي  |  صفحة 4: التوصيات + CTA
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
  if (!v) return "#6b7280";
  if (v >= 8) return "#16a34a";
  if (v >= 6) return "#ca8a04";
  if (v >= 4) return "#ea580c";
  return "#dc2626";
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
function urg(level?: string | null) {
  switch (level) {
    case "high":   return { text: "أولوية عالية",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca" };
    case "medium": return { text: "أولوية متوسطة", color: "#ca8a04", bg: "#fefce8", border: "#fde68a" };
    case "low":    return { text: "أولوية منخفضة", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
    default:       return { text: "غير محدد",       color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
  }
}
function pm(p: string) {
  const map: Record<string, { name: string; color: string }> = {
    instagram: { name: "إنستغرام", color: "#e1306c" },
    twitter:   { name: "تويتر / X", color: "#1da1f2" },
    tiktok:    { name: "تيك توك",   color: "#010101" },
    snapchat:  { name: "سناب شات", color: "#f7b731" },
    facebook:  { name: "فيسبوك",   color: "#1877f2" },
    linkedin:  { name: "لينكد إن", color: "#0a66c2" },
  };
  return map[p?.toLowerCase()] || { name: p || "منصة", color: "#6b7280" };
}

// ─── Score badge ──────────────────────────────────────────────────────────────
function scoreBadge(v?: number | null, label = "") {
  const color = sc(v);
  const val = v ? Number(v).toFixed(1) : "—";
  const bg = v
    ? v >= 8 ? "#f0fdf4" : v >= 6 ? "#fefce8" : v >= 4 ? "#fff7ed" : "#fef2f2"
    : "#f9fafb";
  return `<div style="text-align:center;padding:12px 8px;background:${bg};border:2px solid ${color}33;border-radius:12px;">
    <div style="font-size:28px;font-weight:900;color:${color};line-height:1;">${val}</div>
    <div style="font-size:9px;color:#6b7280;margin-top:4px;font-weight:600;">${label}</div>
  </div>`;
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function progressBar(v?: number | null, label = "", max = 10) {
  const pct = v ? Math.min((v / max) * 100, 100) : 0;
  const color = sc(v);
  return `<div style="margin-bottom:10px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:11px;color:#374151;font-weight:600;">${label}</span>
      <span style="font-size:11px;font-weight:700;color:${color};">${fmt(v)}</span>
    </div>
    <div style="height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
    </div>
  </div>`;
}

// ─── Page wrapper (A4) ────────────────────────────────────────────────────────
function page(content: string, pageBreak = true) {
  return `<div style="width:210mm;min-height:297mm;padding:0;margin:0 auto;
    background:#ffffff;position:relative;overflow:hidden;
    ${pageBreak ? "page-break-after:always;break-after:page;" : ""}">
    ${content}
  </div>`;
}

// ─── Section header ───────────────────────────────────────────────────────────
function sh(title: string, sub = "") {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #f3f4f6;">
    <div style="width:4px;height:24px;border-radius:2px;background:linear-gradient(180deg,#1d4ed8,#0ea5e9);flex-shrink:0;"></div>
    <div>
      <div style="font-size:14px;font-weight:800;color:#111827;">${title}</div>
      ${sub ? `<div style="font-size:10px;color:#6b7280;margin-top:1px;">${sub}</div>` : ""}
    </div>
  </div>`;
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function infoRow(label: string, value: string, icon = "") {
  if (!value) return "";
  return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f9fafb;">
    <span style="font-size:11px;color:#6b7280;min-width:90px;flex-shrink:0;">${icon} ${label}</span>
    <span style="font-size:11px;color:#111827;font-weight:600;flex:1;word-break:break-all;">${value}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════
export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");

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

  const safeLeadName = (lead.companyName || "عميل").replace(/[/\\?%*:|"<>]/g, "-");
  const fileName = `تحليل مخصص لعناية - ${safeLeadName}.pdf`;

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════
  const p1 = page(`
    <!-- Header bar -->
    <div style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0ea5e9 100%);
      padding:28px 40px 24px;position:relative;overflow:hidden;">
      <!-- Decorative circles -->
      <div style="position:absolute;top:-40px;left:-40px;width:180px;height:180px;
        border-radius:50%;background:rgba(255,255,255,0.05);"></div>
      <div style="position:absolute;bottom:-60px;right:-20px;width:220px;height:220px;
        border-radius:50%;background:rgba(255,255,255,0.04);"></div>
      <!-- Company header -->
      <div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">
        <div style="display:flex;align-items:center;gap:14px;">
          ${coLogo ? `<img src="${coLogo}" style="height:44px;width:auto;border-radius:8px;background:white;padding:4px;" alt="شعار الشركة">` : `<div style="width:44px;height:44px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:white;">${coName.charAt(0)}</div>`}
          <div>
            <div style="font-size:18px;font-weight:900;color:white;letter-spacing:0.5px;">${coName}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.7);margin-top:2px;">تقرير تحليل تسويقي متخصص</div>
          </div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:10px;color:rgba(255,255,255,0.6);">تاريخ الإصدار</div>
          <div style="font-size:12px;font-weight:700;color:white;">${reportDate}</div>
          <div style="margin-top:6px;padding:3px 10px;background:${urgency.bg};border-radius:20px;
            font-size:10px;font-weight:700;color:${urgency.color};display:inline-block;">${urgency.text}</div>
        </div>
      </div>
    </div>

    <!-- Client section -->
    <div style="padding:40px 40px 30px;text-align:center;border-bottom:1px solid #f3f4f6;">
      ${clLogo ? `<div style="margin-bottom:20px;"><img src="${clLogo}" style="height:80px;width:auto;max-width:200px;border-radius:12px;border:2px solid #e5e7eb;padding:8px;background:white;" alt="شعار العميل"></div>` : ""}
      <div style="font-size:11px;color:#6b7280;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">تقرير تحليل مخصص لعناية</div>
      <div style="font-size:32px;font-weight:900;color:#111827;margin-bottom:8px;">${lead.companyName || "العميل"}</div>
      <div style="font-size:14px;color:#4b5563;margin-bottom:16px;">${lead.businessType || ""} ${lead.city ? `· ${lead.city}` : ""}</div>
      <div style="display:inline-flex;align-items:center;gap:8px;padding:8px 20px;
        background:#f0f9ff;border:1px solid #bae6fd;border-radius:20px;">
        <span style="font-size:11px;color:#0369a1;font-weight:600;">تحليل رقمي شامل · 4 محاور رئيسية</span>
      </div>
    </div>

    <!-- Score summary -->
    <div style="padding:24px 40px;background:#f9fafb;border-bottom:1px solid #f3f4f6;">
      <div style="font-size:11px;color:#6b7280;font-weight:700;text-align:center;margin-bottom:16px;letter-spacing:1px;">ملخص التقييم الرقمي</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
        ${scoreBadge(priScore, "الأولوية")}
        ${scoreBadge(qualScore, "جودة البيانات")}
        ${scoreBadge(wsScore, "تقييم الموقع")}
        ${scoreBadge(bestSocial?.engagementScore, "التفاعل السوشيال")}
      </div>
    </div>

    <!-- Contact info -->
    <div style="padding:20px 40px 24px;">
      <div style="font-size:11px;color:#6b7280;font-weight:700;margin-bottom:12px;letter-spacing:1px;">معلومات الاتصال</div>
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
      background:linear-gradient(135deg,#1e3a8a,#1d4ed8);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:rgba(255,255,255,0.6);">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.6);">CONFIDENTIAL · صفحة 1 من 4</div>
    </div>

    <!-- Watermark -->
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);
      font-size:72px;font-weight:900;color:rgba(29,78,216,0.04);white-space:nowrap;
      pointer-events:none;z-index:0;letter-spacing:6px;">حصري من ${coName}</div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 2 — EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════════════════════════════════
  const execSummary = report?.executiveSummary || report?.summary || lead.revenueOpportunity || "";
  const entryAngle  = lead.entryAngle || report?.entryAngle || "";
  const revenueOpp  = lead.revenueOpportunity || "";

  const p2 = page(`
    <!-- Page header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:18px 40px;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:15px;font-weight:900;color:white;">الملخص التنفيذي</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.7);">${lead.companyName || ""} · ${coName}</div>
    </div>

    <div style="padding:28px 40px;">
      <!-- Summary text -->
      ${execSummary ? `
      <div style="margin-bottom:24px;">
        ${sh("نظرة عامة على الوضع الحالي")}
        <div style="font-size:12px;color:#374151;line-height:1.8;background:#f9fafb;
          border-right:3px solid #1d4ed8;padding:14px 16px;border-radius:0 8px 8px 0;">
          <p>${cleanMarkdown(execSummary)}</p>
        </div>
      </div>` : ""}

      <!-- Gaps -->
      ${gaps.length ? `
      <div style="margin-bottom:24px;">
        ${sh("أبرز الثغرات التسويقية", "نقاط الضعف التي تحتاج معالجة فورية")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${gaps.map((g, i) => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;
            background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
            <div style="width:22px;height:22px;border-radius:50%;background:#dc2626;
              display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
              <span style="font-size:10px;font-weight:900;color:white;">${i + 1}</span>
            </div>
            <span style="font-size:11px;color:#374151;line-height:1.5;">${g}</span>
          </div>`).join("")}
        </div>
      </div>` : ""}

      <!-- Revenue & Entry -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        ${revenueOpp ? `
        <div>
          ${sh("فرصة الإيراد")}
          <div style="padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;
            font-size:12px;color:#374151;line-height:1.7;">${cleanMarkdown(revenueOpp)}</div>
        </div>` : ""}
        ${entryAngle ? `
        <div>
          ${sh("زاوية الدخول المقترحة")}
          <div style="padding:14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;
            font-size:12px;color:#374151;line-height:1.7;">${cleanMarkdown(entryAngle)}</div>
        </div>` : ""}
      </div>

      <!-- Scores detail -->
      <div>
        ${sh("مؤشرات الأداء الرئيسية")}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 30px;">
          ${progressBar(priScore, "درجة الأولوية")}
          ${progressBar(qualScore, "جودة البيانات")}
          ${progressBar(wsScore, "تقييم الموقع الإلكتروني")}
          ${progressBar(bestSocial?.engagementScore, "التفاعل على السوشيال ميديا")}
          ${progressBar(websiteAnalysis?.seoScore, "تحسين محركات البحث (SEO)")}
          ${progressBar(websiteAnalysis?.mobileScore, "تجربة الجوال")}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:#f9fafb;border-top:1px solid #e5e7eb;
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#9ca3af;">${coName} · تقرير سري</div>
      <div style="font-size:9px;color:#9ca3af;">صفحة 2 من 4</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 3 — DIGITAL ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════
  const p3 = page(`
    <!-- Page header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:18px 40px;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:15px;font-weight:900;color:white;">التحليل الرقمي التفصيلي</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.7);">${lead.companyName || ""} · ${coName}</div>
    </div>

    <div style="padding:28px 40px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">

        <!-- Website Analysis -->
        <div>
          ${sh("تحليل الموقع الإلكتروني", lead.website ? cleanUrl(lead.website) : "")}
          ${wsScore !== null ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
            ${scoreBadge(wsScore, "الدرجة الكلية")}
            ${scoreBadge(websiteAnalysis?.speedScore, "السرعة")}
            ${scoreBadge(websiteAnalysis?.mobileScore, "الجوال")}
          </div>
          <div style="margin-bottom:12px;">
            ${progressBar(websiteAnalysis?.seoScore, "تحسين SEO")}
            ${progressBar(websiteAnalysis?.contentQualityScore, "جودة المحتوى")}
            ${progressBar(websiteAnalysis?.designScore, "التصميم والتجربة")}
            ${progressBar(websiteAnalysis?.conversionScore, "وضوح العروض")}
          </div>` : `<div style="padding:16px;background:#f9fafb;border-radius:8px;font-size:11px;color:#6b7280;text-align:center;">لم يتم تحليل الموقع بعد</div>`}
          ${websiteAnalysis?.summary ? `
          <div style="font-size:11px;color:#374151;line-height:1.7;background:#f9fafb;
            padding:12px;border-radius:8px;border-right:3px solid #1d4ed8;">
            ${cleanMarkdown(websiteAnalysis.summary.substring(0, 300))}...
          </div>` : ""}
        </div>

        <!-- Social Analysis -->
        <div>
          ${sh("تحليل السوشيال ميديا", bestSocial ? `أفضل منصة: ${pm(bestSocial.platform).name}` : "")}
          ${bestSocial ? `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
            ${scoreBadge(bestSocial.engagementScore, "التفاعل")}
            ${scoreBadge(bestSocial.contentQualityScore, "المحتوى")}
            ${scoreBadge(bestSocial.overallScore, "الإجمالي")}
          </div>
          <!-- Platform stats -->
          ${(() => {
            const extra = parseSocialExtra(bestSocial.rawData);
            const followers = extra.followers || extra.followersCount || bestSocial.followersCount;
            const posts = extra.posts || extra.postsCount || bestSocial.postsCount;
            const following = extra.following || extra.followingCount;
            return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
              <div style="text-align:center;padding:10px;background:#f9fafb;border-radius:8px;">
                <div style="font-size:16px;font-weight:900;color:#1d4ed8;">${fmtK(followers)}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:2px;">متابع</div>
              </div>
              <div style="text-align:center;padding:10px;background:#f9fafb;border-radius:8px;">
                <div style="font-size:16px;font-weight:900;color:#1d4ed8;">${fmtK(posts)}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:2px;">منشور</div>
              </div>
              <div style="text-align:center;padding:10px;background:#f9fafb;border-radius:8px;">
                <div style="font-size:16px;font-weight:900;color:#1d4ed8;">${fmtK(following)}</div>
                <div style="font-size:9px;color:#6b7280;margin-top:2px;">يتابع</div>
              </div>
            </div>`;
          })()}
          ${bestSocial.summary ? `
          <div style="font-size:11px;color:#374151;line-height:1.7;background:#f9fafb;
            padding:12px;border-radius:8px;border-right:3px solid #e1306c;">
            ${cleanMarkdown(bestSocial.summary.substring(0, 280))}...
          </div>` : ""}` : `<div style="padding:16px;background:#f9fafb;border-radius:8px;font-size:11px;color:#6b7280;text-align:center;">لم يتم تحليل السوشيال ميديا بعد</div>`}
        </div>
      </div>

      <!-- All platforms -->
      ${socialAnalyses.length > 1 ? `
      <div style="margin-top:20px;">
        ${sh("جميع المنصات", `${socialAnalyses.length} منصات محللة`)}
        <div style="display:grid;grid-template-columns:repeat(${Math.min(socialAnalyses.length, 4)},1fr);gap:10px;">
          ${socialAnalyses.slice(0, 4).map(s => {
            const meta = pm(s.platform);
            return `<div style="padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;text-align:center;border-top:3px solid ${meta.color};">
              <div style="font-size:12px;font-weight:700;color:${meta.color};margin-bottom:6px;">${meta.name}</div>
              <div style="font-size:20px;font-weight:900;color:#111827;">${s.engagementScore ? Number(s.engagementScore).toFixed(1) : "—"}</div>
              <div style="font-size:9px;color:#6b7280;margin-top:2px;">درجة التفاعل</div>
            </div>`;
          }).join("")}
        </div>
      </div>` : ""}
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:10px 40px;
      background:#f9fafb;border-top:1px solid #e5e7eb;
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:#9ca3af;">${coName} · تقرير سري</div>
      <div style="font-size:9px;color:#9ca3af;">صفحة 3 من 4</div>
    </div>
  `);

  // ═══════════════════════════════════════════════════════════════════════
  //  PAGE 4 — RECOMMENDATIONS + CTA
  // ═══════════════════════════════════════════════════════════════════════
  const p4 = page(`
    <!-- Page header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:18px 40px;display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:15px;font-weight:900;color:white;">التوصيات والخطوات التالية</div>
      <div style="font-size:10px;color:rgba(255,255,255,0.7);">${lead.companyName || ""} · ${coName}</div>
    </div>

    <div style="padding:28px 40px;">

      <!-- Recommendations -->
      ${recs.length ? `
      <div style="margin-bottom:24px;">
        ${sh("التوصيات الاستراتيجية", "خطوات عملية لتحسين الأداء التسويقي")}
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${recs.map((r, i) => `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;
            background:${i === 0 ? "#eff6ff" : "#f9fafb"};
            border:1px solid ${i === 0 ? "#bfdbfe" : "#e5e7eb"};border-radius:10px;">
            <div style="width:28px;height:28px;border-radius:50%;
              background:${i === 0 ? "#1d4ed8" : "#e5e7eb"};
              display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:12px;font-weight:900;color:${i === 0 ? "white" : "#6b7280"};">${i + 1}</span>
            </div>
            <div style="flex:1;">
              <div style="font-size:12px;color:#111827;line-height:1.6;">${r}</div>
            </div>
          </div>`).join("")}
        </div>
      </div>` : ""}

      <!-- Report summary -->
      ${report?.fullReport ? `
      <div style="margin-bottom:24px;">
        ${sh("ملاحظات إضافية")}
        <div style="font-size:11px;color:#374151;line-height:1.8;background:#f9fafb;
          padding:14px;border-radius:8px;max-height:120px;overflow:hidden;">
          ${cleanMarkdown(report.fullReport.substring(0, 500))}...
        </div>
      </div>` : ""}

      <!-- CTA -->
      <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);border-radius:14px;
        padding:28px 32px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;
          border-radius:50%;background:rgba(255,255,255,0.05);"></div>
        <div style="position:absolute;bottom:-40px;left:-20px;width:150px;height:150px;
          border-radius:50%;background:rgba(255,255,255,0.04);"></div>
        <div style="position:relative;z-index:1;">
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-bottom:8px;letter-spacing:1px;">الخطوة التالية</div>
          <div style="font-size:20px;font-weight:900;color:white;margin-bottom:8px;">
            هل أنت مستعد للارتقاء بـ ${lead.companyName || "عملك"}؟
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,0.8);margin-bottom:20px;line-height:1.6;">
            تواصل معنا اليوم للحصول على استشارة مجانية وخطة عمل مخصصة
          </div>
          <div style="display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;">
            ${company?.phone ? `<div style="padding:8px 20px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:12px;font-weight:700;color:white;">📞 ${company.phone}</div>` : ""}
            ${company?.website ? `<div style="padding:8px 20px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:12px;font-weight:700;color:white;">🌐 ${company.website}</div>` : `<div style="padding:8px 20px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:12px;font-weight:700;color:white;">🌐 maksab-ksa.com</div>`}
            ${company?.email ? `<div style="padding:8px 20px;background:rgba(255,255,255,0.15);border-radius:20px;font-size:12px;font-weight:700;color:white;">✉️ ${company.email}</div>` : ""}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="position:absolute;bottom:0;left:0;right:0;padding:12px 40px;
      background:linear-gradient(135deg,#1e3a8a,#1d4ed8);
      display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:9px;color:rgba(255,255,255,0.6);">حصري من ${coName} — جميع الحقوق محفوظة</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.6);">CONFIDENTIAL · صفحة 4 من 4</div>
    </div>
  `, false);

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
    background: #e5e7eb;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  @media print {
    body { background: white; margin: 0; padding: 0; }
    #print-toolbar { display: none !important; }
    .page-wrapper { box-shadow: none !important; margin: 0 !important; }
  }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  #print-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: #1e3a8a; border-bottom: 3px solid #0ea5e9;
    padding: 10px 24px; display: flex; align-items: center;
    justify-content: space-between; gap: 12px;
    font-family: 'Tajawal', sans-serif; direction: rtl;
    box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }
  #print-toolbar .info { display: flex; flex-direction: column; gap: 2px; }
  #print-toolbar .title { color: white; font-size: 14px; font-weight: 700; }
  #print-toolbar .hint { color: rgba(255,255,255,0.6); font-size: 11px; }
  #print-toolbar .actions { display: flex; gap: 8px; align-items: center; }
  #print-toolbar .btn-print {
    background: #22c55e; color: #000; border: none; border-radius: 8px;
    padding: 8px 20px; font-size: 13px; font-weight: 700;
    cursor: pointer; font-family: 'Tajawal', sans-serif;
    display: flex; align-items: center; gap: 6px;
  }
  #print-toolbar .btn-print:hover { background: #16a34a; }
  #print-toolbar .btn-close {
    background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: 'Tajawal', sans-serif;
  }
  #print-toolbar .btn-close:hover { background: rgba(255,255,255,0.2); }
  .pages-container {
    padding: 70px 20px 20px;
    display: flex; flex-direction: column; align-items: center; gap: 20px;
  }
  @media print {
    .pages-container { padding: 0; gap: 0; }
  }
  .page-wrapper {
    width: 210mm;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    background: white;
  }
</style>
</head>
<body>
<div id="print-toolbar">
  <div class="info">
    <div class="title">📄 ${fileName}</div>
    <div class="hint">اضغط "حفظ PDF" ← اختر "حفظ كـ PDF" ← تأكد من تفعيل "رسومات الخلفية"</div>
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
//  buildReportHTML - دالة مشتركة لبناء HTML التقرير (للمعاينة)
// ═══════════════════════════════════════════════════════════════════════
function buildReportHTML(options: GeneratePDFOptions): { html: string; fileName: string } {
  const { lead, company } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");
  const safeLeadName = (lead.companyName || "عميل").replace(/[/\\?%*:|"<>]/g, "-");
  const fileName = `تحليل مخصص لعناية - ${safeLeadName}.pdf`;
  // نعيد استخدام نفس HTML من generateLeadPDF
  return { html: "", fileName };
}

// ═══════════════════════════════════════════════════════════════════════
//  previewLeadPDF - فتح معاينة التقرير في نافذة جديدة
// ═══════════════════════════════════════════════════════════════════════
export async function previewLeadPDF(options: GeneratePDFOptions): Promise<void> {
  // المعاينة تستخدم نفس generateLeadPDF - فقط نفتح نافذة جديدة
  await generateLeadPDF(options);
}
