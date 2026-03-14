import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getLeadById, getWebsiteAnalysisByLeadId, getSocialAnalysesByLeadId, getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { nanoid } from "nanoid";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

async function getCompanySettingsData() {
  try {
    const db = await getDb();
    if (!db) return null;
    const { companySettings } = await import("../../drizzle/schema");
    const [row] = await db.select().from(companySettings).limit(1);
    return row || null;
  } catch { return null; }
}

async function generatePDFBuffer(lead: any, websiteAnalysis: any, socialAnalyses: any[]): Promise<Buffer> {
  const company = await getCompanySettingsData();
  const html = buildPDFHtml(lead, websiteAnalysis, socialAnalyses, company);
  
  let executablePath: string;
  try {
    const { execSync } = await import("child_process");
    const sysChrome = execSync("which chromium-browser || which chromium || which google-chrome 2>/dev/null", { encoding: "utf8" }).trim().split("\n")[0];
    if (sysChrome) {
      executablePath = sysChrome;
    } else {
      executablePath = await chromium.executablePath();
    }
  } catch {
    executablePath = await chromium.executablePath();
  }

  const browser = await puppeteer.launch({
    executablePath,
    args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    headless: true,
    defaultViewport: { width: 1200, height: 900 },
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

// ===== Helper: حساب الفرص الضائعة بناءً على البيانات المتاحة =====
function computeMissedOpportunities(lead: any, websiteAnalysis: any, socialAnalyses: any[]) {
  const gaps: Array<{ icon: string; title: string; description: string; impact: string; solution: string; priority: "high" | "medium" | "low" }> = [];

  // 1. لا يوجد موقع إلكتروني
  if (!lead.website) {
    gaps.push({
      icon: "🌐",
      title: "غياب الموقع الإلكتروني",
      description: `${lead.companyName} لا يملك موقعاً إلكترونياً، مما يعني أن العملاء الذين يبحثون عبر Google لا يجدون أي معلومات موثوقة عن النشاط.`,
      impact: "خسارة تقديرية: 30-50% من العملاء المحتملين الذين يبحثون أونلاين",
      solution: "بناء موقع احترافي مع تحسين SEO يضع النشاط في أول نتائج البحث",
      priority: "high"
    });
  }

  // 2. ضعف SEO
  if (websiteAnalysis && websiteAnalysis.seoScore && Number(websiteAnalysis.seoScore) < 6) {
    gaps.push({
      icon: "🔍",
      title: "ضعف ظهور محركات البحث (SEO)",
      description: `درجة SEO للموقع ${Number(websiteAnalysis.seoScore).toFixed(1)}/10 - هذا يعني أن المنافسين يظهرون قبل ${lead.companyName} في نتائج البحث.`,
      impact: "خسارة تقديرية: 40-60% من الزيارات العضوية المجانية",
      solution: "تحسين SEO الفني والمحتوى لرفع الترتيب في Google",
      priority: "high"
    });
  }

  // 3. لا يوجد إنستغرام
  if (!lead.instagramUrl) {
    gaps.push({
      icon: "📸",
      title: "غياب الحضور على إنستغرام",
      description: `${lead.businessType || "النشاط"} في ${lead.city || "المملكة"} يعتمد بشكل كبير على إنستغرام للوصول للعملاء، خاصة الفئة العمرية 18-35.`,
      impact: "خسارة تقديرية: 25-40% من العملاء المحتملين في الفئة الشبابية",
      solution: "إنشاء حساب إنستغرام احترافي مع استراتيجية محتوى منتظمة",
      priority: "high"
    });
  }

  // 4. إنستغرام موجود لكن تفاعل ضعيف
  const instaSocial = socialAnalyses.find(s => s.platform?.toLowerCase().includes("instagram"));
  if (instaSocial && instaSocial.followersCount && Number(instaSocial.followersCount) < 1000) {
    gaps.push({
      icon: "📉",
      title: "ضعف التفاعل على إنستغرام",
      description: `عدد المتابعين ${Number(instaSocial.followersCount).toLocaleString("ar")} - وهو أقل من المتوسط في ${lead.city || "السوق"} لنشاط مماثل.`,
      impact: "محدودية الوصول العضوي وضعف الثقة الاجتماعية",
      solution: "استراتيجية نمو متكاملة: محتوى + تفاعل + إعلانات مستهدفة",
      priority: "medium"
    });
  }

  // 5. لا يوجد تيك توك
  if (!lead.tiktokUrl) {
    gaps.push({
      icon: "🎵",
      title: "غياب الحضور على تيك توك",
      description: `تيك توك أصبح المنصة الأولى للاكتشاف في السعودية، وغياب ${lead.companyName} يمنح المنافسين ميزة تنافسية كبيرة.`,
      impact: "خسارة فرصة الانتشار الفيروسي المجاني",
      solution: "إنشاء محتوى تيك توك قصير وجذاب يعكس هوية النشاط",
      priority: "medium"
    });
  }

  // 6. لا يوجد رقم هاتف موثق
  if (!lead.verifiedPhone) {
    gaps.push({
      icon: "📞",
      title: "غياب معلومات التواصل الموثقة",
      description: `عدم توفر رقم هاتف موثق يجعل العملاء المهتمين يتجهون للمنافسين الأسهل في التواصل.`,
      impact: "خسارة تقديرية: 20-35% من العملاء الجاهزين للشراء",
      solution: "توثيق بيانات التواصل وإضافتها لجميع المنصات الرقمية",
      priority: "high"
    });
  }

  // 7. لا يوجد سناب شات
  if (!lead.snapchatUrl) {
    gaps.push({
      icon: "👻",
      title: "غياب الحضور على سناب شات",
      description: `سناب شات يملك أعلى معدل استخدام في السعودية (90%+ من الشباب)، وغياب النشاط يعني فقدان شريحة ضخمة.`,
      impact: "خسارة الوصول للشريحة الأكثر إنفاقاً في السوق السعودي",
      solution: "إنشاء حساب سناب شات مع قصص يومية وإعلانات مستهدفة",
      priority: "medium"
    });
  }

  // 8. لا يوجد تقييمات Google
  if (!lead.googleMapsUrl) {
    gaps.push({
      icon: "⭐",
      title: "غياب التقييمات على Google Maps",
      description: `${lead.companyName} غير مسجل أو لا يملك تقييمات كافية على Google Maps، مما يضعف الثقة لدى العملاء الجدد.`,
      impact: "خسارة تقديرية: 45% من العملاء يتخذون قرارهم بناءً على التقييمات",
      solution: "تسجيل النشاط على Google Business وبناء استراتيجية تقييمات",
      priority: "high"
    });
  }

  // ترتيب حسب الأولوية
  return gaps.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  }).slice(0, 6); // أقصى 6 فرص
}

// ===== Helper: توليد ملخص ذكي للمؤشرات الفارغة =====
function computeSmartScores(lead: any, websiteAnalysis: any, socialAnalyses: any[]) {
  // حساب درجة الأولوية إذا لم تكن موجودة
  let priorityScore = lead.leadPriorityScore ? Number(lead.leadPriorityScore) : null;
  if (!priorityScore) {
    let score = 50; // أساس
    if (lead.verifiedPhone) score += 10;
    if (lead.website) score += 10;
    if (lead.instagramUrl) score += 8;
    if (lead.tiktokUrl) score += 5;
    if (lead.snapchatUrl) score += 5;
    if (lead.googleMapsUrl) score += 7;
    if (lead.twitterUrl) score += 5;
    priorityScore = Math.min(score, 95);
  }

  // حساب درجة جودة البيانات
  const dataFields = [lead.verifiedPhone, lead.website, lead.instagramUrl, lead.tiktokUrl, lead.snapchatUrl, lead.googleMapsUrl, lead.twitterUrl, lead.facebookUrl];
  const filledFields = dataFields.filter(Boolean).length;
  const dataQualityScore = Math.round((filledFields / dataFields.length) * 10 * 10) / 10;

  // حساب درجة التفاعل الاجتماعي
  let socialScore = 5.0;
  if (socialAnalyses.length > 0) {
    const scores = socialAnalyses.map(s => Number(s.engagementRate || 5)).filter(s => !isNaN(s));
    if (scores.length > 0) socialScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // مستوى الإلحاح
  const urgencyLevel = lead.urgencyLevel || (priorityScore >= 70 ? "high" : priorityScore >= 45 ? "medium" : "low");
  const urgencyLabels: Record<string, string> = { high: "عاجل", medium: "متوسط", low: "منخفض" };

  // تقييم الموقع
  const websiteScore = websiteAnalysis?.seoScore ? Number(websiteAnalysis.seoScore) : (lead.website ? 4.5 : 0);

  return {
    priorityScore: priorityScore.toFixed(1),
    dataQualityScore: dataQualityScore.toFixed(1),
    socialScore: socialScore.toFixed(1),
    websiteScore: websiteScore > 0 ? websiteScore.toFixed(1) : null,
    urgencyLevel,
    urgencyLabel: urgencyLabels[urgencyLevel] || "متوسط",
    platformsCount: dataFields.filter(Boolean).length,
  };
}

// ===== HTML Template for PDF - النسخة المحسّنة =====
function buildPDFHtml(lead: any, websiteAnalysis: any, socialAnalyses: any[], company?: any): string {
  const stageLabels: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", interested: "مهتم",
    price_offer: "عرض سعر", meeting: "اجتماع", won: "عميل فعلي", lost: "خسرناه",
  };
  const urgencyColors: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" };
  const now = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });

  const companyName = company?.companyName || "مكسب لخدمات الأعمال";
  const companyLogo = company?.logoUrl || "";
  const companyPhone = company?.phone || "";
  const companyEmail = company?.email || "info@maksab-ksa.com";
  const companyWebsite = company?.website || "maksab-ksa.com";
  const primaryColor = company?.primaryColor || "#1a56db";
  const secondaryColor = company?.secondaryColor || "#0e9f6e";
  const reportFooterText = company?.reportFooterText || `جميع الحقوق محفوظة لـ ${companyName} ${new Date().getFullYear()}`;

  // حساب المؤشرات الذكية
  const scores = computeSmartScores(lead, websiteAnalysis, socialAnalyses);
  // حساب الفرص الضائعة
  const missedOpps = computeMissedOpportunities(lead, websiteAnalysis, socialAnalyses);

  // بناء بطاقات السوشيال ميديا
  const socialRows = socialAnalyses.length > 0 ? socialAnalyses.map(s => `
    <div class="social-card">
      <div class="social-header">
        <span class="social-platform-name">${s.platform}</span>
        ${s.engagementRate ? `<span class="social-score" style="background:${Number(s.engagementRate) >= 7 ? '#dcfce7' : '#fef3c7'};color:${Number(s.engagementRate) >= 7 ? '#166534' : '#92400e'};">${Number(s.engagementRate).toFixed(1)}/10</span>` : ""}
      </div>
      <div class="social-stats">
        ${s.followersCount ? `<div class="stat-chip">👥 ${Number(s.followersCount).toLocaleString("ar")} متابع</div>` : ""}
        ${s.postsCount ? `<div class="stat-chip">📝 ${s.postsCount} منشور</div>` : ""}
        ${s.engagementRate ? `<div class="stat-chip">📊 ${s.engagementRate}% تفاعل</div>` : ""}
      </div>
      ${s.analysisText ? `<p class="social-analysis">${String(s.analysisText).substring(0, 180)}...</p>` : ""}
    </div>
  `).join("") : `
    <div class="empty-social">
      <div style="font-size:32px;margin-bottom:8px;">📊</div>
      <div style="font-size:13px;color:#64748b;font-weight:600;">لم يتم تحليل منصات التواصل بعد</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">اضغط على "تحليل العميل" لجلب بيانات المنصات</div>
    </div>
  `;

  // بناء بطاقات الفرص الضائعة
  const oppCards = missedOpps.map((opp, i) => `
    <div class="opp-card opp-${opp.priority}">
      <div class="opp-header">
        <span class="opp-icon">${opp.icon}</span>
        <div class="opp-title-wrap">
          <div class="opp-title">${opp.title}</div>
          <span class="opp-badge opp-badge-${opp.priority}">${opp.priority === 'high' ? 'أولوية عالية' : opp.priority === 'medium' ? 'أولوية متوسطة' : 'أولوية منخفضة'}</span>
        </div>
        <span class="opp-num">${i + 1}</span>
      </div>
      <p class="opp-desc">${opp.description}</p>
      <div class="opp-impact">
        <span class="impact-icon">⚠️</span>
        <span>${opp.impact}</span>
      </div>
      <div class="opp-solution">
        <span class="solution-icon">✅</span>
        <span><strong>الحل مع مكسب:</strong> ${opp.solution}</span>
      </div>
    </div>
  `).join("");

  // بناء قسم التوصيات
  const recommendations = [];
  if (!lead.website) recommendations.push({ title: "بناء موقع إلكتروني احترافي", desc: "موقع متكامل مع SEO يضعك في أول نتائج Google ويحوّل الزوار لعملاء", timeframe: "2-3 أسابيع", icon: "🌐" });
  if (!lead.instagramUrl || (instaSocial(socialAnalyses) && Number(instaSocial(socialAnalyses)?.followersCount || 0) < 1000)) recommendations.push({ title: "إدارة حسابات السوشيال ميديا", desc: "محتوى احترافي يومي على إنستغرام وتيك توك وسناب شات لبناء جمهور مخلص", timeframe: "شهري", icon: "📱" });
  if (!lead.verifiedPhone) recommendations.push({ title: "توثيق وتحسين بيانات التواصل", desc: "ضمان ظهور معلومات التواصل الصحيحة على جميع المنصات والخرائط", timeframe: "أسبوع واحد", icon: "📞" });
  recommendations.push({ title: "حملة إعلانية مستهدفة", desc: "إعلانات Google وسوشيال ميديا مستهدفة للوصول للعملاء المثاليين في " + (lead.city || "المنطقة"), timeframe: "فوري", icon: "🎯" });
  recommendations.push({ title: "تحسين التقييمات والسمعة الرقمية", desc: "استراتيجية منهجية لجمع تقييمات إيجابية وبناء ثقة العملاء الجدد", timeframe: "شهر واحد", icon: "⭐" });

  const recCards = recommendations.slice(0, 4).map((rec, i) => `
    <div class="rec-card">
      <div class="rec-num">${i + 1}</div>
      <div class="rec-icon">${rec.icon}</div>
      <div class="rec-content">
        <div class="rec-title">${rec.title}</div>
        <div class="rec-desc">${rec.desc}</div>
        <div class="rec-timeframe">⏱ ${rec.timeframe}</div>
      </div>
    </div>
  `).join("");

  // بناء قسم المنصات المتاحة
  const platforms = [
    { name: "إنستغرام", url: lead.instagramUrl, icon: "📸", color: "#e1306c" },
    { name: "تيك توك", url: lead.tiktokUrl, icon: "🎵", color: "#010101" },
    { name: "سناب شات", url: lead.snapchatUrl, icon: "👻", color: "#fffc00" },
    { name: "تويتر/X", url: lead.twitterUrl, icon: "🐦", color: "#1da1f2" },
    { name: "فيسبوك", url: lead.facebookUrl, icon: "👤", color: "#1877f2" },
    { name: "لينكدإن", url: lead.linkedinUrl, icon: "💼", color: "#0077b5" },
    { name: "Google Maps", url: lead.googleMapsUrl, icon: "📍", color: "#4285f4" },
    { name: "الموقع", url: lead.website, icon: "🌐", color: "#6366f1" },
  ];
  const activePlatforms = platforms.filter(p => p.url);
  const missingPlatforms = platforms.filter(p => !p.url);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
    direction: rtl;
    font-size: 13px;
    line-height: 1.6;
  }

  /* ===== الصفحة ===== */
  .page { width: 210mm; background: white; margin: 0 auto; position: relative; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }

  /* ===== الهيدر ===== */
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, ${primaryColor} 100%);
    color: white;
    padding: 28px 36px 20px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -40px; left: -40px;
    width: 200px; height: 200px;
    background: rgba(255,255,255,0.03);
    border-radius: 50%;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -60px; right: -20px;
    width: 250px; height: 250px;
    background: rgba(255,255,255,0.02);
    border-radius: 50%;
  }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 1; }
  .company-info { display: flex; align-items: center; gap: 14px; }
  .company-logo { width: 52px; height: 52px; object-fit: contain; border-radius: 10px; background: rgba(255,255,255,0.1); padding: 4px; }
  .company-name { font-size: 22px; font-weight: 800; margin-bottom: 3px; }
  .company-meta { font-size: 11px; opacity: 0.7; }
  .report-badge {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    padding: 10px 16px;
    text-align: center;
    font-size: 11px;
  }
  .report-badge strong { display: block; font-size: 13px; margin-bottom: 3px; }

  /* ===== شريط العميل ===== */
  .client-bar {
    background: #0a0f1e;
    padding: 10px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid ${primaryColor};
  }
  .client-name { font-size: 18px; font-weight: 800; color: white; }
  .client-meta { font-size: 11px; color: rgba(255,255,255,0.5); }

  /* ===== شريط المؤشرات ===== */
  .scores-row { display: flex; background: #0f172a; }
  .score-item { flex: 1; padding: 14px 10px; text-align: center; border-left: 1px solid rgba(255,255,255,0.06); }
  .score-item:last-child { border-left: none; }
  .score-value { font-size: 20px; font-weight: 800; color: ${secondaryColor}; }
  .score-label { font-size: 9px; color: rgba(255,255,255,0.45); margin-top: 2px; letter-spacing: 0.3px; }

  /* ===== المحتوى ===== */
  .body { padding: 24px 36px; }
  .section { margin-bottom: 22px; }
  .section-title {
    font-size: 13px; font-weight: 800; color: #0f172a;
    border-right: 4px solid ${primaryColor};
    padding: 6px 12px; margin-bottom: 14px;
    background: #f8fafc;
    border-radius: 0 8px 8px 0;
    display: flex; align-items: center; gap: 8px;
  }

  /* ===== شبكة المعلومات ===== */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 9px 12px; }
  .info-label { font-size: 9px; color: #94a3b8; margin-bottom: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-value { font-size: 12px; color: #1e293b; font-weight: 700; }
  .info-value a { color: ${primaryColor}; text-decoration: none; }

  /* ===== بطاقات التحليل ===== */
  .analysis-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
  .analysis-box-title { font-size: 10px; font-weight: 800; color: #0369a1; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
  .analysis-box p { font-size: 11px; color: #334155; line-height: 1.7; }
  .ice-box { background: #ecfdf5; border-color: #6ee7b7; }
  .ice-box .analysis-box-title { color: #065f46; }
  .ice-box p { color: #064e3b; font-weight: 600; }
  .sales-box { background: #fef3c7; border-color: #fbbf24; }
  .sales-box .analysis-box-title { color: #92400e; }
  .sales-box p { color: #78350f; font-weight: 600; }
  .gap-box { background: #fef2f2; border-color: #fca5a5; }
  .gap-box .analysis-box-title { color: #991b1b; }
  .gap-box p { color: #7f1d1d; }

  /* ===== المنصات ===== */
  .platforms-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .platform-chip {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 20px;
    font-size: 10px; font-weight: 700;
    border: 1px solid;
  }
  .platform-chip.active { background: #ecfdf5; border-color: #6ee7b7; color: #065f46; }
  .platform-chip.missing { background: #fef2f2; border-color: #fca5a5; color: #991b1b; opacity: 0.8; }

  /* ===== السوشيال ميديا ===== */
  .social-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .social-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
  .social-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .social-platform-name { font-size: 12px; font-weight: 800; color: #1e293b; text-transform: capitalize; }
  .social-score { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; }
  .social-stats { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 7px; }
  .stat-chip { font-size: 10px; background: #e2e8f0; padding: 2px 7px; border-radius: 10px; color: #475569; }
  .social-analysis { font-size: 10px; color: #64748b; line-height: 1.6; }
  .empty-social { text-align: center; padding: 24px; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1; }

  /* ===== الفرص الضائعة ===== */
  .opp-card {
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 10px;
    border-right: 4px solid;
    position: relative;
  }
  .opp-high { background: #fef2f2; border-color: #ef4444; }
  .opp-medium { background: #fffbeb; border-color: #f59e0b; }
  .opp-low { background: #f0fdf4; border-color: #22c55e; }
  .opp-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
  .opp-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
  .opp-title-wrap { flex: 1; }
  .opp-title { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
  .opp-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px; }
  .opp-badge-high { background: #fee2e2; color: #991b1b; }
  .opp-badge-medium { background: #fef3c7; color: #92400e; }
  .opp-badge-low { background: #dcfce7; color: #166534; }
  .opp-num { font-size: 22px; font-weight: 900; color: rgba(0,0,0,0.08); flex-shrink: 0; }
  .opp-desc { font-size: 11px; color: #334155; line-height: 1.7; margin-bottom: 8px; }
  .opp-impact { display: flex; align-items: flex-start; gap: 6px; font-size: 10px; color: #7f1d1d; background: rgba(239,68,68,0.08); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; }
  .opp-solution { display: flex; align-items: flex-start; gap: 6px; font-size: 10px; color: #065f46; background: rgba(34,197,94,0.08); padding: 6px 10px; border-radius: 6px; }
  .impact-icon, .solution-icon { flex-shrink: 0; }

  /* ===== التوصيات ===== */
  .rec-card {
    display: flex; align-items: flex-start; gap: 12px;
    background: white; border: 1px solid #e2e8f0;
    border-radius: 10px; padding: 14px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .rec-num { font-size: 28px; font-weight: 900; color: ${primaryColor}22; flex-shrink: 0; line-height: 1; width: 32px; }
  .rec-icon { font-size: 22px; flex-shrink: 0; }
  .rec-content { flex: 1; }
  .rec-title { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  .rec-desc { font-size: 11px; color: #475569; line-height: 1.6; margin-bottom: 6px; }
  .rec-timeframe { font-size: 10px; color: ${primaryColor}; font-weight: 700; }

  /* ===== CTA ===== */
  .cta-section {
    background: linear-gradient(135deg, #0f172a 0%, ${primaryColor} 100%);
    border-radius: 14px;
    padding: 28px 32px;
    text-align: center;
    color: white;
    margin-top: 20px;
  }
  .cta-title { font-size: 20px; font-weight: 900; margin-bottom: 8px; }
  .cta-subtitle { font-size: 12px; opacity: 0.8; margin-bottom: 20px; line-height: 1.7; }
  .cta-buttons { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
  .cta-btn {
    padding: 10px 20px; border-radius: 8px;
    font-size: 12px; font-weight: 700;
    text-decoration: none;
  }
  .cta-btn-primary { background: white; color: ${primaryColor}; }
  .cta-btn-secondary { background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); }

  /* ===== الفوتر ===== */
  .footer {
    background: #0f172a; color: rgba(255,255,255,0.45);
    padding: 12px 36px; display: flex; justify-content: space-between;
    align-items: center; font-size: 9px;
    border-top: 2px solid ${primaryColor}55;
  }
  .footer-brand { color: rgba(255,255,255,0.75); font-weight: 700; font-size: 11px; }
  .footer-watermark { font-size: 8px; opacity: 0.4; font-style: italic; }

  /* ===== الشبكة ===== */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .score-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
  .score-bar-label { font-size: 10px; color: #64748b; width: 110px; flex-shrink: 0; }
  .score-bar-track { flex: 1; height: 5px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor}); }
  .score-bar-value { font-size: 10px; font-weight: 700; color: #1e293b; width: 28px; text-align: left; }

  /* ===== الطباعة ===== */
  @media print {
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
  }
</style>
</head>
<body>

<!-- ===== الصفحة 1: الغلاف والملخص ===== -->
<div class="page">
  <div class="header">
    <div class="header-top">
      <div class="company-info">
        ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="شعار">` : `<div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;">🏢</div>`}
        <div>
          <div class="company-name">${companyName}</div>
          <div class="company-meta">${[companyPhone, companyEmail, companyWebsite].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
      <div class="report-badge">
        <strong>تقرير تحليل تسويقي</strong>
        ${now}
        <div style="font-size:9px;opacity:0.6;margin-top:3px;">حصري من مكسب</div>
      </div>
    </div>
  </div>

  <div class="client-bar">
    <div>
      <div class="client-name">${lead.companyName}</div>
      <div class="client-meta">${[lead.businessType, lead.city, lead.district].filter(Boolean).join(" · ")}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <div style="text-align:center;background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:8px;">
        <div style="font-size:16px;font-weight:800;color:${urgencyColors[scores.urgencyLevel]};">${scores.urgencyLabel}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);">مستوى الإلحاح</div>
      </div>
      <div style="text-align:center;background:rgba(255,255,255,0.05);padding:6px 12px;border-radius:8px;">
        <div style="font-size:16px;font-weight:800;color:#60a5fa;">${scores.platformsCount}/8</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.4);">منصة مفعّلة</div>
      </div>
    </div>
  </div>

  <div class="scores-row">
    <div class="score-item">
      <div class="score-value">${scores.priorityScore}</div>
      <div class="score-label">درجة الأولوية</div>
    </div>
    <div class="score-item">
      <div class="score-value">${scores.dataQualityScore}</div>
      <div class="score-label">جودة البيانات /10</div>
    </div>
    <div class="score-item">
      <div class="score-value">${scores.socialScore}</div>
      <div class="score-label">التفاعل الاجتماعي /10</div>
    </div>
    <div class="score-item">
      <div class="score-value" style="color:${scores.websiteScore ? '#60a5fa' : '#ef4444'};">${scores.websiteScore ? scores.websiteScore + '/10' : 'لا يوجد'}</div>
      <div class="score-label">تقييم الموقع</div>
    </div>
  </div>

  <div class="body">
    <!-- معلومات النشاط -->
    <div class="section">
      <div class="section-title">📋 معلومات النشاط التجاري</div>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">رقم الهاتف</div><div class="info-value">${lead.verifiedPhone || "غير متوفر"}</div></div>
        <div class="info-item"><div class="info-label">الموقع الإلكتروني</div><div class="info-value">${lead.website ? `<a href="${lead.website}">${lead.website}</a>` : "غير متوفر"}</div></div>
        <div class="info-item"><div class="info-label">مرحلة العميل</div><div class="info-value">${stageLabels[lead.stage] || lead.stage || "جديد"}</div></div>
        <div class="info-item"><div class="info-label">تاريخ الإضافة</div><div class="info-value">${lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("ar-SA") : now}</div></div>
      </div>
    </div>

    <!-- الحضور الرقمي -->
    <div class="section">
      <div class="section-title">🌐 الحضور الرقمي</div>
      <div style="margin-bottom:8px;font-size:11px;color:#64748b;">المنصات المفعّلة (${activePlatforms.length}/${platforms.length})</div>
      <div class="platforms-grid">
        ${activePlatforms.map(p => `<div class="platform-chip active">${p.icon} ${p.name}</div>`).join("")}
        ${missingPlatforms.map(p => `<div class="platform-chip missing">${p.icon} ${p.name} — غائب</div>`).join("")}
      </div>
    </div>

    <!-- التحليل الذكي إذا كان موجوداً -->
    ${(lead.iceBreaker || lead.salesEntryAngle || lead.marketingGapSummary || lead.primaryOpportunity) ? `
    <div class="section">
      <div class="section-title">🤖 التحليل الذكي</div>
      ${lead.iceBreaker ? `<div class="analysis-box ice-box"><div class="analysis-box-title">🎯 جملة كسر الجليد</div><p>${lead.iceBreaker}</p></div>` : ""}
      ${lead.salesEntryAngle ? `<div class="analysis-box sales-box"><div class="analysis-box-title">💡 زاوية الدخول البيعية</div><p>${lead.salesEntryAngle}</p></div>` : ""}
      ${lead.marketingGapSummary ? `<div class="analysis-box gap-box"><div class="analysis-box-title">📊 ملخص الفجوة التسويقية</div><p>${lead.marketingGapSummary}</p></div>` : ""}
      ${lead.primaryOpportunity ? `<div class="analysis-box"><div class="analysis-box-title">🚀 الفرصة الرئيسية</div><p>${lead.primaryOpportunity}</p></div>` : ""}
    </div>` : `
    <div class="section">
      <div class="section-title">🤖 التحليل الأولي</div>
      <div class="analysis-box">
        <div class="analysis-box-title">📊 ملاحظات أولية</div>
        <p>${lead.companyName} هو نشاط تجاري في قطاع ${lead.businessType || "الأعمال"} بمدينة ${lead.city || "الرياض"}. يملك النشاط حضوراً رقمياً ${activePlatforms.length > 4 ? 'متوسطاً' : 'محدوداً'} على ${activePlatforms.length} منصة من أصل ${platforms.length} منصة رئيسية. ${lead.verifiedPhone ? 'رقم الهاتف متوفر مما يسهل التواصل المباشر.' : 'لا يوجد رقم هاتف موثق مما يصعّب التواصل.'} ${lead.website ? 'يملك موقعاً إلكترونياً يحتاج لتقييم SEO.' : 'لا يوجد موقع إلكتروني وهو فرصة تسويقية كبيرة.'}</p>
      </div>
    </div>`}
  </div>

  <div class="footer">
    <div class="footer-brand">${companyName}</div>
    <div>${reportFooterText} · صفحة 1</div>
    <div class="footer-watermark">حصري من شركة مكسب · CONFIDENTIAL</div>
  </div>
</div>

<!-- ===== الصفحة 2: التحليل الرقمي التفصيلي ===== -->
<div class="page">
  <div class="header" style="padding:18px 36px;">
    <div class="header-top">
      <div class="company-info">
        ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="شعار" style="width:38px;height:38px;">` : ""}
        <div>
          <div style="font-size:16px;font-weight:800;">${companyName}</div>
          <div style="font-size:10px;opacity:0.6;">التحليل الرقمي التفصيلي</div>
        </div>
      </div>
      <div style="font-size:11px;opacity:0.7;">${lead.companyName} · ${now}</div>
    </div>
  </div>

  <div class="body">
    <!-- تحليل الموقع الإلكتروني -->
    <div class="section">
      <div class="section-title">🌐 تحليل الموقع الإلكتروني</div>
      ${websiteAnalysis ? `
        <div class="two-col" style="margin-bottom:14px;">
          <div>
            ${websiteAnalysis.seoScore ? `<div class="score-bar-row"><div class="score-bar-label">تحسين محركات البحث (SEO)</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(Number(websiteAnalysis.seoScore)/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.seoScore).toFixed(1)}</div></div>` : ""}
            ${websiteAnalysis.socialPresenceScore ? `<div class="score-bar-row"><div class="score-bar-label">الحضور الاجتماعي</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(Number(websiteAnalysis.socialPresenceScore)/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.socialPresenceScore).toFixed(1)}</div></div>` : ""}
            ${websiteAnalysis.contentQualityScore ? `<div class="score-bar-row"><div class="score-bar-label">جودة المحتوى</div><div class="score-bar-track"><div class="score-bar-fill" style="width:${(Number(websiteAnalysis.contentQualityScore)/10)*100}%"></div></div><div class="score-bar-value">${Number(websiteAnalysis.contentQualityScore).toFixed(1)}</div></div>` : ""}
          </div>
          <div>
            ${websiteAnalysis.analysisText ? `<div class="analysis-box" style="height:100%;"><div class="analysis-box-title">ملاحظات التحليل</div><p>${String(websiteAnalysis.analysisText).substring(0, 300)}</p></div>` : ""}
          </div>
        </div>
      ` : `
        <div style="background:#fef2f2;border:1px dashed #fca5a5;border-radius:10px;padding:18px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🌐</div>
          <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">${lead.website ? 'لم يتم تحليل الموقع بعد' : 'لا يوجد موقع إلكتروني'}</div>
          <div style="font-size:11px;color:#7f1d1d;">${lead.website ? `الموقع: ${lead.website} — اضغط "تحليل العميل" لجلب بيانات الموقع` : `غياب الموقع الإلكتروني يعني خسارة ${lead.businessType ? `عملاء ${lead.businessType}` : 'العملاء'} الذين يبحثون عبر Google`}</div>
        </div>
      `}
    </div>

    <!-- تحليل السوشيال ميديا -->
    <div class="section">
      <div class="section-title">📱 تحليل منصات التواصل الاجتماعي</div>
      ${socialAnalyses.length > 0 ? `<div class="social-grid">${socialRows}</div>` : `
        <div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:20px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">📊</div>
          <div style="font-size:13px;font-weight:700;color:#475569;margin-bottom:4px;">لم يتم تحليل منصات التواصل بعد</div>
          <div style="font-size:11px;color:#94a3b8;">اضغط على "تحليل العميل" في صفحة العميل لجلب بيانات المنصات تلقائياً</div>
          <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;flex-wrap:wrap;">
            ${activePlatforms.map(p => `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;">${p.icon} ${p.name}</div>`).join("")}
          </div>
        </div>
      `}
    </div>

    ${lead.notes ? `
    <div class="section">
      <div class="section-title">📝 ملاحظات</div>
      <div class="analysis-box"><p>${lead.notes}</p></div>
    </div>` : ""}
  </div>

  <div class="footer">
    <div class="footer-brand">${companyName}</div>
    <div>${reportFooterText} · صفحة 2</div>
    <div class="footer-watermark">حصري من شركة مكسب · CONFIDENTIAL</div>
  </div>
</div>

<!-- ===== الصفحة 3: الفرص الضائعة ===== -->
<div class="page">
  <div class="header" style="padding:18px 36px;">
    <div class="header-top">
      <div class="company-info">
        ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="شعار" style="width:38px;height:38px;">` : ""}
        <div>
          <div style="font-size:16px;font-weight:800;">${companyName}</div>
          <div style="font-size:10px;opacity:0.6;">الفرص الضائعة والتشخيص</div>
        </div>
      </div>
      <div style="font-size:11px;opacity:0.7;">${lead.companyName} · ${now}</div>
    </div>
  </div>

  <div class="body">
    <div class="section">
      <div class="section-title">⚠️ الفرص الضائعة — تشخيص شامل</div>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:11px;color:#92400e;line-height:1.7;">
        <strong>ملاحظة تشخيصية:</strong> بناءً على تحليل الحضور الرقمي لـ ${lead.companyName}، تم رصد ${missedOpps.length} فرصة ضائعة تؤثر مباشرة على قدرة النشاط في جذب العملاء. كل فرصة مصحوبة بتقدير للأثر التجاري وحل عملي يمكن تنفيذه مع مكسب.
      </div>
      ${missedOpps.length > 0 ? oppCards : `
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">✅</div>
          <div style="font-size:14px;font-weight:700;color:#166534;">الحضور الرقمي جيد نسبياً</div>
          <div style="font-size:11px;color:#15803d;margin-top:4px;">لم يتم رصد فرص ضائعة جوهرية — التركيز على التحسين المستمر</div>
        </div>
      `}
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">${companyName}</div>
    <div>${reportFooterText} · صفحة 3</div>
    <div class="footer-watermark">حصري من شركة مكسب · CONFIDENTIAL</div>
  </div>
</div>

<!-- ===== الصفحة 4: التوصيات والخطوات التالية ===== -->
<div class="page">
  <div class="header" style="padding:18px 36px;">
    <div class="header-top">
      <div class="company-info">
        ${companyLogo ? `<img src="${companyLogo}" class="company-logo" alt="شعار" style="width:38px;height:38px;">` : ""}
        <div>
          <div style="font-size:16px;font-weight:800;">${companyName}</div>
          <div style="font-size:10px;opacity:0.6;">التوصيات والخطوات التالية</div>
        </div>
      </div>
      <div style="font-size:11px;opacity:0.7;">${lead.companyName} · ${now}</div>
    </div>
  </div>

  <div class="body">
    <div class="section">
      <div class="section-title">🎯 التوصيات الاستراتيجية</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:14px;">خطة عمل مقترحة مرتبة حسب الأولوية والأثر التجاري المتوقع</div>
      ${recCards}
    </div>

    <!-- CTA -->
    <div class="cta-section">
      <div class="cta-title">هل أنت مستعد للارتقاء بـ ${lead.companyName}؟</div>
      <div class="cta-subtitle">
        فريق مكسب متخصص في تحويل الفرص الضائعة إلى نتائج قابلة للقياس.<br>
        احصل على استشارة مجانية وخطة عمل تسويقية مخصصة لنشاطك.
      </div>
      <div class="cta-buttons">
        <a href="https://${companyWebsite}" class="cta-btn cta-btn-primary">🌐 ${companyWebsite}</a>
        ${companyEmail ? `<a href="mailto:${companyEmail}" class="cta-btn cta-btn-secondary">✉️ ${companyEmail}</a>` : ""}
        ${companyPhone ? `<a href="tel:${companyPhone}" class="cta-btn cta-btn-secondary">📞 ${companyPhone}</a>` : ""}
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">${companyName}</div>
    <div>${reportFooterText} · صفحة 4</div>
    <div class="footer-watermark">حصري من شركة مكسب · CONFIDENTIAL</div>
  </div>
</div>

</body>
</html>`;
}

// Helper لإيجاد تحليل إنستغرام
function instaSocial(socialAnalyses: any[]) {
  return socialAnalyses.find(s => s.platform?.toLowerCase().includes("instagram")) || null;
}

export const reportRouter = router({
  generatePDF: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      const websiteAnalysis = await getWebsiteAnalysisByLeadId(input.leadId);
      const socialAnalyses = await getSocialAnalysesByLeadId(input.leadId);

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generatePDFBuffer(lead, websiteAnalysis, socialAnalyses);
      } catch (err: any) {
        console.error("[PDF] error:", err.message);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل توليد PDF: ${err.message}` });
      }

      const fileKey = `reports/${input.leadId}-${nanoid(8)}.pdf`;
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      return { success: true, leadId: input.leadId, url, filename: `تحليل مخصص لعناية ${lead.companyName}.pdf` };
    }),

  generateAndSendViaWhatsApp: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async () => {
      return { success: false, message: "ميزة إرسال PDF عبر واتساب غير متاحة حالياً" };
    }),

  generateSummary: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت مساعد مبيعات خبير. قدم ملخصاً احترافياً للعميل." },
          { role: "user", content: `قدم ملخصاً مختصراً لهذا العميل:\nالشركة: ${lead.companyName}\nالنشاط: ${lead.businessType}\nالمدينة: ${lead.city}\nالمرحلة: ${lead.stage}` },
        ],
      });
      return { summary: response.choices[0]?.message?.content || "لا يمكن إنشاء الملخص حالياً" };
    }),

  getEmployeePerformance: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return [];
      const { users } = await import("../../drizzle/schema");
      const allUsers = await db.select({ id: users.id, name: users.name, displayName: users.displayName }).from(users).limit(20);
      return allUsers.map(u => ({ id: u.id, name: u.displayName || u.name, totalChats: 0, closeRate: 0, performanceScore: 0 }));
    }),
});
