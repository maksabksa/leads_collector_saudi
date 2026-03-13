// ═══════════════════════════════════════════════════════════════════════
//  generateLeadPDF — Premium Dark Report v4
//  Arabic RTL · Tajawal Font · window.print() → PDF
//  ✅ شعار العميل في الغلاف
//  ✅ QR السجل التجاري في الفوتر
//  ✅ تحسين شامل للتصميم
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
  if (v >= 8) return "0 0 14px rgba(34,197,94,0.55), 0 0 28px rgba(34,197,94,0.25)";
  if (v >= 6) return "0 0 14px rgba(234,179,8,0.55), 0 0 28px rgba(234,179,8,0.25)";
  if (v >= 4) return "0 0 14px rgba(249,115,22,0.55), 0 0 28px rgba(249,115,22,0.25)";
  return "0 0 14px rgba(239,68,68,0.55), 0 0 28px rgba(239,68,68,0.25)";
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
    let clean = url.replace(/https?:\/\/(www\.)?/, "");
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

function platformMeta(p: string): { name: string; color: string; svg: string } {
  const map: Record<string, { name: string; color: string; svg: string }> = {
    instagram: {
      name: "إنستغرام",
      color: "#e1306c",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#e1306c"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
    },
    twitter: {
      name: "تويتر / X",
      color: "#1da1f2",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#1da1f2"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    },
    tiktok: {
      name: "تيك توك",
      color: "#69c9d0",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#69c9d0"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/></svg>`,
    },
    snapchat: {
      name: "سناب شات",
      color: "#fffc00",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#fffc00"><path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/></svg>`,
    },
    facebook: {
      name: "فيسبوك",
      color: "#1877f2",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    },
    linkedin: {
      name: "لينكد إن",
      color: "#0a66c2",
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    },
  };
  return map[p?.toLowerCase()] || { name: p || "منصة", color: "#64748b", svg: `<span style="font-size:14px">📱</span>` };
}

function urgencyMeta(level: string | null | undefined) {
  switch (level) {
    case "high": return { text: "أولوية عالية", color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.35)", dot: "🔴" };
    case "medium": return { text: "أولوية متوسطة", color: "#eab308", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.35)", dot: "🟡" };
    case "low": return { text: "أولوية منخفضة", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.35)", dot: "🟢" };
    default: return { text: "غير محدد", color: "#64748b", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.25)", dot: "⚪" };
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

function scoreCircleHTML(val: number | null | undefined, label: string) {
  const color = scoreColor(val);
  const glow = scoreGlow(val);
  const display = val ? val.toFixed(0) : "—";
  return `
    <div style="text-align:center;">
      <div style="width:62px;height:62px;border-radius:50%;border:2.5px solid ${color};box-shadow:${glow};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:${color};background:rgba(6,13,26,0.9);margin:0 auto 6px;position:relative;">
        <div style="position:absolute;inset:-5px;border-radius:50%;background:radial-gradient(circle,${color}12 0%,transparent 70%);"></div>
        ${display}
      </div>
      <div style="font-size:10px;color:#64748b;font-weight:600;letter-spacing:0.3px;">${label}</div>
    </div>
  `;
}

function miniBar(val: number | null | undefined, label: string, max = 10) {
  const pct = val ? Math.min((val / max) * 100, 100) : 0;
  const color = scoreColor(val);
  const display = val ? val.toFixed(1) : "—";
  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">
      <span style="font-size:11px;color:#64748b;min-width:80px;text-align:right;">${label}</span>
      <div style="flex:1;height:5px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${color},${color}99);border-radius:3px;box-shadow:0 0 6px ${color}44;"></div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${color};min-width:24px;text-align:left;">${display}</span>
    </div>
  `;
}

function metricRow(icon: string, label: string, value: string, color = "#94a3b8") {
  return `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;">${icon} ${label}</span>
      <span style="font-size:12px;font-weight:700;color:${color};">${value}</span>
    </div>
  `;
}

// ─── QR Code URL ──────────────────────────────────────────────────────────────
function qrUrl(data: string, color = "22c55e"): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data)}&bgcolor=0f172a&color=${color}&format=svg&margin=5`;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function generateLeadPDF(options: GeneratePDFOptions): Promise<void> {
  const { lead, websiteAnalysis, socialAnalyses = [], report, company } = options;
  if (!lead) throw new Error("لا توجد بيانات للعميل");

  const companyName = company?.companyName || "مكسب";
  const companyLogo = company?.logoUrl || "";
  const clientLogo = lead.clientLogoUrl || "";  // ✅ شعار العميل
  const reportDate = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const urgency = urgencyMeta(lead.urgencyLevel || lead.priority);
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
    lead.biggestMarketingGap.split(/\n|•|-/).map((s: string) => s.trim()).filter(Boolean).slice(0, 5).forEach((g: string) => gaps.push(g));
  }

  // ── Social analyses ──
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
      gaps: sa.gaps || extra.gaps || [],
      hasAccount: sa.hasAccount ?? extra.hasAccount ?? true,
    };
  });

  // ── Website scores ──
  const wsScores = websiteAnalysis ? [
    { label: "الإجمالي", value: websiteAnalysis.overallScore },
    { label: "السرعة", value: websiteAnalysis.loadSpeedScore },
    { label: "الجوال", value: websiteAnalysis.mobileExperienceScore },
    { label: "SEO", value: websiteAnalysis.seoScore },
    { label: "المحتوى", value: websiteAnalysis.contentQualityScore },
    { label: "التصميم", value: websiteAnalysis.designScore },
  ] : [];

  // ── Social links for contact strip ──
  const socialLinks = [
    lead.instagramUrl && { icon: "📸", label: "إنستغرام", val: cleanUrl(lead.instagramUrl, "instagram"), bg: "rgba(225,48,108,0.08)" },
    lead.twitterUrl && { icon: "🐦", label: "تويتر", val: cleanUrl(lead.twitterUrl, "twitter"), bg: "rgba(29,161,242,0.08)" },
    lead.tiktokUrl && { icon: "🎵", label: "تيك توك", val: cleanUrl(lead.tiktokUrl, "tiktok"), bg: "rgba(105,201,208,0.08)" },
    lead.snapchatUrl && { icon: "👻", label: "سناب", val: cleanUrl(lead.snapchatUrl, "snapchat"), bg: "rgba(255,252,0,0.08)" },
    lead.facebookUrl && { icon: "📘", label: "فيسبوك", val: cleanUrl(lead.facebookUrl, "facebook"), bg: "rgba(24,119,242,0.08)" },
    lead.linkedinUrl && { icon: "💼", label: "لينكد إن", val: cleanUrl(lead.linkedinUrl, "linkedin"), bg: "rgba(10,102,194,0.08)" },
  ].filter(Boolean) as { icon: string; label: string; val: string; bg: string }[];

  // ═══════════════════════════════════════════════════════════════════════
  //  HTML TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير ${lead.companyName || "عميل"} — ${companyName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Tajawal',sans-serif;direction:rtl;text-align:right;background:#060d1a;color:#e2e8f0;font-size:13px;line-height:1.65;}
    /* Print bar */
    .print-bar{position:fixed;top:0;left:0;right:0;background:rgba(6,13,26,0.96);backdrop-filter:blur(10px);border-bottom:1px solid rgba(34,197,94,0.15);padding:9px 28px;display:flex;justify-content:space-between;align-items:center;z-index:9999;}
    .print-bar-title{font-size:13px;font-weight:700;color:#94a3b8;}
    .btn-print{background:linear-gradient(135deg,#22c55e,#16a34a);color:#000;border:none;padding:7px 20px;border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 0 14px rgba(34,197,94,0.35);}
    .btn-close{background:transparent;color:#475569;border:1px solid #1e293b;padding:7px 14px;border-radius:7px;font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;margin-right:6px;}
    /* Watermark */
    .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:72px;font-weight:900;color:rgba(34,197,94,0.025);white-space:nowrap;pointer-events:none;z-index:9998;letter-spacing:8px;}
    .wm2{position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:9997;overflow:hidden;}
    .wm2::before,.wm2::after{content:'حصري من ${companyName}  ✦  حصري من ${companyName}  ✦  حصري من ${companyName}';position:absolute;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;color:rgba(34,197,94,0.02);white-space:nowrap;letter-spacing:5px;transform:rotate(-35deg);}
    .wm2::before{top:18%;left:-25%;}
    .wm2::after{top:65%;left:-15%;}
    /* Page wrapper */
    .pw{margin-top:48px;max-width:900px;margin-left:auto;margin-right:auto;padding-bottom:40px;}

    /* ══ COVER PAGE ══ */
    .cover-page{min-height:100vh;background:linear-gradient(160deg,#020810 0%,#060d1a 40%,#091428 70%,#020810 100%);display:flex;flex-direction:column;position:relative;overflow:hidden;page-break-after:always;}
    .cp-glow-tl{position:absolute;top:-100px;right:-100px;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,0.08) 0%,transparent 65%);pointer-events:none;}
    .cp-glow-br{position:absolute;bottom:-120px;left:-80px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.06) 0%,transparent 65%);pointer-events:none;}
    .cp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(34,197,94,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,0.025) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;}
    .cp-top{padding:32px 48px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(34,197,94,0.08);}
    .cp-logo-wrap{display:flex;align-items:center;gap:14px;}
    .cp-logo{width:52px;height:52px;border-radius:12px;object-fit:contain;background:#0f172a;padding:4px;border:1px solid rgba(34,197,94,0.2);box-shadow:0 0 20px rgba(34,197,94,0.12);}
    .cp-logo-ph{width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(34,197,94,0.25);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#22c55e;box-shadow:0 0 20px rgba(34,197,94,0.12);}
    .cp-co-name{font-size:20px;font-weight:800;color:#f8fafc;}
    .cp-co-sub{font-size:10px;color:#475569;margin-top:2px;letter-spacing:1px;}
    .cp-report-id{font-size:11px;color:#334155;text-align:left;}
    /* ── Client Logo in Cover ── */
    .cp-client-logo-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:24px;}
    .cp-client-logo{width:96px;height:96px;border-radius:20px;object-fit:contain;background:#0f172a;padding:6px;border:2px solid rgba(255,255,255,0.1);box-shadow:0 0 30px rgba(255,255,255,0.06),0 8px 32px rgba(0,0,0,0.4);}
    .cp-client-logo-ph{width:96px;height:96px;border-radius:20px;background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#94a3b8;box-shadow:0 8px 32px rgba(0,0,0,0.4);}
    .cp-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 60px;position:relative;z-index:1;}
    .cp-tag{font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#22c55e;opacity:0.7;margin-bottom:20px;}
    .cp-client-name{font-size:48px;font-weight:900;text-align:center;background:linear-gradient(135deg,#ffffff 0%,#94a3b8 60%,#475569 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1.15;margin-bottom:12px;}
    .cp-client-meta{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-bottom:32px;}
    .cp-meta-item{font-size:13px;color:#475569;}
    .cp-meta-sep{color:#1e293b;font-size:16px;}
    .cp-divider{width:120px;height:2px;background:linear-gradient(90deg,transparent,#22c55e,transparent);margin:0 auto 32px;box-shadow:0 0 10px rgba(34,197,94,0.4);}
    .cp-scores{display:flex;gap:28px;justify-content:center;flex-wrap:wrap;margin-bottom:32px;}
    .cp-score-block{text-align:center;}
    .cp-score-ring{width:80px;height:80px;border-radius:50%;border:2.5px solid;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;margin:0 auto 8px;position:relative;}
    .cp-score-ring::before{content:'';position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,currentColor 0%,transparent 70%);opacity:0.07;}
    .cp-score-lbl{font-size:11px;color:#475569;font-weight:600;letter-spacing:0.5px;}
    .cp-urgency{display:inline-flex;align-items:center;gap:8px;padding:8px 22px;border-radius:24px;font-size:12px;font-weight:700;border:1px solid;margin-bottom:32px;}
    /* CR Number badge */
    .cp-cr{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:8px;font-size:11px;font-weight:700;background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.2);color:#0ea5e9;margin-bottom:12px;}
    .cp-bottom{padding:28px 48px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;align-items:center;}
    .cp-bottom-left{font-size:11px;color:#334155;line-height:1.8;}
    .cp-bottom-right{font-size:11px;color:#334155;text-align:left;}
    .cp-confidential{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#1e293b;margin-top:4px;}
    @media print{.cover-page{min-height:100vh!important;page-break-after:always!important;}}

    /* ══ COVER HEADER ══ */
    .cover{background:linear-gradient(135deg,#0a1628 0%,#0d1f3c 50%,#0a1628 100%);border-bottom:1px solid rgba(34,197,94,0.12);padding:28px 36px 22px;position:relative;overflow:hidden;}
    .cover::before{content:'';position:absolute;top:-60px;right:-60px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%);}
    .cover::after{content:'';position:absolute;bottom:-50px;left:-50px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%);}
    .cover-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;}
    .co-brand{display:flex;align-items:center;gap:12px;}
    .co-logo{width:48px;height:48px;border-radius:10px;object-fit:contain;background:#0f172a;padding:3px;border:1px solid rgba(34,197,94,0.18);}
    .co-logo-ph{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(34,197,94,0.22);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#22c55e;}
    .co-name{font-size:18px;font-weight:800;color:#f8fafc;}
    .co-sub{font-size:10px;color:#475569;margin-top:1px;letter-spacing:0.5px;}
    .cover-meta{text-align:left;}
    .cover-date{font-size:11px;color:#475569;}
    .cover-id{font-size:10px;color:#334155;margin-top:2px;}
    /* Client header row */
    .client-header-row{display:flex;align-items:center;gap:16px;margin-bottom:8px;}
    .client-logo-sm{width:56px;height:56px;border-radius:12px;object-fit:contain;background:#0f172a;padding:3px;border:1px solid rgba(255,255,255,0.08);}
    .client-logo-sm-ph{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#94a3b8;}
    .client-name{font-size:28px;font-weight:900;background:linear-gradient(135deg,#f8fafc,#94a3b8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
    .client-meta{font-size:12px;color:#64748b;display:flex;align-items:center;gap:7px;flex-wrap:wrap;}
    .meta-dot{width:4px;height:4px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0;}
    .scores-row{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:16px;}
    .urgency-pill{padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700;background:${urgencyMeta(lead.urgencyLevel || lead.priority).bg};color:${urgencyMeta(lead.urgencyLevel || lead.priority).color};border:1px solid ${urgencyMeta(lead.urgencyLevel || lead.priority).border};}
    /* Accent bar */
    .accent-bar{height:2px;background:linear-gradient(90deg,#22c55e,#0ea5e9,#8b5cf6,#22c55e);}
    /* Contact strip */
    .contact-strip{background:#080f1e;border-bottom:1px solid rgba(255,255,255,0.04);padding:12px 36px;display:flex;flex-wrap:wrap;gap:16px;}
    .ci{display:flex;align-items:center;gap:8px;}
    .ci-icon{width:30px;height:30px;border-radius:7px;background:#0f172a;border:1px solid #1e293b;display:flex;align-items:center;justify-content:center;font-size:13px;}
    .ci-lbl{font-size:9px;color:#334155;letter-spacing:0.3px;}
    .ci-val{font-size:11px;font-weight:600;color:#cbd5e1;}
    /* Content */
    .content{padding:22px 36px;}
    /* Section header */
    .sh{font-size:14px;font-weight:800;color:#f8fafc;margin:22px 0 12px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;gap:8px;}
    .sh-dot{width:3px;height:18px;border-radius:2px;background:linear-gradient(180deg,#22c55e,#0ea5e9);box-shadow:0 0 7px rgba(34,197,94,0.45);flex-shrink:0;}
    /* Dark card */
    .dc{background:linear-gradient(135deg,#0d1f3c,#080f1e);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:16px 18px;margin-bottom:12px;position:relative;overflow:hidden;}
    .dc::before{content:'';position:absolute;top:0;right:0;width:50px;height:50px;background:radial-gradient(circle,rgba(34,197,94,0.04) 0%,transparent 70%);}
    .dc-title{font-size:11px;font-weight:700;color:#475569;margin-bottom:10px;letter-spacing:0.5px;text-transform:uppercase;}
    .dc-title.accent{color:#f97316;}
    .dc-title.green{color:#22c55e;}
    /* Analysis text */
    .at{font-size:12px;color:#94a3b8;line-height:1.85;}
    .at p{margin-bottom:8px;}
    .at strong{color:#cbd5e1;}
    /* Divider */
    .divider{height:1px;background:rgba(255,255,255,0.04);margin:12px 0;}
    /* Gap list */
    .gap-list{list-style:none;padding:0;}
    .gap-item{display:flex;align-items:flex-start;gap:8px;padding:5px 0;font-size:12px;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.03);}
    .gap-dot{color:#ef4444;flex-shrink:0;font-size:14px;}
    /* Phone tags */
    .phones-wrap{display:flex;flex-wrap:wrap;gap:8px;}
    .phone-tag{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:6px;padding:5px 12px;font-size:13px;font-weight:700;color:#22c55e;font-family:monospace;direction:ltr;}
    /* Social grid */
    .social-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:12px;}
    .sc{background:linear-gradient(135deg,#0d1f3c,#080f1e);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px 16px;position:relative;overflow:hidden;}
    .sc-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
    .sc-platform{font-size:13px;font-weight:700;flex:1;}
    .sc-badge{color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;}
    .sc-score-ring{width:32px;height:32px;border-radius:50%;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;}
    /* Website scores */
    .ws-row{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px;}
    .ws-box{background:linear-gradient(135deg,#0d1f3c,#080f1e);border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:12px 8px;text-align:center;}
    .ws-val{font-size:22px;font-weight:900;margin-bottom:4px;}
    .ws-lbl{font-size:9px;color:#475569;font-weight:600;letter-spacing:0.3px;}
    /* Opportunity */
    .opp-vs{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:16px;padding:16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);}
    .opp-vs-stat{text-align:center;}
    .opp-vs-val{font-size:28px;font-weight:900;}
    .opp-vs-lbl{font-size:10px;color:#475569;margin-top:3px;}
    .opp-vs-arrow{font-size:20px;color:#334155;}
    .opp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
    .opp-card{background:linear-gradient(135deg,#0d1f3c,#080f1e);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px 16px;}
    .opp-card.now{border-color:rgba(239,68,68,0.12);}
    .opp-card.with-maksab{border-color:rgba(34,197,94,0.12);}
    .opp-label{font-size:11px;font-weight:700;margin-bottom:10px;letter-spacing:0.3px;}
    .opp-item{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:#64748b;margin-bottom:6px;}
    .opp-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px;}
    /* Full report */
    .fr{font-size:12px;color:#94a3b8;line-height:1.9;}
    .fr p{margin-bottom:10px;}
    .fr strong{color:#cbd5e1;}
    .fr code{background:#0f172a;padding:1px 5px;border-radius:3px;font-size:11px;color:#22c55e;}
    /* ══ FOOTER ══ */
    .footer{background:#030810;border-top:1px solid rgba(34,197,94,0.08);padding:24px 36px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;}
    .qr-wrap{display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;}
    .qr-block{display:flex;flex-direction:column;align-items:center;gap:6px;}
    .qr-img{width:90px;height:90px;border-radius:10px;border:1px solid rgba(34,197,94,0.2);background:#0f172a;padding:4px;}
    .qr-img.cr{border-color:rgba(14,165,233,0.25);}
    .qr-img.maps{border-color:rgba(234,179,8,0.25);}
    .qr-caption{font-size:8px;font-weight:700;letter-spacing:0.4px;text-align:center;}
    .qr-text{font-size:10px;color:#334155;line-height:1.7;}
    /* CR info box */
    .cr-info-box{background:rgba(14,165,233,0.05);border:1px solid rgba(14,165,233,0.15);border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:10px;}
    .cr-info-icon{font-size:20px;}
    .cr-info-label{font-size:10px;color:#475569;}
    .cr-info-value{font-size:14px;font-weight:800;color:#0ea5e9;font-family:monospace;}
    @media print{
      .print-bar{display:none!important;}
      .pw{margin-top:0!important;}
      body{background:#060d1a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .dc,.sc,.opp-card{break-inside:avoid;}
      .sh{break-after:avoid;}
      .wm{color:rgba(34,197,94,0.04)!important;}
      .wm2::before,.wm2::after{color:rgba(34,197,94,0.03)!important;}
    }
  </style>
</head>
<body>
<div class="wm2"></div>
<div class="wm">حصري من ${companyName}</div>

<!-- Print bar -->
<div class="print-bar">
  <span class="print-bar-title">تقرير تحليل: ${lead.companyName || "—"} · ${companyName}</span>
  <div>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    <button class="btn-print" onclick="window.print()">🖨️ طباعة / تحميل PDF</button>
  </div>
</div>

<div class="pw">

  <!-- ══ COVER PAGE ══ -->
  <div class="cover-page">
    <div class="cp-glow-tl"></div>
    <div class="cp-glow-br"></div>
    <div class="cp-grid"></div>

    <!-- Top bar: شعار الشركة المُصدِرة -->
    <div class="cp-top">
      <div class="cp-logo-wrap">
        ${companyLogo
          ? `<img src="${companyLogo}" class="cp-logo" alt="${companyName}">`
          : `<div class="cp-logo-ph">${companyName.charAt(0)}</div>`
        }
        <div>
          <div class="cp-co-name">${companyName}</div>
          <div class="cp-co-sub">${company?.reportHeaderText || "تقرير تحليل الوضع الرقمي"}</div>
        </div>
      </div>
      <div class="cp-report-id">
        <div>رقم التقرير: <strong style="color:#22c55e;">#${String(lead.id || "—").padStart(6, "0")}</strong></div>
        <div style="margin-top:3px;">${reportDate}</div>
        ${company?.licenseNumber ? `<div style="margin-top:3px;">ترخيص: ${company.licenseNumber}</div>` : ""}
      </div>
    </div>

    <!-- Body -->
    <div class="cp-body">
      <div class="cp-tag">تقرير تحليل رقمي شامل</div>

      <!-- ✅ شعار العميل في الغلاف -->
      <div class="cp-client-logo-wrap">
        ${clientLogo
          ? `<img src="${clientLogo}" class="cp-client-logo" alt="${lead.companyName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
             <div class="cp-client-logo-ph" style="display:none;">${(lead.companyName || "?").charAt(0)}</div>`
          : `<div class="cp-client-logo-ph">${(lead.companyName || "?").charAt(0)}</div>`
        }
      </div>

      <div class="cp-client-name">${lead.companyName || "—"}</div>
      <div class="cp-client-meta">
        ${lead.businessType ? `<span class="cp-meta-item">${lead.businessType}</span>` : ""}
        ${lead.businessType && lead.city ? `<span class="cp-meta-sep">·</span>` : ""}
        ${lead.city ? `<span class="cp-meta-item">${lead.city}</span>` : ""}
        ${lead.city && lead.country ? `<span class="cp-meta-sep">·</span>` : ""}
        ${lead.country ? `<span class="cp-meta-item">${lead.country}</span>` : ""}
      </div>

      ${lead.crNumber ? `
      <div class="cp-cr">
        🏢 السجل التجاري: <strong style="font-family:monospace;letter-spacing:1px;">${lead.crNumber}</strong>
      </div>` : ""}

      <div class="cp-divider"></div>

      <!-- Scores -->
      ${(priorityScore || qualityScore || seasonScore || lead.rating) ? `
      <div class="cp-scores">
        ${priorityScore ? `<div class="cp-score-block"><div class="cp-score-ring" style="border-color:${scoreColor(priorityScore)};color:${scoreColor(priorityScore)};box-shadow:${scoreGlow(priorityScore)};">${priorityScore.toFixed(0)}</div><div class="cp-score-lbl">الأولوية</div></div>` : ""}
        ${qualityScore ? `<div class="cp-score-block"><div class="cp-score-ring" style="border-color:${scoreColor(qualityScore)};color:${scoreColor(qualityScore)};box-shadow:${scoreGlow(qualityScore)};">${qualityScore.toFixed(0)}</div><div class="cp-score-lbl">جودة البيانات</div></div>` : ""}
        ${seasonScore ? `<div class="cp-score-block"><div class="cp-score-ring" style="border-color:${scoreColor(seasonScore)};color:${scoreColor(seasonScore)};box-shadow:${scoreGlow(seasonScore)};">${seasonScore.toFixed(0)}</div><div class="cp-score-lbl">الموسمية</div></div>` : ""}
        ${lead.rating ? `<div class="cp-score-block"><div class="cp-score-ring" style="border-color:#eab308;color:#eab308;box-shadow:0 0 14px rgba(234,179,8,0.55);">${Number(lead.rating).toFixed(1)}</div><div class="cp-score-lbl">تقييم جوجل</div></div>` : ""}
      </div>` : ""}

      <div class="cp-urgency" style="background:${urgency.bg};color:${urgency.color};border-color:${urgency.border};box-shadow:0 0 14px ${urgency.color}22;">
        ${urgency.dot} ${urgency.text}
      </div>

      ${lead.socialSince ? `<div style="font-size:11px;color:#475569;margin-top:-16px;margin-bottom:16px;">📅 على السوشيال منذ: <strong style="color:#94a3b8;">${lead.socialSince}</strong></div>` : ""}
    </div>

    <!-- Bottom -->
    <div class="cp-bottom">
      <div class="cp-bottom-left">
        <div style="font-weight:700;color:#22c55e;font-size:12px;margin-bottom:3px;">${companyName}</div>
        ${company?.website ? `<div>${company.website}</div>` : "<div>maksab-ksa.com</div>"}
        ${company?.phone ? `<div>${company.phone}</div>` : ""}
        ${company?.email ? `<div>${company.email}</div>` : ""}
      </div>
      <div class="cp-bottom-right">
        <div>تاريخ الإصدار: ${reportDate}</div>
        <div class="cp-confidential">حصري · سري · للاستخدام الداخلي فقط</div>
      </div>
    </div>
  </div>
  <!-- ══ END COVER PAGE ══ -->

  <!-- ══ COVER HEADER (ملخص) ══ -->
  <div class="cover">
    <div class="cover-top">
      <div class="co-brand">
        ${companyLogo
          ? `<img src="${companyLogo}" class="co-logo" alt="${companyName}">`
          : `<div class="co-logo-ph">${companyName.charAt(0)}</div>`
        }
        <div>
          <div class="co-name">${companyName}</div>
          <div class="co-sub">${company?.reportHeaderText || "تقرير تحليل الوضع الرقمي"}</div>
        </div>
      </div>
      <div class="cover-meta">
        <div class="cover-date">📅 ${reportDate}</div>
        <div class="cover-id">رقم التقرير #${String(lead.id || "—").padStart(6, "0")}</div>
        ${company?.licenseNumber ? `<div class="cover-id">ترخيص: ${company.licenseNumber}</div>` : ""}
      </div>
    </div>

    <!-- ✅ شعار العميل + اسمه في الهيدر -->
    <div class="client-header-row">
      ${clientLogo
        ? `<img src="${clientLogo}" class="client-logo-sm" alt="${lead.companyName}" onerror="this.style.display='none';">`
        : `<div class="client-logo-sm-ph">${(lead.companyName || "?").charAt(0)}</div>`
      }
      <div>
        <div class="client-name">${lead.companyName || "—"}</div>
        <div class="client-meta">
          ${lead.businessType ? `<span class="meta-dot"></span><span>${lead.businessType}</span>` : ""}
          ${lead.city ? `<span class="meta-dot"></span><span>${lead.city}</span>` : ""}
          ${lead.country ? `<span class="meta-dot"></span><span>${lead.country}</span>` : ""}
          ${lead.crNumber ? `<span class="meta-dot"></span><span style="color:#0ea5e9;">سجل: ${lead.crNumber}</span>` : ""}
          ${lead.socialSince ? `<span class="meta-dot"></span><span>منذ ${lead.socialSince}</span>` : ""}
        </div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;margin-top:12px;">
      <div class="scores-row">
        ${priorityScore ? scoreCircleHTML(priorityScore, "الأولوية") : ""}
        ${qualityScore ? scoreCircleHTML(qualityScore, "الجودة") : ""}
        ${seasonScore ? scoreCircleHTML(seasonScore, "الموسمية") : ""}
        <div class="urgency-pill">${urgency.dot} ${urgency.text}</div>
      </div>
      ${lead.rating ? `
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="font-size:26px;font-weight:900;color:#eab308;text-shadow:0 0 14px rgba(234,179,8,0.45);">⭐ ${lead.rating}</div>
          ${lead.reviewCount ? `<div style="font-size:10px;color:#64748b;">${fmtInt(lead.reviewCount)}<br>تقييم</div>` : ""}
        </div>
      ` : ""}
    </div>
  </div>

  <!-- Accent bar -->
  <div class="accent-bar"></div>

  <!-- ══ CONTACT STRIP ══ -->
  ${(phones.length > 0 || lead.email || lead.website || socialLinks.length > 0) ? `
  <div class="contact-strip">
    ${phones.length > 0 ? `<div class="ci"><div class="ci-icon">📞</div><div><div class="ci-lbl">هاتف</div><div class="ci-val">${phones[0]}</div></div></div>` : ""}
    ${lead.email ? `<div class="ci"><div class="ci-icon">📧</div><div><div class="ci-lbl">بريد</div><div class="ci-val">${lead.email}</div></div></div>` : ""}
    ${lead.website ? `<div class="ci"><div class="ci-icon">🌐</div><div><div class="ci-lbl">موقع</div><div class="ci-val">${lead.website}</div></div></div>` : ""}
    ${socialLinks.map(s => `<div class="ci"><div class="ci-icon" style="background:${s.bg};">${s.icon}</div><div><div class="ci-lbl">${s.label}</div><div class="ci-val">${s.val}</div></div></div>`).join("")}
  </div>` : ""}

  <!-- ══ CONTENT ══ -->
  <div class="content">

    ${company?.reportIntroText ? `<div class="dc"><div class="at">${company.reportIntroText}</div></div>` : ""}

    <!-- رقم السجل التجاري (إذا وُجد) -->
    ${lead.crNumber ? `
    <div class="cr-info-box">
      <div class="cr-info-icon">🏢</div>
      <div>
        <div class="cr-info-label">رقم السجل التجاري</div>
        <div class="cr-info-value">${lead.crNumber}</div>
      </div>
    </div>` : ""}

    <!-- الثغرات + أرقام الهاتف -->
    ${(gaps.length > 0 || phones.length > 0) ? `
    <div style="display:grid;grid-template-columns:${gaps.length > 0 && phones.length > 0 ? "1fr 1fr" : "1fr"};gap:12px;">
      ${gaps.length > 0 ? `
      <div>
        <div class="sh" style="margin-top:0;"><div class="sh-dot"></div>الفجوات التشغيلية الحرجة</div>
        <div class="dc">
          <ul class="gap-list">
            ${gaps.map(g => `<li class="gap-item"><span class="gap-dot">•</span><span>${g}</span></li>`).join("")}
          </ul>
        </div>
      </div>` : ""}
      ${phones.length > 0 ? `
      <div>
        <div class="sh" style="margin-top:0;"><div class="sh-dot"></div>أرقام الاتصال المكتشفة</div>
        <div class="dc">
          <div class="phones-wrap">
            ${phones.map(p => `<span class="phone-tag">${p}</span>`).join("")}
          </div>
          ${lead.iceBreaker ? `<div class="divider"></div><div class="at" style="font-size:11px;">${lead.iceBreaker.slice(0, 160)}${lead.iceBreaker.length > 160 ? "..." : ""}</div>` : ""}
        </div>
      </div>` : ""}
    </div>` : ""}

    <!-- فرصة الإيراد -->
    ${lead.revenueOpportunity ? `
    <div class="sh"><div class="sh-dot"></div>تقدير الفرصة التجارية</div>
    <div class="dc"><div class="at">${lead.revenueOpportunity}</div></div>` : ""}

    <!-- ══ السوشيال ميديا ══ -->
    ${parsedSocials.length > 0 ? `
    <div class="sh"><div class="sh-dot"></div>تحليل الحضور على منصات التواصل الاجتماعي</div>
    ${parsedSocials.filter(s => s.followersCount).length > 0 ? `
    <div class="dc" style="margin-bottom:12px;">
      <div class="dc-title green">ملخص الحضور الرقمي عبر المنصات</div>
      ${parsedSocials.filter(s => s.followersCount).map(s => {
        const m = platformMeta(s.platform);
        return metricRow(m.svg, m.name, fmtInt(s.followersCount) + " متابع", m.color);
      }).join("")}
    </div>` : ""}
    <div class="social-grid">
      ${parsedSocials.map((sa: any) => {
        const m = platformMeta(sa.platform);
        const sc = sa.overallScore ? Number(sa.overallScore) : null;
        const scColor = scoreColor(sc);
        const scGlow = scoreGlow(sc);
        const gapsList: string[] = Array.isArray(sa.gaps) ? sa.gaps : [];
        return `
          <div class="sc" style="border-color:${m.color}1a;">
            <div style="position:absolute;top:0;right:0;width:70px;height:70px;background:radial-gradient(circle,${m.color}07 0%,transparent 70%);"></div>
            <div class="sc-header">
              <span style="filter:drop-shadow(0 0 3px ${m.color});">${m.svg}</span>
              <span class="sc-platform" style="color:${m.color};">${m.name}</span>
              ${sa.followersCount ? `<span class="sc-badge" style="background:${m.color};box-shadow:0 0 7px ${m.color}55;">${fmtInt(sa.followersCount)}</span>` : ""}
              ${sc !== null ? `<div class="sc-score-ring" style="border-color:${scColor};color:${scColor};box-shadow:${scGlow};background:rgba(6,13,26,0.9);">${sc.toFixed(0)}</div>` : ""}
            </div>
            ${(sa.engagementRate || sa.postsCount || sa.avgLikes || sa.avgViews) ? `
            <div style="margin-bottom:8px;">
              ${sa.engagementRate ? metricRow("📊", "معدل التفاعل", Number(sa.engagementRate).toFixed(2) + "%", m.color) : ""}
              ${sa.postsCount ? metricRow("📝", "المنشورات", fmtInt(sa.postsCount)) : ""}
              ${sa.avgLikes ? metricRow("❤️", "متوسط الإعجابات", fmtInt(sa.avgLikes)) : ""}
              ${sa.avgViews ? metricRow("👁️", "متوسط المشاهدات", fmtInt(sa.avgViews)) : ""}
            </div>` : ""}
            ${(sa.postingFrequencyScore || sa.engagementScore || sa.contentQualityScore) ? `
            <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);">
              ${miniBar(sa.postingFrequencyScore, "تكرار النشر")}
              ${miniBar(sa.engagementScore, "التفاعل")}
              ${miniBar(sa.contentQualityScore, "جودة المحتوى")}
            </div>` : ""}
            ${sa.analysisText ? `<div style="font-size:11px;color:#475569;line-height:1.65;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.04);">${sa.analysisText.slice(0, 220)}${sa.analysisText.length > 220 ? "..." : ""}</div>` : ""}
            ${gapsList.length > 0 ? `
            <div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.04);">
              ${gapsList.slice(0,2).map((g: string) => `<div style="font-size:10px;color:#ef4444;margin-bottom:2px;display:flex;align-items:flex-start;gap:5px;"><span style="flex-shrink:0;">•</span><span>${g}</span></div>`).join("")}
            </div>` : ""}
          </div>
        `;
      }).join("")}
    </div>` : ""}

    <!-- ══ الموقع الإلكتروني ══ -->
    ${websiteAnalysis ? `
    <div class="sh"><div class="sh-dot"></div>تحليل الموقع الإلكتروني</div>
    <div class="ws-row">
      ${wsScores.map(s => `
        <div class="ws-box" style="border-color:${scoreColor(s.value)}1a;">
          <div class="ws-val" style="color:${scoreColor(s.value)};text-shadow:${scoreGlow(s.value)};">${fmt(s.value)}</div>
          <div class="ws-lbl">${s.label}</div>
        </div>
      `).join("")}
    </div>
    <div class="dc">
      ${wsScores.filter(s => s.value).map(s => miniBar(s.value, s.label)).join("")}
      ${websiteAnalysis.summary ? `<div class="divider"></div><div class="at">${websiteAnalysis.summary}</div>` : ""}
    </div>
    ${websiteAnalysis.recommendations ? `<div class="dc"><div class="dc-title">التوصيات</div><div class="at">${websiteAnalysis.recommendations}</div></div>` : ""}
    ` : ""}

    <!-- ══ الفرص الاستراتيجية ══ -->
    ${(lead.biggestMarketingGap || lead.revenueOpportunity || websiteAnalysis || socialAnalyses.length > 0) ? `
    <div class="sh"><div class="sh-dot"></div>تحليل الفجوات والفرص الاستراتيجية</div>
    <div class="opp-vs">
      <div class="opp-vs-stat">
        <div class="opp-vs-val" style="color:#ef4444;text-shadow:0 0 10px rgba(239,68,68,0.45);">${websiteAnalysis?.overallScore ? Number(websiteAnalysis.overallScore).toFixed(0) : (priorityScore ? priorityScore.toFixed(0) : "—")}/10</div>
        <div class="opp-vs-lbl">الوضع الحالي</div>
      </div>
      <div class="opp-vs-arrow">→</div>
      <div class="opp-vs-stat">
        <div class="opp-vs-val" style="color:#22c55e;text-shadow:0 0 10px rgba(34,197,94,0.45);">9+/10</div>
        <div class="opp-vs-lbl">مع ${companyName}</div>
      </div>
      <div class="opp-vs-arrow">→</div>
      <div class="opp-vs-stat">
        <div class="opp-vs-val" style="color:#0ea5e9;text-shadow:0 0 10px rgba(14,165,233,0.45);">+40%</div>
        <div class="opp-vs-lbl">نمو متوقع</div>
      </div>
    </div>
    <div class="opp-grid">
      <div class="opp-card now">
        <div class="opp-label" style="color:#ef4444;">⚠️ الفجوات التشغيلية الحالية</div>
        ${gaps.slice(0,4).map(g => `<div class="opp-item"><span class="opp-dot" style="background:#ef4444;"></span><span>${g}</span></div>`).join("")}
        ${!gaps.length ? `
          <div class="opp-item"><span class="opp-dot" style="background:#ef4444;"></span><span>غياب استراتيجية رقمية موثقة وقابلة للقياس</span></div>
          <div class="opp-item"><span class="opp-dot" style="background:#ef4444;"></span><span>محدودية الظهور في نتائج البحث المحلية والعضوية</span></div>
          <div class="opp-item"><span class="opp-dot" style="background:#ef4444;"></span><span>ضعف استثمار قنوات التواصل في توليد الطلب</span></div>
          <div class="opp-item"><span class="opp-dot" style="background:#ef4444;"></span><span>تسرب ملحوظ في العملاء المحتملين لغياب آليات التحويل</span></div>
        ` : ""}
      </div>
      <div class="opp-card with-maksab">
        <div class="opp-label" style="color:#22c55e;">✅ المخرجات المستهدفة مع ${companyName}</div>
        <div class="opp-item"><span class="opp-dot" style="background:#22c55e;"></span><span>بناء حضور رقمي متكامل ومتسق عبر جميع المنصات ذات الصلة</span></div>
        <div class="opp-item"><span class="opp-dot" style="background:#22c55e;"></span><span>تطوير استراتيجية محتوى مبنية على بيانات الجمهور المستهدف</span></div>
        <div class="opp-item"><span class="opp-dot" style="background:#22c55e;"></span><span>تعزيز الظهور العضوي في محركات البحث وخرائط جوجل</span></div>
        <div class="opp-item"><span class="opp-dot" style="background:#22c55e;"></span><span>تحويل حركة المرور الرقمية إلى إيراد قابل للقياس والتتبع</span></div>
        ${lead.revenueOpportunity ? `<div class="opp-item"><span class="opp-dot" style="background:#0ea5e9;"></span><span style="color:#0ea5e9;font-weight:600;">${lead.revenueOpportunity.slice(0,110)}${lead.revenueOpportunity.length > 110 ? "..." : ""}</span></div>` : ""}
      </div>
    </div>
    <!-- CTA -->
    <div style="background:linear-gradient(135deg,rgba(34,197,94,0.07),rgba(14,165,233,0.05));border:1px solid rgba(34,197,94,0.15);border-radius:10px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
      <div>
        <div style="font-size:14px;font-weight:800;color:#f8fafc;margin-bottom:4px;">للاستفسار وطلب خطة العمل التفصيلية</div>
        <div style="font-size:11px;color:#475569;">يسعدنا تقديم عرض مخصص يتوافق مع أهداف نشاطكم التجاري وميزانيتكم</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:16px;font-weight:900;color:#22c55e;text-shadow:0 0 10px rgba(34,197,94,0.45);">${company?.phone || company?.email || "maksab-ksa.com"}</div>
        <div style="font-size:9px;color:#334155;margin-top:1px;">تواصل معنا الآن</div>
      </div>
    </div>
    ` : ""}

    <!-- ══ التقرير الشامل ══ -->
    ${report?.fullReport ? `
    <div class="sh"><div class="sh-dot"></div>التحليل التفصيلي والتوصيات الاستراتيجية</div>
    <div class="dc">
      <div class="fr"><p>${cleanMarkdown(typeof report.fullReport === "string" ? report.fullReport : "")}</p></div>
    </div>` : ""}

    <!-- ══ الملاحظات ══ -->
    ${lead.notes ? `
    <div class="sh" style="margin-top:0;"><div class="sh-dot"></div>الملاحظات</div>
    <div class="dc"><div class="at">${lead.notes}</div></div>` : ""}

  </div><!-- /content -->

  <!-- ══ FOOTER ══ -->
  <div class="footer">
    <div class="qr-wrap">
      <!-- QR موقع الشركة -->
      <div class="qr-block">
        <img class="qr-img"
          src="${qrUrl(company?.website || "https://maksab-ksa.com")}"
          alt="QR الموقع"
        />
        <div class="qr-caption" style="color:#22c55e;">موقع ${companyName}</div>
      </div>

      <!-- ✅ QR السجل التجاري (إذا وُجد) -->
      ${lead.crNumber ? `
      <div class="qr-block">
        <img class="qr-img cr"
          src="${qrUrl("https://mc.gov.sa/ar/eservices/Pages/ServiceDetails.aspx?sID=" + lead.crNumber, "0ea5e9")}"
          alt="QR السجل التجاري"
        />
        <div class="qr-caption" style="color:#0ea5e9;">السجل التجاري<br><span style="font-family:monospace;font-size:9px;">${lead.crNumber}</span></div>
      </div>` : ""}

      <!-- QR Google Maps (إذا وُجد رابط) -->
      ${lead.googleMapsUrl ? `
      <div class="qr-block">
        <img class="qr-img maps"
          src="${qrUrl(lead.googleMapsUrl, "eab308")}"
          alt="QR خرائط جوجل"
        />
        <div class="qr-caption" style="color:#eab308;">خرائط جوجل</div>
      </div>` : ""}

      <!-- QR الموقع الإلكتروني للعميل (إذا وُجد) -->
      ${lead.website ? `
      <div class="qr-block">
        <img class="qr-img"
          src="${qrUrl(lead.website, "8b5cf6")}"
          alt="QR موقع العميل"
        />
        <div class="qr-caption" style="color:#8b5cf6;">موقع العميل</div>
      </div>` : ""}

      <div class="qr-text">
        <div style="font-weight:700;color:#22c55e;font-size:11px;margin-bottom:3px;">${companyName}</div>
        ${company?.website ? `<div>${company.website}</div>` : "<div>maksab-ksa.com</div>"}
        ${company?.email ? `<div>${company.email}</div>` : ""}
        ${company?.phone ? `<div>${company.phone}</div>` : ""}
        ${company?.address ? `<div style="margin-top:3px;color:#1e293b;">${company.address}</div>` : ""}
        ${company?.reportFooterText ? `<div style="margin-top:3px;color:#1e293b;">${company.reportFooterText}</div>` : ""}
      </div>
    </div>
    <div style="text-align:left;">
      <div>تاريخ الإصدار: ${reportDate}</div>
      <div style="color:#22c55e33;font-size:9px;margin-top:3px;">حصري من ${companyName} — جميع الحقوق محفوظة</div>
    </div>
  </div>

</div><!-- /pw -->
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=960,height=840");
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
