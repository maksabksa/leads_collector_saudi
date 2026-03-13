// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — Premium Dark Report with Glow Effects
//  Arabic RTL · Tajawal Font · window.print() → PDF
// ═══════════════════════════════════════════════════════════════════════

interface GeneratePDFOptions {
  lead?: any;
  websiteAnalysis?: any;
  socialAnalyses?: any[];
  report?: any;
  company?: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(v: number | null | undefined) {
  if (!v) return "#64748b";
  if (v >= 8) return "#22c55e";
  if (v >= 6) return "#eab308";
  if (v >= 4) return "#f97316";
  return "#ef4444";
}
function scoreGlow(v: number | null | undefined) {
  if (!v) return "none";
  if (v >= 8) return "0 0 16px rgba(34,197,94,0.6), 0 0 32px rgba(34,197,94,0.3)";
  if (v >= 6) return "0 0 16px rgba(234,179,8,0.6), 0 0 32px rgba(234,179,8,0.3)";
  if (v >= 4) return "0 0 16px rgba(249,115,22,0.6), 0 0 32px rgba(249,115,22,0.3)";
  return "0 0 16px rgba(239,68,68,0.6), 0 0 32px rgba(239,68,68,0.3)";
}
function fmt(v: number | null | undefined) {
  if (!v) return "—";
  return Number(v).toFixed(1);
}
function fmtInt(v: number | null | undefined) {
  if (!v && v !== 0) return "—";
  if (v === 0) return "—";
  return Number(v).toLocaleString("ar-SA");
}

function cleanUrl(url: string | null | undefined, platform: string): string {
  if (!url) return "—";
  try {
    // Remove protocol and www
    let clean = url.replace(/https?:\/\/(www\.)?/, "");
    // Extract handle/username based on platform
    if (platform === "instagram") {
      const m = clean.match(/instagram\.com\/([^/?&]+)/);
      return m ? `@${m[1]}` : clean.split("/")[1] || clean;
    }
    if (platform === "twitter" || platform === "x") {
      const m = clean.match(/(?:twitter|x)\.com\/([^/?&]+)/);
      return m ? `@${m[1]}` : clean.split("/")[1] || clean;
    }
    if (platform === "tiktok") {
      const m = clean.match(/tiktok\.com\/@?([^/?&]+)/);
      return m ? `@${m[1]}` : clean.split("/").pop() || clean;
    }
    if (platform === "snapchat") {
      const m = clean.match(/snapchat\.com\/add\/([^/?&]+)/);
      return m ? `@${m[1]}` : clean.split("/").pop() || clean;
    }
    // Generic: return just the path after domain
    const parts = clean.split("/");
    return parts.length > 1 ? parts.slice(1).join("/") : clean;
  } catch {
    return url;
  }
}

function cleanPhone(v: string | number | null | undefined): string {
  if (!v) return "";
  const s = String(v).trim();
  if (s === "0" || s === "") return "";
  return s;
}

function parseSocialRaw(raw: string | null | undefined): Record<string, any> | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null) return obj;
  } catch {}
  return null;
}

function platformMeta(p: string): { name: string; color: string; glow: string; svg: string } {
  const map: Record<string, { name: string; color: string; glow: string; svg: string }> = {
    instagram: {
      name: "إنستغرام",
      color: "#e1306c",
      glow: "0 0 20px rgba(225,48,108,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    },
    twitter: {
      name: "تويتر / X",
      color: "#1da1f2",
      glow: "0 0 20px rgba(29,161,242,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#1da1f2"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    },
    tiktok: {
      name: "تيك توك",
      color: "#69c9d0",
      glow: "0 0 20px rgba(105,201,208,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#69c9d0"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>`,
    },
    snapchat: {
      name: "سناب شات",
      color: "#fffc00",
      glow: "0 0 20px rgba(255,252,0,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#fffc00"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>`,
    },
    facebook: {
      name: "فيسبوك",
      color: "#1877f2",
      glow: "0 0 20px rgba(24,119,242,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    },
    linkedin: {
      name: "لينكد إن",
      color: "#0a66c2",
      glow: "0 0 20px rgba(10,102,194,0.5)",
      svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    },
  };
  return map[p?.toLowerCase()] || { name: p || "منصة", color: "#64748b", glow: "none", svg: `<span style="font-size:18px">📱</span>` };
}

function urgencyMeta(level: string | null | undefined) {
  switch (level) {
    case "high": return { text: "أولوية عالية 🔴", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", glow: "0 0 12px rgba(239,68,68,0.4)" };
    case "medium": return { text: "أولوية متوسطة 🟡", color: "#eab308", bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.4)", glow: "0 0 12px rgba(234,179,8,0.4)" };
    case "low": return { text: "أولوية منخفضة 🟢", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", glow: "0 0 12px rgba(34,197,94,0.4)" };
    default: return { text: "غير محدد", color: "#64748b", bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", glow: "none" };
  }
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
}

// ─── Score Circle ─────────────────────────────────────────────────────────────
function scoreCircleHTML(val: number | null | undefined, label: string) {
  const color = scoreColor(val);
  const glow = scoreGlow(val);
  const display = val ? val.toFixed(0) : "—";
  return `
    <div style="text-align:center;">
      <div style="
        width:70px; height:70px; border-radius:50%;
        border: 3px solid ${color};
        box-shadow: ${glow};
        display:flex; align-items:center; justify-content:center;
        font-size:22px; font-weight:900; color:${color};
        background: rgba(15,23,42,0.8);
        margin: 0 auto 8px;
        position:relative;
      ">
        <div style="
          position:absolute; inset:-6px; border-radius:50%;
          background: radial-gradient(circle, ${color}15 0%, transparent 70%);
        "></div>
        ${display}
      </div>
      <div style="font-size:11px; color:#64748b; font-weight:600;">${label}</div>
    </div>
  `;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function progressBar(val: number | null | undefined, label: string, max = 10) {
  const pct = val ? Math.min((val / max) * 100, 100) : 0;
  const color = scoreColor(val);
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
        <span style="font-size:12px; color:#94a3b8;">${label}</span>
        <span style="font-size:12px; font-weight:700; color:${color};">${fmt(val)}</span>
      </div>
      <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:3px; overflow:hidden;">
        <div style="
          height:100%; width:${pct}%;
          background: linear-gradient(90deg, ${color}, ${color}aa);
          border-radius:3px;
          box-shadow: 0 0 8px ${color}88;
          transition: width 0.3s;
        "></div>
      </div>
    </div>
  `;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");

  const accentGreen = "#22c55e";
  const accentBlue = "#0ea5e9";
  const accentPurple = "#8b5cf6";
  const companyName = company?.companyName || "مكسب";
  const companyLogo = company?.logoUrl || "";
  const reportDate = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const urgency = urgencyMeta(lead.urgencyLevel);
  const priorityScore = lead.leadPriorityScore ? Number(lead.leadPriorityScore) : null;
  const qualityScore = lead.dataQualityScore ? Number(lead.dataQualityScore) : null;
  const seasonScore = lead.seasonalityScore ? Number(lead.seasonalityScore) : null;

  // ── Phones ──
  const phones: string[] = [];
  const vp = cleanPhone(lead.verifiedPhone);
  const lp = cleanPhone(lead.phone);
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

  // ── Social analyses - parse rawAnalysis JSON if needed ──
  const parsedSocials = socialAnalyses.map((sa: any) => {
    let extra: Record<string, any> = {};
    if (sa.rawAnalysis && typeof sa.rawAnalysis === "string") {
      const parsed = parseSocialRaw(sa.rawAnalysis);
      if (parsed) extra = parsed;
    }
    return {
      ...sa,
      followersCount: sa.followersCount || extra.followersCount || extra.followers_count || null,
      postsCount: sa.postsCount || extra.postsCount || extra.posts_count || null,
      engagementRate: sa.engagementRate || extra.engagementRate || extra.engagement_rate || null,
      avgLikes: sa.avgLikes || extra.avgLikes || extra.avg_likes || null,
      avgViews: sa.avgViews || extra.avgViews || extra.avg_views || null,
      analysisText: sa.analysisText || sa.summary || extra.summary || null,
      overallScore: sa.overallScore || extra.overallScore || null,
      postingFrequencyScore: sa.postingFrequencyScore || extra.postingFrequencyScore || null,
      engagementScore: sa.engagementScore || extra.engagementScore || null,
      contentQualityScore: sa.contentQualityScore || extra.contentQualityScore || null,
      digitalPresenceScore: sa.digitalPresenceScore || extra.digitalPresenceScore || null,
      gaps: sa.gaps || extra.gaps || [],
      hasAccount: sa.hasAccount ?? extra.hasAccount ?? true,
    };
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  HTML TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير ${lead.companyName || "عميل"}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{
      font-family:'Tajawal',sans-serif;
      direction:rtl; text-align:right;
      background:#060d1a;
      color:#e2e8f0;
      font-size:13px; line-height:1.7;
    }
    /* Print bar */
    .print-bar{
      position:fixed;top:0;left:0;right:0;
      background:rgba(6,13,26,0.95);
      backdrop-filter:blur(12px);
      border-bottom:1px solid rgba(34,197,94,0.2);
      padding:10px 28px;
      display:flex;justify-content:space-between;align-items:center;
      z-index:9999;
    }
    .print-bar-title{font-size:14px;font-weight:700;color:#e2e8f0;}
    .btn-print{
      background:linear-gradient(135deg,#22c55e,#16a34a);
      color:#000; border:none; padding:8px 22px; border-radius:8px;
      font-family:'Tajawal',sans-serif; font-size:13px; font-weight:700; cursor:pointer;
      box-shadow:0 0 16px rgba(34,197,94,0.4);
    }
    .btn-close{
      background:transparent; color:#64748b;
      border:1px solid #1e293b; padding:8px 16px; border-radius:8px;
      font-family:'Tajawal',sans-serif; font-size:13px; cursor:pointer;
      margin-right:8px;
    }
    /* Watermark */
    .wm{
      position:fixed;top:50%;left:50%;
      transform:translate(-50%,-50%) rotate(-35deg);
      font-size:80px;font-weight:900;
      color:rgba(34,197,94,0.03);
      white-space:nowrap;pointer-events:none;z-index:9998;
      letter-spacing:10px;
    }
    .wm2{
      position:fixed;top:0;left:0;right:0;bottom:0;
      pointer-events:none;z-index:9997;overflow:hidden;
    }
    .wm2::before,.wm2::after{
      content:'حصري من شركة مكسب  ✦  حصري من شركة مكسب  ✦  حصري من شركة مكسب';
      position:absolute;
      font-family:'Tajawal',sans-serif;font-size:16px;font-weight:700;
      color:rgba(34,197,94,0.025);
      white-space:nowrap;letter-spacing:6px;
      transform:rotate(-35deg);
    }
    .wm2::before{top:18%;left:-25%;}
    .wm2::after{top:65%;left:-15%;}
    /* Page wrapper */
    .pw{margin-top:52px;max-width:920px;margin-left:auto;margin-right:auto;padding-bottom:60px;}
    /* ── Cover / Hero ── */
    .cover{
      background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 40%,#0a1628 100%);
      border-bottom:1px solid rgba(34,197,94,0.15);
      padding:36px 40px 28px;
      position:relative;overflow:hidden;
    }
    .cover::before{
      content:'';position:absolute;top:-80px;right:-80px;
      width:300px;height:300px;border-radius:50%;
      background:radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 70%);
    }
    .cover::after{
      content:'';position:absolute;bottom:-60px;left:-60px;
      width:200px;height:200px;border-radius:50%;
      background:radial-gradient(circle,rgba(14,165,233,0.06) 0%,transparent 70%);
    }
    .cover-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;}
    .co-brand{display:flex;align-items:center;gap:14px;}
    .co-logo{width:54px;height:54px;border-radius:12px;object-fit:contain;background:#0f172a;padding:4px;border:1px solid rgba(34,197,94,0.2);}
    .co-logo-ph{
      width:54px;height:54px;border-radius:12px;
      background:linear-gradient(135deg,#1e293b,#0f172a);
      border:1px solid rgba(34,197,94,0.25);
      display:flex;align-items:center;justify-content:center;
      font-size:22px;font-weight:900;color:#22c55e;
    }
    .co-name{font-size:20px;font-weight:800;color:#f8fafc;}
    .co-sub{font-size:11px;color:#64748b;margin-top:2px;}
    .cover-meta{text-align:left;}
    .cover-date{font-size:12px;color:#64748b;}
    .cover-id{font-size:11px;color:#334155;margin-top:3px;}
    /* Client name */
    .client-name{
      font-size:34px;font-weight:900;
      background:linear-gradient(135deg,#f8fafc,#94a3b8);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      margin-bottom:8px;
    }
    .client-meta{font-size:13px;color:#64748b;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .meta-dot{width:5px;height:5px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0;}
    /* Scores row */
    .scores-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:4px;}
    .urgency-pill{
      padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;
      background:${urgency.bg};color:${urgency.color};
      border:1px solid ${urgency.border};
      box-shadow:${urgency.glow};
    }
    /* Accent bar */
    .accent-bar{height:3px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#8b5cf6,#22c55e);background-size:200%;animation:none;}
    /* Contact strip */
    .contact-strip{
      background:#0a1628;
      border-bottom:1px solid rgba(255,255,255,0.05);
      padding:16px 40px;
      display:flex;flex-wrap:wrap;gap:20px;
    }
    .ci{display:flex;align-items:center;gap:10px;}
    .ci-icon{
      width:34px;height:34px;border-radius:8px;
      background:#0f172a;border:1px solid #1e293b;
      display:flex;align-items:center;justify-content:center;font-size:14px;
    }
    .ci-lbl{font-size:10px;color:#475569;}
    .ci-val{font-size:12px;font-weight:600;color:#e2e8f0;}
    /* Content */
    .content{padding:28px 40px;}
    /* Section header */
    .sh{
      font-size:16px;font-weight:800;color:#f8fafc;
      margin:28px 0 16px;
      padding-bottom:10px;
      border-bottom:1px solid rgba(255,255,255,0.06);
      display:flex;align-items:center;gap:10px;
    }
    .sh-dot{
      width:4px;height:20px;border-radius:2px;
      background:linear-gradient(180deg,#22c55e,#0ea5e9);
      box-shadow:0 0 8px rgba(34,197,94,0.5);
      flex-shrink:0;
    }
    /* Dark card */
    .dc{
      background:linear-gradient(135deg,#0d1f3c,#0a1628);
      border:1px solid rgba(255,255,255,0.06);
      border-radius:12px;padding:20px 22px;margin-bottom:14px;
      position:relative;overflow:hidden;
    }
    .dc::before{
      content:'';position:absolute;top:0;right:0;
      width:60px;height:60px;
      background:radial-gradient(circle,rgba(34,197,94,0.05) 0%,transparent 70%);
    }
    .dc-title{font-size:13px;font-weight:700;color:#64748b;margin-bottom:12px;display:flex;align-items:center;gap:6px;}
    .dc-title.accent{color:#f97316;}
    .dc-title.green{color:#22c55e;}
    /* Contact message */
    .msg-box{
      font-size:13px;color:#cbd5e1;line-height:2;
      background:rgba(249,115,22,0.06);
      border:1px solid rgba(249,115,22,0.2);
      border-radius:8px;padding:16px 18px;
      border-right:3px solid #f97316;
    }
    /* Gaps */
    .gap-list{list-style:none;}
    .gap-item{
      display:flex;align-items:flex-start;gap:10px;
      font-size:12px;color:#94a3b8;line-height:1.8;
      padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);
    }
    .gap-item:last-child{border-bottom:none;}
    .gap-dot{color:#ef4444;font-size:18px;line-height:1;margin-top:1px;flex-shrink:0;text-shadow:0 0 8px rgba(239,68,68,0.6);}
    /* Phones */
    .phones-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}
    .phone-tag{
      background:rgba(34,197,94,0.08);
      border:1px solid rgba(34,197,94,0.25);
      border-radius:8px;padding:6px 14px;
      font-size:13px;font-weight:700;color:#22c55e;
      font-family:'Tajawal',sans-serif;direction:ltr;
      box-shadow:0 0 8px rgba(34,197,94,0.15);
    }
    /* Social grid */
    .social-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
    .sc{
      background:linear-gradient(135deg,#0d1f3c,#0a1628);
      border:1px solid rgba(255,255,255,0.06);
      border-radius:12px;padding:18px 20px;
      position:relative;overflow:hidden;
    }
    .sc-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
    .sc-platform{font-size:14px;font-weight:700;color:#e2e8f0;flex:1;}
    .sc-followers{
      font-size:11px;font-weight:700;color:#000;
      background:#22c55e;padding:3px 10px;border-radius:20px;
      box-shadow:0 0 8px rgba(34,197,94,0.4);
    }
    .sc-stat{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;}
    .sc-stat-lbl{color:#475569;}
    .sc-stat-val{font-weight:700;color:#e2e8f0;}
    .sc-analysis{font-size:11px;color:#64748b;line-height:1.7;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);}
    .sc-score{
      position:absolute;top:16px;left:16px;
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:13px;font-weight:900;
    }
    /* Website scores */
    .ws-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px;}
    .ws-box{
      background:#0a1628;border:1px solid rgba(255,255,255,0.06);
      border-radius:10px;padding:14px 6px;text-align:center;
    }
    .ws-val{font-size:22px;font-weight:900;margin-bottom:4px;}
    .ws-lbl{font-size:10px;color:#475569;font-weight:500;}
    /* Analysis text */
    .at{font-size:12px;color:#64748b;line-height:1.9;}
    .at strong{color:#22c55e;font-weight:700;}
    .at code{background:#0f172a;padding:1px 4px;border-radius:3px;color:#e2e8f0;}
    /* Full report */
    .fr{font-size:12px;color:#64748b;line-height:1.9;}
    .fr p{margin-bottom:10px;}
    .fr strong{color:#22c55e;font-weight:700;}
    /* Footer */
    .footer{
      background:#0a1628;
      border-top:1px solid rgba(34,197,94,0.1);
      padding:20px 40px;
      display:flex;justify-content:space-between;align-items:center;
      font-size:11px;color:#334155;margin-top:16px;
    }
    .footer-brand{font-weight:700;color:#475569;font-size:13px;}
    /* Divider */
    .divider{height:1px;background:linear-gradient(90deg,transparent,rgba(34,197,94,0.2),transparent);margin:20px 0;}
    /* Stat highlight */
    .stat-hl{
      display:inline-flex;align-items:center;gap:6px;
      background:rgba(34,197,94,0.08);
      border:1px solid rgba(34,197,94,0.2);
      border-radius:8px;padding:8px 14px;margin:4px;
    }
    .stat-hl-val{font-size:18px;font-weight:900;color:#22c55e;text-shadow:0 0 12px rgba(34,197,94,0.5);}
    .stat-hl-lbl{font-size:11px;color:#64748b;}
    @media print{
      .print-bar{display:none!important;}
      .pw{margin-top:0!important;}
      body{background:#060d1a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .dc{break-inside:avoid;}
      .sh{break-after:avoid;}
      .social-grid{break-inside:avoid;}
      .wm{color:rgba(34,197,94,0.05)!important;}
      .wm2::before,.wm2::after{color:rgba(34,197,94,0.04)!important;}
    }
  </style>
</head>
<body>
<div class="wm2"></div>
<div class="wm">حصري من شركة مكسب</div>

<!-- Print bar -->
<div class="print-bar">
  <span class="print-bar-title">📊 تقرير تحليل: ${lead.companyName || "—"}</span>
  <div>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
  </div>
</div>

<div class="pw">

  <!-- ══ COVER ══ -->
  <div class="cover">
    <div class="cover-top">
      <div class="co-brand">
        ${companyLogo
          ? `<img src="${companyLogo}" class="co-logo" alt="${companyName}">`
          : `<div class="co-logo-ph">${companyName.charAt(0)}</div>`
        }
        <div>
          <div class="co-name">${companyName}</div>
          ${company?.reportHeaderText ? `<div class="co-sub">${company.reportHeaderText}</div>` : `<div class="co-sub">تقرير تحليل العميل</div>`}
        </div>
      </div>
      <div class="cover-meta">
        <div class="cover-date">📅 ${reportDate}</div>
        <div class="cover-id">رقم التقرير #${lead.id || "—"}</div>
        ${company?.licenseNumber ? `<div class="cover-id">رقم الترخيص: ${company.licenseNumber}</div>` : ""}
      </div>
    </div>

    <div class="client-name">${lead.companyName || "—"}</div>
    <div class="client-meta">
      <span class="meta-dot"></span>
      ${lead.businessType || ""}
      ${lead.city ? `<span class="meta-dot"></span><span>${lead.city}</span>` : ""}
      ${lead.country ? `<span class="meta-dot"></span><span>${lead.country}</span>` : ""}
    </div>

    <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;">
      <div class="scores-row">
        ${priorityScore ? scoreCircleHTML(priorityScore, "الأولوية") : ""}
        ${qualityScore ? scoreCircleHTML(qualityScore, "الجودة") : ""}
        ${seasonScore ? scoreCircleHTML(seasonScore, "الموسمية") : ""}
        <div class="urgency-pill">${urgency.text}</div>
      </div>
      ${lead.rating ? `
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#eab308;text-shadow:0 0 16px rgba(234,179,8,0.5);">⭐ ${lead.rating}</div>
          <div style="font-size:11px;color:#64748b;">${lead.reviewCount ? `${fmtInt(lead.reviewCount)} تقييم` : "تقييم جوجل"}</div>
        </div>
      ` : ""}
    </div>
  </div>

  <!-- Accent bar -->
  <div class="accent-bar"></div>

  <!-- ══ CONTACT STRIP ══ -->
  ${(lead.verifiedPhone || lead.phone || lead.email || lead.website || lead.instagramUrl || lead.twitterUrl || lead.tiktokUrl) ? `
  <div class="contact-strip">
    ${phones.length > 0 ? `<div class="ci"><div class="ci-icon">📞</div><div><div class="ci-lbl">الهاتف</div><div class="ci-val">${phones[0]}</div></div></div>` : ""}
    ${lead.email ? `<div class="ci"><div class="ci-icon">📧</div><div><div class="ci-lbl">البريد</div><div class="ci-val">${lead.email}</div></div></div>` : ""}
    ${lead.website ? `<div class="ci"><div class="ci-icon">🌐</div><div><div class="ci-lbl">الموقع</div><div class="ci-val">${lead.website}</div></div></div>` : ""}
    ${lead.instagramUrl ? `<div class="ci"><div class="ci-icon" style="background:rgba(225,48,108,0.1);border-color:rgba(225,48,108,0.2);">📸</div><div><div class="ci-lbl">إنستغرام</div><div class="ci-val">${cleanUrl(lead.instagramUrl, "instagram")}</div></div></div>` : ""}
    ${lead.twitterUrl ? `<div class="ci"><div class="ci-icon" style="background:rgba(29,161,242,0.1);border-color:rgba(29,161,242,0.2);">🐦</div><div><div class="ci-lbl">تويتر</div><div class="ci-val">${cleanUrl(lead.twitterUrl, "twitter")}</div></div></div>` : ""}
    ${lead.tiktokUrl ? `<div class="ci"><div class="ci-icon" style="background:rgba(105,201,208,0.1);border-color:rgba(105,201,208,0.2);">🎵</div><div><div class="ci-lbl">تيك توك</div><div class="ci-val">${cleanUrl(lead.tiktokUrl, "tiktok")}</div></div></div>` : ""}
  </div>` : ""}

  <!-- ══ CONTENT ══ -->
  <div class="content">

    ${company?.reportIntroText ? `<div class="dc"><div class="at">${company.reportIntroText}</div></div>` : ""}

    <!-- نص التواصل المقترح -->
    ${(lead.salesEntryAngle || lead.suggestedSalesEntryAngle) ? `
    <div class="sh"><div class="sh-dot"></div>نص التواصل المقترح</div>
    <div class="dc">
      <div class="msg-box">${lead.salesEntryAngle || lead.suggestedSalesEntryAngle}</div>
    </div>` : ""}

    <!-- الثغرات الحرجة -->
    ${gaps.length > 0 ? `
    <div class="sh"><div class="sh-dot"></div>الثغرات الحرجة</div>
    <div class="dc">
      <ul class="gap-list">
        ${gaps.map(g => `<li class="gap-item"><span class="gap-dot">•</span><span>${g}</span></li>`).join("")}
      </ul>
    </div>` : ""}

    <!-- أرقام الهاتف -->
    ${phones.length > 0 ? `
    <div class="sh"><div class="sh-dot"></div>أرقام هاتف مكتشفة</div>
    <div class="dc">
      <div class="phones-wrap">
        ${phones.map(p => `<span class="phone-tag">${p}</span>`).join("")}
      </div>
    </div>` : ""}

    <!-- كسر الجمود -->
    ${lead.iceBreaker ? `
    <div class="sh"><div class="sh-dot"></div>💬 كسر الجمود</div>
    <div class="dc">
      <div class="at">${lead.iceBreaker}</div>
    </div>` : ""}

    <!-- فرصة الإيراد -->
    ${lead.revenueOpportunity ? `
    <div class="sh"><div class="sh-dot"></div>💰 فرصة الإيراد</div>
    <div class="dc">
      <div class="dc-title green">تقدير الفرصة التجارية</div>
      <div class="at">${lead.revenueOpportunity}</div>
    </div>` : ""}

    <!-- ══ السوشيال ميديا ══ -->
    ${parsedSocials.length > 0 ? `
    <div class="sh"><div class="sh-dot"></div>📱 تحليل وسائل التواصل الاجتماعي</div>

    <!-- إحصائيات سريعة -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
      ${parsedSocials.filter(s => s.followersCount).map(s => {
        const m = platformMeta(s.platform);
        return `<div class="stat-hl">
          <span style="color:${m.color};filter:drop-shadow(0 0 4px ${m.color});">${m.svg}</span>
          <div>
            <div class="stat-hl-val" style="color:${m.color};text-shadow:0 0 12px ${m.color}66;">${fmtInt(s.followersCount)}</div>
            <div class="stat-hl-lbl">${m.name} متابع</div>
          </div>
        </div>`;
      }).join("")}
    </div>

    <div class="social-grid">
      ${parsedSocials.map((sa: any) => {
        const m = platformMeta(sa.platform);
        const sc = sa.overallScore ? Number(sa.overallScore) : null;
        const scColor = scoreColor(sc);
        const scGlow = scoreGlow(sc);
        const gapsList: string[] = Array.isArray(sa.gaps) ? sa.gaps : [];
        return `
          <div class="sc" style="border-color:${m.color}22;">
            <div style="position:absolute;top:0;right:0;width:80px;height:80px;background:radial-gradient(circle,${m.color}08 0%,transparent 70%);"></div>
            ${sc !== null ? `<div class="sc-score" style="border:2px solid ${scColor};color:${scColor};box-shadow:${scGlow};background:rgba(6,13,26,0.9);">${sc.toFixed(0)}</div>` : ""}
            <div class="sc-header">
              <span style="filter:drop-shadow(0 0 4px ${m.color});">${m.svg}</span>
              <span class="sc-platform" style="color:${m.color};">${m.name}</span>
              ${sa.followersCount ? `<span class="sc-followers" style="background:${m.color};box-shadow:0 0 8px ${m.color}66;">${fmtInt(sa.followersCount)}</span>` : ""}
            </div>
            ${sa.engagementRate ? `<div class="sc-stat"><span class="sc-stat-lbl">معدل التفاعل</span><span class="sc-stat-val" style="color:${m.color};">${Number(sa.engagementRate).toFixed(2)}%</span></div>` : ""}
            ${sa.postsCount ? `<div class="sc-stat"><span class="sc-stat-lbl">عدد المنشورات</span><span class="sc-stat-val">${fmtInt(sa.postsCount)}</span></div>` : ""}
            ${sa.avgLikes ? `<div class="sc-stat"><span class="sc-stat-lbl">متوسط الإعجابات</span><span class="sc-stat-val">${fmtInt(sa.avgLikes)}</span></div>` : ""}
            ${sa.avgViews ? `<div class="sc-stat"><span class="sc-stat-lbl">متوسط المشاهدات</span><span class="sc-stat-val">${fmtInt(sa.avgViews)}</span></div>` : ""}
            ${sa.postingFrequencyScore || sa.engagementScore || sa.contentQualityScore ? `
              <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.05);">
                ${progressBar(sa.postingFrequencyScore, "تكرار النشر")}
                ${progressBar(sa.engagementScore, "التفاعل")}
                ${progressBar(sa.contentQualityScore, "جودة المحتوى")}
              </div>
            ` : ""}
            ${sa.analysisText ? `<div class="sc-analysis">${sa.analysisText.slice(0, 300)}</div>` : ""}
            ${gapsList.length > 0 ? `
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);">
                ${gapsList.slice(0,3).map((g: string) => `<div style="font-size:11px;color:#ef4444;margin-bottom:3px;">• ${g}</div>`).join("")}
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}
    </div>` : ""}

    <!-- ══ الموقع الإلكتروني ══ -->
    ${websiteAnalysis ? `
    <div class="sh"><div class="sh-dot"></div>🌐 تحليل الموقع الإلكتروني</div>
    <div class="ws-grid">
      ${[
        { label: "الإجمالي", value: websiteAnalysis.overallScore },
        { label: "السرعة", value: websiteAnalysis.loadSpeedScore },
        { label: "الجوال", value: websiteAnalysis.mobileExperienceScore },
        { label: "SEO", value: websiteAnalysis.seoScore },
        { label: "المحتوى", value: websiteAnalysis.contentQualityScore },
        { label: "التصميم", value: websiteAnalysis.designScore },
      ].map(s => `
        <div class="ws-box" style="border-color:${scoreColor(s.value)}22;">
          <div class="ws-val" style="color:${scoreColor(s.value)};text-shadow:${scoreGlow(s.value)};">${fmt(s.value)}</div>
          <div class="ws-lbl">${s.label}</div>
        </div>
      `).join("")}
    </div>
    ${websiteAnalysis.summary ? `<div class="dc"><div class="dc-title">ملخص التحليل</div><div class="at">${websiteAnalysis.summary}</div></div>` : ""}
    ${websiteAnalysis.recommendations ? `<div class="dc"><div class="dc-title">التوصيات</div><div class="at">${websiteAnalysis.recommendations}</div></div>` : ""}
    ` : ""}

    <!-- ══ التقرير الشامل ══ -->
    ${report?.fullReport ? `
    <div class="sh"><div class="sh-dot"></div>📋 التقرير الشامل</div>
    <div class="dc">
      <div class="fr"><p>${cleanMarkdown(typeof report.fullReport === "string" ? report.fullReport : "")}</p></div>
    </div>` : ""}

    <!-- ══ الملاحظات ══ -->
    ${lead.notes ? `
    <div class="sh"><div class="sh-dot"></div>📝 الملاحظات</div>
    <div class="dc"><div class="at">${lead.notes}</div></div>` : ""}

  </div><!-- /content -->

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div>
      <div class="footer-brand">${companyName}</div>
      ${company?.reportFooterText ? `<div>${company.reportFooterText}</div>` : ""}
      ${company?.email ? `<div>${company.email}</div>` : ""}
      ${company?.website ? `<div>${company.website}</div>` : ""}
    </div>
    <div style="text-align:left;">
      <div>تاريخ الإصدار: ${reportDate}</div>
      <div style="color:#22c55e22;">حصري من شركة مكسب — جميع الحقوق محفوظة</div>
      ${company?.address ? `<div>${company.address}</div>` : ""}
    </div>
  </div>

</div><!-- /pw -->
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=980,height=860");
  if (!printWindow) {
    throw new Error("تعذّر فتح نافذة التقرير. يرجى السماح بالنوافذ المنبثقة في المتصفح.");
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.addEventListener("load", () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 1800);
  });
}
