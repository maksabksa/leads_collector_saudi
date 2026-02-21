import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import {
  ArrowRight, Globe, Instagram, Twitter, Phone, MapPin, Zap, BarChart3,
  AlertTriangle, TrendingUp, Target, Star, CheckCircle, XCircle, Loader2,
  Edit2, Save, X, ExternalLink, RefreshCw, MessageCircle, Send, Copy, ChevronDown, MessagesSquare
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

function ScoreBar({ label, value, color }: { label: string; value: number | null | undefined; color: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 240)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(value / 10) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  );
}

function ScoreCircle({ value, label }: { value: number | null | undefined; label: string }) {
  if (!value) return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center">
        <span className="text-xs text-muted-foreground">—</span>
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
  const color = value >= 7 ? "oklch(0.65 0.18 145)" : value >= 5 ? "oklch(0.78 0.16 75)" : "oklch(0.58 0.22 25)";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 font-bold text-lg" style={{ borderColor: color, color }}>
        {value.toFixed(0)}
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = Number(params.id);

  const { data, isLoading, refetch } = trpc.leads.getFullDetails.useQuery({ id });
  const analyzeWebsite = trpc.analysis.analyzeWebsite.useMutation();
  const analyzeSocial = trpc.analysis.analyzeSocial.useMutation();
  const generateReport = trpc.analysis.generateFullReport.useMutation();
  const updateLead = trpc.leads.update.useMutation();
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [report, setReport] = useState<any>(null);
  const [analyzingPlatform, setAnalyzingPlatform] = useState<string | null>(null);
  // WhatsApp state
  const [waStatus, setWaStatus] = useState<"unknown" | "yes" | "no">("unknown");
  const [waMessage, setWaMessage] = useState("");
  const [waGenerating, setWaGenerating] = useState(false);
  const [waTone, setWaTone] = useState<"formal" | "friendly" | "direct">("friendly");
  const checkWhatsapp = trpc.whatsapp.check.useMutation();
  const updateWaStatus = trpc.whatsapp.updateStatus.useMutation();
  const generateWaMessage = trpc.whatsapp.generateMessage.useMutation();
  const logWaMessage = trpc.whatsapp.logMessage.useMutation();
  const sendOneWa = trpc.wauto.sendOne.useMutation();
  const { data: allSessionsData } = trpc.wauto.allStatus.useQuery(undefined, { refetchInterval: 5000 });
  const [waSending, setWaSending] = useState(false);

  // أول حساب متصل
  const connectedSession = ((allSessionsData as any[]) ?? []).find((s: any) => s.status === "connected");
  const isWaConnected = !!connectedSession;

  const handleCheckWhatsapp = async () => {
    if (!lead.verifiedPhone) { toast.error("لا يوجد رقم هاتف لهذا العميل"); return; }
    // فتح wa.me للتحقق فقط (ليس للإرسال)
    const phone = lead.verifiedPhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
    toast.info("تم فتح واتساب للتحقق - حدد الحالة بعد التحقق");
  };

  const handleGenerateWaMessage = async () => {
    if (!lead.verifiedPhone) { toast.error("لا يوجد رقم هاتف"); return; }
    setWaGenerating(true);
    try {
      const result = await generateWaMessage.mutateAsync({
        leadId: id,
        companyName: lead.companyName,
        businessType: lead.businessType,
        city: lead.city,
        biggestGap: lead.biggestMarketingGap || undefined,
        salesAngle: lead.suggestedSalesEntryAngle || undefined,
        tone: waTone,
      });
      setWaMessage(result.message);
      toast.success("تم توليد الرسالة بالذكاء الاصطناعي");
    } catch { toast.error("فشل توليد الرسالة"); }
    finally { setWaGenerating(false); }
  };

  const handleSendWhatsapp = async () => {
    if (!lead.verifiedPhone || !waMessage) return;
    const phone = lead.verifiedPhone.replace(/[^0-9]/g, "");
    if (isWaConnected && connectedSession) {
      // إرسال عبر النظام الداخلي
      setWaSending(true);
      try {
        await sendOneWa.mutateAsync({
          phone,
          message: waMessage,
          leadId: id,
          accountId: connectedSession.accountId,
        });
        await logWaMessage.mutateAsync({ leadId: id, phone, message: waMessage, messageType: "individual" });
        toast.success("تم إرسال الرسالة عبر واتساب بنجاح");
        setWaMessage("");
      } catch (e: any) {
        toast.error("فشل الإرسال", { description: e.message });
      } finally {
        setWaSending(false);
      }
    } else {
      // لا يوجد اتصال - فتح wa.me كبديل
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
      window.open(waUrl, "_blank");
      await logWaMessage.mutateAsync({ leadId: id, phone, message: waMessage, messageType: "individual" });
      toast.info("تم فتح واتساب خارجياً (لا يوجد حساب متصل في النظام)");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <XCircle className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">العميل غير موجود</p>
        <button onClick={() => navigate("/leads")} className="text-sm px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-white/5">
          العودة للقائمة
        </button>
      </div>
    );
  }

  const { lead, websiteAnalysis, socialAnalyses } = data;

  const handleAnalyzeWebsite = async () => {
    if (!lead.website) { toast.error("لا يوجد موقع إلكتروني لهذا النشاط"); return; }
    setAnalyzingPlatform("website");
    try {
      await analyzeWebsite.mutateAsync({ leadId: id, url: lead.website, companyName: lead.companyName, businessType: lead.businessType });
      toast.success("تم تحليل الموقع بنجاح");
      utils.leads.getFullDetails.invalidate({ id });
      utils.leads.list.invalidate();
    } catch { toast.error("فشل تحليل الموقع"); }
    finally { setAnalyzingPlatform(null); }
  };

  const handleAnalyzeSocial = async (platform: "instagram" | "twitter" | "snapchat" | "tiktok" | "facebook", url: string) => {
    setAnalyzingPlatform(platform);
    try {
      await analyzeSocial.mutateAsync({ leadId: id, platform, profileUrl: url, companyName: lead.companyName, businessType: lead.businessType });
      toast.success(`تم تحليل ${platform} بنجاح`);
      utils.leads.getFullDetails.invalidate({ id });
    } catch { toast.error("فشل التحليل"); }
    finally { setAnalyzingPlatform(null); }
  };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport.mutateAsync({ leadId: id });
      setReport(result);
      toast.success("تم إنشاء التقرير الشامل");
    } catch { toast.error("فشل إنشاء التقرير"); }
  };

  const STAGE_OPTIONS = [
    { value: "new", label: "جديد", color: "oklch(0.65 0.05 240)" },
    { value: "contacted", label: "تم التواصل", color: "oklch(0.65 0.15 200)" },
    { value: "interested", label: "مهتم", color: "oklch(0.65 0.18 145)" },
    { value: "price_offer", label: "عرض سعر", color: "oklch(0.65 0.18 60)" },
    { value: "meeting", label: "اجتماع", color: "oklch(0.65 0.18 280)" },
    { value: "won", label: "عميل فعلي", color: "oklch(0.65 0.18 145)" },
    { value: "lost", label: "خسرناه", color: "oklch(0.55 0.18 25)" },
  ];

  const PRIORITY_OPTIONS = [
    { value: "high", label: "عالية", color: "oklch(0.65 0.18 25)" },
    { value: "medium", label: "متوسطة", color: "oklch(0.65 0.18 60)" },
    { value: "low", label: "منخفضة", color: "oklch(0.65 0.05 240)" },
  ];

  const handleEdit = () => {
    setEditForm({
      companyName: lead.companyName,
      businessType: lead.businessType,
      city: lead.city,
      district: lead.district || "",
      verifiedPhone: lead.verifiedPhone || "",
      website: lead.website || "",
      googleMapsUrl: lead.googleMapsUrl || "",
      instagramUrl: lead.instagramUrl || "",
      twitterUrl: lead.twitterUrl || "",
      notes: lead.notes || "",
      stage: (lead as any).stage || "new",
      priority: (lead as any).priority || "medium",
      nextStep: (lead as any).nextStep || "",
      nextFollowup: (lead as any).nextFollowup || undefined,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateLead.mutateAsync({ id, ...editForm });
    toast.success("تم التحديث");
    setIsEditing(false);
    utils.leads.getFullDetails.invalidate({ id });
  };

  const statusColors: Record<string, string> = {
    pending: "oklch(0.55 0.01 240)",
    analyzing: "oklch(0.85 0.16 75)",
    completed: "oklch(0.75 0.18 145)",
    failed: "oklch(0.7 0.22 25)",
  };

  const socialPlatforms = [
    { key: "instagram", label: "إنستغرام", url: lead.instagramUrl },
    { key: "twitter", label: "تويتر", url: lead.twitterUrl },
    { key: "snapchat", label: "سناب شات", url: lead.snapchatUrl },
    { key: "tiktok", label: "تيك توك", url: lead.tiktokUrl },
    { key: "facebook", label: "فيسبوك", url: lead.facebookUrl },
  ].filter(p => p.url);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/leads")} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground truncate">{lead.companyName}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "oklch(0.18 0.02 240)", color: statusColors[lead.analysisStatus] }}>
              {lead.analysisStatus === "completed" ? "مُحلَّل" : lead.analysisStatus === "analyzing" ? "جاري التحليل" : lead.analysisStatus === "failed" ? "فشل" : "معلق"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{lead.businessType} · {lead.city}{lead.district ? ` · ${lead.district}` : ""}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {(lead as any).stage && (() => {
              const stageColors: Record<string, string> = { new: "oklch(0.65 0.05 240)", contacted: "oklch(0.65 0.15 200)", interested: "oklch(0.65 0.18 145)", price_offer: "oklch(0.65 0.18 60)", meeting: "oklch(0.65 0.18 280)", won: "oklch(0.65 0.18 145)", lost: "oklch(0.55 0.18 25)" };
              const stageLabels: Record<string, string> = { new: "جديد", contacted: "تم التواصل", interested: "مهتم", price_offer: "عرض سعر", meeting: "اجتماع", won: "عميل فعلي", lost: "خسرناه" };
              const c = stageColors[(lead as any).stage] ?? "oklch(0.65 0.05 240)";
              return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklch, ${c} 15%, transparent)`, color: c, border: `1px solid color-mix(in oklch, ${c} 30%, transparent)` }}>• {stageLabels[(lead as any).stage] ?? (lead as any).stage}</span>;
            })()}
            {(lead as any).priority && (() => {
              const priorityColors: Record<string, string> = { high: "oklch(0.65 0.18 25)", medium: "oklch(0.65 0.18 60)", low: "oklch(0.65 0.05 240)" };
              const priorityLabels: Record<string, string> = { high: "أولوية عالية", medium: "أولوية متوسطة", low: "أولوية منخفضة" };
              const c = priorityColors[(lead as any).priority] ?? "oklch(0.65 0.05 240)";
              return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklch, ${c} 15%, transparent)`, color: c, border: `1px solid color-mix(in oklch, ${c} 30%, transparent)` }}>{priorityLabels[(lead as any).priority]}</span>;
            })()}
            {(lead as any).nextFollowup && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.18 0.02 240)", color: "oklch(0.65 0.05 240)" }}>
                ⏰ {new Date((lead as any).nextFollowup).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerateReport} disabled={generateReport.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "oklch(0.62 0.18 285 / 0.15)", color: "var(--brand-purple)", border: "1px solid oklch(0.62 0.18 285 / 0.3)" }}>
            {generateReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            تقرير شامل
          </button>
          <button onClick={handleEdit} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="rounded-2xl p-5 border space-y-4" style={{ background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.65 0.18 200 / 0.3)" }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">تعديل البيانات</h3>
            <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { field: "companyName", label: "اسم النشاط", type: "text" },
              { field: "verifiedPhone", label: "الهاتف", type: "text" },
              { field: "website", label: "الموقع", type: "text" },
              { field: "instagramUrl", label: "إنستغرام", type: "text" },
              { field: "twitterUrl", label: "تويتر", type: "text" },
              { field: "googleMapsUrl", label: "Google Maps", type: "text" },
            ].map(({ field, label }) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input value={editForm[field] || ""} onChange={e => setEditForm((f: any) => ({ ...f, [field]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary" />
              </div>
            ))}
          </div>
          {/* التصنيف */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground">التصنيف والمتابعة</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">مرحلة العميل</label>
              <div className="flex flex-wrap gap-2">
                {STAGE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setEditForm((f: any) => ({ ...f, stage: opt.value }))}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                    style={{ background: editForm.stage === opt.value ? `color-mix(in oklch, ${opt.color} 15%, transparent)` : "transparent", borderColor: editForm.stage === opt.value ? opt.color : "var(--border)", color: editForm.stage === opt.value ? opt.color : "var(--muted-foreground)" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الأولوية</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setEditForm((f: any) => ({ ...f, priority: opt.value }))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border"
                      style={{ background: editForm.priority === opt.value ? `color-mix(in oklch, ${opt.color} 15%, transparent)` : "transparent", borderColor: editForm.priority === opt.value ? opt.color : "var(--border)", color: editForm.priority === opt.value ? opt.color : "var(--muted-foreground)" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">موعد المتابعة</label>
                <input type="datetime-local" value={editForm.nextFollowup ? new Date(editForm.nextFollowup).toISOString().slice(0, 16) : ""}
                  onChange={e => setEditForm((f: any) => ({ ...f, nextFollowup: e.target.value ? new Date(e.target.value).getTime() : undefined }))}
                  className="w-full px-3 py-1.5 rounded-xl text-xs border border-border bg-background text-foreground focus:outline-none" dir="ltr" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">الخطوة التالية</label>
              <input value={editForm.nextStep || ""} onChange={e => setEditForm((f: any) => ({ ...f, nextStep: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none"
                placeholder="مثال: إرسال عرض سعر" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={updateLead.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "oklch(0.65 0.18 200)" }}>
              <Save className="w-4 h-4" />
              {updateLead.isPending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-white/5">إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left column - info */}
        <div className="col-span-1 space-y-4">
          {/* Contact card */}
          <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
            <h3 className="text-sm font-semibold text-foreground">معلومات الاتصال</h3>
            {lead.verifiedPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground font-mono">{lead.verifiedPhone}</span>
              </div>
            )}
            {lead.googleMapsUrl && (
              <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: "var(--brand-red)" }} />
                <span className="text-sm" style={{ color: "var(--brand-red)" }}>Google Maps</span>
                <ExternalLink className="w-3 h-3" style={{ color: "var(--brand-red)" }} />
              </a>
            )}
            {lead.reviewCount !== null && lead.reviewCount !== undefined && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{lead.reviewCount} تقييم</span>
              </div>
            )}
            {(lead as any).socialSince && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">ظهور على السوشيال منذ:</span>
                <span className="text-sm font-semibold" style={{ color: "var(--brand-cyan)" }}>{(lead as any).socialSince}</span>
              </div>
            )}
          </div>

          {/* WhatsApp Section */}
          <div className="rounded-2xl p-4 border space-y-3" style={{ background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.55 0.2 145 / 0.3)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.2 145)" }} />
              واتساب
            </h3>
            {!lead.verifiedPhone ? (
              <p className="text-xs text-muted-foreground">أضف رقم الهاتف أولاً لاستخدام واتساب</p>
            ) : (
              <>
                {/* WA status */}
                <div className="flex gap-1.5">
                  {(["yes", "no", "unknown"] as const).map(s => (
                    <button key={s} onClick={async () => { setWaStatus(s); await updateWaStatus.mutateAsync({ leadId: id, hasWhatsapp: s }); toast.success("تم تحديث الحالة"); }}
                      className="flex-1 py-1 rounded-lg text-xs transition-all"
                      style={waStatus === s ? { background: s === "yes" ? "oklch(0.55 0.2 145 / 0.3)" : s === "no" ? "oklch(0.58 0.22 25 / 0.3)" : "oklch(0.18 0.02 240)", color: s === "yes" ? "oklch(0.65 0.2 145)" : s === "no" ? "oklch(0.7 0.22 25)" : "oklch(0.6 0.01 240)", border: "1px solid currentColor" } : { background: "oklch(0.15 0.015 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                      {s === "yes" ? "✅ لديه" : s === "no" ? "❌ ليس لديه" : "❓ غير محدد"}
                    </button>
                  ))}
                </div>
                {/* حالة الاتصال */}
                <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs" style={isWaConnected ? { background: "oklch(0.55 0.2 145 / 0.1)", color: "oklch(0.65 0.2 145)", border: "1px solid oklch(0.55 0.2 145 / 0.2)" } : { background: "oklch(0.18 0.02 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: isWaConnected ? "oklch(0.65 0.2 145)" : "oklch(0.55 0.22 25)" }} />
                  {isWaConnected ? `متصل — الإرسال عبر النظام` : "غير متصل — سيفتح واتساب خارجياً"}
                </div>
                {/* زر فتح المحادثة في الشات الداخلي */}
                <button
                  onClick={() => navigate(`/chats?phone=${encodeURIComponent(lead.verifiedPhone || '')}&name=${encodeURIComponent((lead as any).businessName || lead.companyName || '')}`)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)", border: "1px solid oklch(0.55 0.2 145 / 0.3)" }}>
                  <MessagesSquare className="w-3 h-3" />
                  فتح المحادثة
                </button>
                {/* Open WA direct - للتحقق فقط */}
                <button onClick={handleCheckWhatsapp}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{ background: "oklch(0.15 0.015 240)", color: "oklch(0.55 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                  <MessageCircle className="w-3 h-3" />
                  فتح واتساب للتحقق فقط
                </button>
                {/* Message generator */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {(["friendly", "formal", "direct"] as const).map(t => (
                      <button key={t} onClick={() => setWaTone(t)}
                        className="flex-1 py-1 rounded-lg text-xs transition-all"
                        style={waTone === t ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.4)" } : { background: "oklch(0.15 0.015 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                        {t === "friendly" ? "ودي" : t === "formal" ? "رسمي" : "مباشر"}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleGenerateWaMessage} disabled={waGenerating}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "oklch(0.75 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                    {waGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    توليد رسالة بالذكاء الاصطناعي
                  </button>
                  {waMessage && (
                    <>
                      <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={5}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-border bg-background text-foreground resize-none focus:outline-none focus:border-primary" />
                      <div className="flex gap-1.5">
                        <button onClick={() => { navigator.clipboard.writeText(waMessage); toast.success("تم النسخ"); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs transition-all"
                          style={{ background: "oklch(0.15 0.015 240)", color: "oklch(0.6 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                          <Copy className="w-3 h-3" /> نسخ
                        </button>
                        <button onClick={handleSendWhatsapp} disabled={waSending}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{ background: "oklch(0.55 0.2 145)", color: "white", opacity: waSending ? 0.7 : 1 }}>
                          {waSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          {isWaConnected ? "إرسال عبر النظام" : "فتح واتساب"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Digital presence */}
          <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
            <h3 className="text-sm font-semibold text-foreground">الحضور الرقمي</h3>
            {lead.website ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: "var(--brand-cyan)" }} />
                  <span className="text-xs text-foreground truncate max-w-24">موقع إلكتروني</span>
                </div>
                <div className="flex items-center gap-1">
                  <a href={lead.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
                  <button onClick={handleAnalyzeWebsite} disabled={analyzingPlatform === "website"}
                    className="text-xs px-2 py-0.5 rounded-lg transition-all"
                    style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                    {analyzingPlatform === "website" ? <Loader2 className="w-3 h-3 animate-spin" /> : "حلّل"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا يوجد موقع إلكتروني</p>
            )}
            {socialPlatforms.map(p => {
              const existing = socialAnalyses.find(s => s.platform === p.key);
              return (
                <div key={p.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-foreground">{p.label}</span>
                    {existing && <span className="text-xs font-bold" style={{ color: "var(--brand-green)" }}>{existing.overallScore?.toFixed(1)}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={p.url!} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </a>
                    <button onClick={() => handleAnalyzeSocial(p.key as any, p.url!)} disabled={analyzingPlatform === p.key}
                      className="text-xs px-2 py-0.5 rounded-lg transition-all"
                      style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                      {analyzingPlatform === p.key ? <Loader2 className="w-3 h-3 animate-spin" /> : existing ? <RefreshCw className="w-3 h-3" /> : "حلّل"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scores summary */}
          {lead.leadPriorityScore && (
            <div className="rounded-2xl p-4 border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
              <h3 className="text-sm font-semibold text-foreground mb-3">درجات التقييم</h3>
              <div className="flex justify-around">
                <ScoreCircle value={lead.leadPriorityScore} label="الأولوية" />
                <ScoreCircle value={lead.brandingQualityScore} label="الجودة" />
                <ScoreCircle value={lead.seasonalReadinessScore} label="الموسمية" />
              </div>
            </div>
          )}
        </div>

        {/* Right column - analysis */}
        <div className="col-span-2 space-y-4">
          {/* Marketing gaps */}
          {(lead.biggestMarketingGap || lead.revenueOpportunity || lead.suggestedSalesEntryAngle) && (
            <div className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
                التحليل التسويقي
              </h3>
              {lead.biggestMarketingGap && (
                <div className="p-3 rounded-xl" style={{ background: "oklch(0.58 0.22 25 / 0.08)", border: "1px solid oklch(0.58 0.22 25 / 0.2)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--brand-red)" }}>أكبر ثغرة تسويقية</p>
                  <p className="text-sm text-foreground leading-relaxed">{lead.biggestMarketingGap}</p>
                </div>
              )}
              {lead.revenueOpportunity && (
                <div className="p-3 rounded-xl" style={{ background: "oklch(0.65 0.18 145 / 0.08)", border: "1px solid oklch(0.65 0.18 145 / 0.2)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--brand-green)" }}>فرصة الإيراد</p>
                  <p className="text-sm text-foreground leading-relaxed">{lead.revenueOpportunity}</p>
                </div>
              )}
              {lead.suggestedSalesEntryAngle && (
                <div className="p-3 rounded-xl" style={{ background: "oklch(0.65 0.18 200 / 0.08)", border: "1px solid oklch(0.65 0.18 200 / 0.2)" }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--brand-cyan)" }}>زاوية الدخول البيعية</p>
                  <p className="text-sm text-foreground leading-relaxed">{lead.suggestedSalesEntryAngle}</p>
                </div>
              )}
            </div>
          )}

          {/* Website analysis */}
          {websiteAnalysis && (
            <div className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: "var(--brand-cyan)" }} />
                  تحليل الموقع الإلكتروني
                </h3>
                <span className="text-lg font-bold" style={{ color: websiteAnalysis.overallScore && websiteAnalysis.overallScore >= 7 ? "var(--brand-green)" : websiteAnalysis.overallScore && websiteAnalysis.overallScore >= 5 ? "var(--brand-gold)" : "var(--brand-red)" }}>
                  {websiteAnalysis.overallScore?.toFixed(1)}/10
                </span>
              </div>
              {websiteAnalysis.summary && <p className="text-sm text-muted-foreground leading-relaxed">{websiteAnalysis.summary}</p>}
              <div className="space-y-2">
                <ScoreBar label="سرعة التحميل" value={websiteAnalysis.loadSpeedScore} color="oklch(0.65 0.18 200)" />
                <ScoreBar label="تجربة الجوال" value={websiteAnalysis.mobileExperienceScore} color="oklch(0.62 0.18 285)" />
                <ScoreBar label="SEO" value={websiteAnalysis.seoScore} color="oklch(0.78 0.16 75)" />
                <ScoreBar label="جودة المحتوى" value={websiteAnalysis.contentQualityScore} color="oklch(0.65 0.18 145)" />
                <ScoreBar label="التصميم" value={websiteAnalysis.designScore} color="oklch(0.72 0.18 200)" />
                <ScoreBar label="وضوح العروض" value={websiteAnalysis.offerClarityScore} color="oklch(0.7 0.22 25)" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "صفحة موسمية", value: websiteAnalysis.hasSeasonalPage },
                  { label: "حجز مسبق", value: websiteAnalysis.hasOnlineBooking },
                  { label: "خيارات دفع", value: websiteAnalysis.hasPaymentOptions },
                  { label: "معلومات توصيل", value: websiteAnalysis.hasDeliveryInfo },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    {value ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--brand-green)" }} /> : <XCircle className="w-3.5 h-3.5" style={{ color: "var(--brand-red)" }} />}
                    <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
              {(websiteAnalysis.technicalGaps as string[] | null)?.length ? (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--brand-red)" }}>الثغرات التقنية</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(websiteAnalysis.technicalGaps as string[]).map((gap, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.58 0.22 25 / 0.1)", color: "oklch(0.7 0.22 25)", border: "1px solid oklch(0.58 0.22 25 / 0.2)" }}>{gap}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {(websiteAnalysis.recommendations as string[] | null)?.length ? (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--brand-green)" }}>التوصيات</p>
                  <ul className="space-y-1">
                    {(websiteAnalysis.recommendations as string[]).map((rec, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--brand-green)", marginTop: "5px" }} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {/* Social analyses */}
          {socialAnalyses.length > 0 && socialAnalyses.map((sa) => (
            <div key={sa.id} className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Instagram className="w-4 h-4" style={{ color: "var(--brand-purple)" }} />
                  تحليل {sa.platform}
                </h3>
                <span className="text-lg font-bold" style={{ color: sa.overallScore && sa.overallScore >= 7 ? "var(--brand-green)" : sa.overallScore && sa.overallScore >= 5 ? "var(--brand-gold)" : "var(--brand-red)" }}>
                  {sa.overallScore?.toFixed(1)}/10
                </span>
              </div>
              {sa.summary && <p className="text-sm text-muted-foreground leading-relaxed">{sa.summary}</p>}
              <div className="space-y-2">
                <ScoreBar label="تكرار النشر" value={sa.postingFrequencyScore} color="oklch(0.62 0.18 285)" />
                <ScoreBar label="التفاعل" value={sa.engagementScore} color="oklch(0.65 0.18 200)" />
                <ScoreBar label="جودة المحتوى" value={sa.contentQualityScore} color="oklch(0.78 0.16 75)" />
                <ScoreBar label="استراتيجية المحتوى" value={sa.contentStrategyScore} color="oklch(0.65 0.18 145)" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "محتوى موسمي", value: sa.hasSeasonalContent },
                  { label: "وضوح الأسعار", value: sa.hasPricingContent },
                  { label: "Call To Action", value: sa.hasCallToAction },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    {value ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--brand-green)" }} /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--brand-red)" }} />}
                    <span className={value ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                  </div>
                ))}
              </div>
              {(sa.gaps as string[] | null)?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {(sa.gaps as string[]).map((gap, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.58 0.22 25 / 0.1)", color: "oklch(0.7 0.22 25)", border: "1px solid oklch(0.58 0.22 25 / 0.2)" }}>{gap}</span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {/* Full report */}
          {report && (
            <div className="rounded-2xl p-5 border space-y-4" style={{ background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.62 0.18 285 / 0.3)" }}>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "var(--brand-purple)" }} />
                التقرير الشامل
              </h3>
              {report.executiveSummary && (
                <p className="text-sm text-foreground leading-relaxed p-3 rounded-xl" style={{ background: "oklch(0.62 0.18 285 / 0.08)", border: "1px solid oklch(0.62 0.18 285 / 0.2)" }}>
                  {report.executiveSummary}
                </p>
              )}
              {report.criticalGaps?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--brand-red)" }}>الثغرات الحرجة</p>
                  <ul className="space-y-1">
                    {report.criticalGaps.map((g: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--brand-red)" }} />
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.immediateOpportunities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--brand-green)" }}>الفرص الفورية</p>
                  <ul className="space-y-1">
                    {report.immediateOpportunities.map((o: string, i: number) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <TrendingUp className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "var(--brand-green)" }} />
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {report.salesScript && (
                <div className="p-3 rounded-xl" style={{ background: "oklch(0.65 0.18 200 / 0.08)", border: "1px solid oklch(0.65 0.18 200 / 0.2)" }}>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--brand-cyan)" }}>
                    <Target className="w-3 h-3 inline ml-1" />
                    نص التواصل المقترح
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{report.salesScript}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state for analysis */}
          {!websiteAnalysis && socialAnalyses.length === 0 && !report && (
            <div className="rounded-2xl p-8 border border-border flex flex-col items-center gap-4" style={{ background: "oklch(0.12 0.015 240)" }}>
              <BarChart3 className="w-12 h-12 text-muted-foreground opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">لم يتم التحليل بعد</p>
                <p className="text-xs text-muted-foreground mt-1">استخدم أزرار التحليل في قسم الحضور الرقمي</p>
              </div>
              <button onClick={handleGenerateReport} disabled={generateReport.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.62 0.18 285 / 0.15)", color: "var(--brand-purple)", border: "1px solid oklch(0.62 0.18 285 / 0.3)" }}>
                {generateReport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                إنشاء تقرير شامل بالذكاء الاصطناعي
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
