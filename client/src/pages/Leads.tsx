import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import {
  Plus, Search, Filter, Download, Trash2, Eye, Globe, Instagram, Phone,
  MapPin, ChevronDown, Layers, CheckSquare, Square, MessageCircle, Zap,
  Send, X, Loader2, CheckCircle2, XCircle, Pause, Play, Sparkles, Upload,
} from "lucide-react";
import BulkImport from "./BulkImport";
import { BulkImportInline } from "./BulkImport";
import { toast } from "sonner";
import { COUNTRIES_DATA } from "../../../shared/countries";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const statusColors: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "oklch(0.55 0.01 240)", bg: "oklch(0.18 0.02 240)", label: "معلق" },
  analyzing: { color: "oklch(0.85 0.16 75)", bg: "oklch(0.78 0.16 75 / 0.15)", label: "جاري التحليل" },
  completed: { color: "oklch(0.75 0.18 145)", bg: "oklch(0.65 0.18 145 / 0.15)", label: "مُحلَّل" },
  failed: { color: "oklch(0.7 0.22 25)", bg: "oklch(0.58 0.22 25 / 0.15)", label: "فشل" },
};

type BulkWaMsg = {
  leadId: number;
  companyName: string;
  phone: string;
  message: string;
  status: "pending" | "sent" | "failed" | "skipped";
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterZone, setFilterZone] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterWhatsapp, setFilterWhatsapp] = useState<"" | "yes" | "no" | "unknown">("")
  const [filterStage, setFilterStage] = useState("")
  const [filterPriority, setFilterPriority] = useState("");
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [targetSegmentId, setTargetSegmentId] = useState<string>("");
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // === Bulk WhatsApp Send State ===
  const [showBulkWaDialog, setShowBulkWaDialog] = useState(false);
  const [bulkWaStep, setBulkWaStep] = useState<"config" | "preview" | "sending" | "done">("config");
  const [bulkWaTemplateId, setBulkWaTemplateId] = useState<number | null>(null);
  const [bulkWaAccountId, setBulkWaAccountId] = useState<string>("default");
  const [bulkWaDelayMs, setBulkWaDelayMs] = useState<number>(10000);
  const [bulkWaSenderName, setBulkWaSenderName] = useState("");
  const [bulkWaSenderCompany, setBulkWaSenderCompany] = useState("");
  const [bulkWaMessages, setBulkWaMessages] = useState<BulkWaMsg[]>([]);
  const [bulkWaCurrentIdx, setBulkWaCurrentIdx] = useState(0);
  const [bulkWaRunning, setBulkWaRunning] = useState(false);
  const [bulkWaGenerating, setBulkWaGenerating] = useState(false);
  const [bulkWaUseAI, setBulkWaUseAI] = useState(false);
  const [bulkWaAiTone, setBulkWaAiTone] = useState<"formal" | "friendly" | "direct">("friendly");
  const bulkWaStopRef = useRef(false);

  const availableFilterCities = filterCountry
    ? (COUNTRIES_DATA.find(c => c.name === filterCountry)?.cities ?? [])
    : [];

  const { data: leads, isLoading } = trpc.leads.list.useQuery({
    search: search || undefined,
    city: filterCity || undefined,
    analysisStatus: filterStatus || undefined,
    zoneId: filterZone,
    hasWhatsapp: filterWhatsapp || undefined,
    stage: (filterStage || undefined) as "new" | "contacted" | "interested" | "price_offer" | "meeting" | "won" | "lost" | undefined,
    priority: (filterPriority || undefined) as "high" | "medium" | "low" | undefined,
  });
  const { data: zones } = trpc.zones.list.useQuery();
  const { data: segmentsList } = trpc.segments.list.useQuery();
  const { data: waTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const { data: waAccounts } = trpc.waAccounts.listAccounts.useQuery();
  const { data: waAllStatus } = trpc.wauto.allStatus.useQuery();

  const deleteLead = trpc.leads.delete.useMutation();
  const bulkDelete = trpc.leads.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ تم حذف ${data.deleted} عميل بنجاح`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
    },
    onError: (e) => toast.error("فشل الحذف: " + e.message),
  });
  const exportCSV = trpc.export.exportCSV.useMutation();
  const bulkAnalyze = trpc.analysis.bulkAnalyze.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إرسال ${data.queued} عميل للتحليل في الخلفية`);
      setSelectedIds(new Set());
      setTimeout(() => utils.leads.list.invalidate(), 2000);
    },
    onError: (e) => toast.error("فشل التحليل: " + e.message),
  });
  const addToSegment = trpc.segments.addLeads.useMutation({
    onSuccess: (data) => {
      toast.success(`تمت إضافة ${data.added} عميل للشريحة`);
      setShowSegmentDialog(false);
      setSelectedIds(new Set());
      setTargetSegmentId("");
    },
    onError: (e) => toast.error(e.message),
  });
  const bulkApplyTemplate = trpc.whatsapp.bulkApplyTemplate.useMutation();
  const bulkGenerate = trpc.whatsapp.bulkGenerate.useMutation();
  const sendOne = trpc.wauto.sendOne.useMutation();
  const logMessage = trpc.whatsapp.logMessage.useMutation();
  const utils = trpc.useUtils();

  // حساب الحسابات المتصلة
  const connectedAccounts = useMemo(() => {
    if (!waAccounts || !waAllStatus) return [];
    return waAccounts.filter(acc => {
      const status = waAllStatus.find((s: any) => s.accountId === acc.accountId);
      return status?.status === "connected";
    });
  }, [waAccounts, waAllStatus]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    await deleteLead.mutateAsync({ id });
    toast.success("تم حذف العميل");
    utils.leads.list.invalidate();
    utils.leads.stats.invalidate();
  };

  const handleExport = async () => {
    toast.info("جاري تجهيز البيانات مع التحليل...");
    const result = await exportCSV.mutateAsync({ city: filterCity || undefined, analysisStatus: filterStatus || undefined, includeAnalysis: true });
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_مع_تحليل_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`✅ تم تصدير ${result.count} سجل بالتحليل الكامل في صف واحد`);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!leads) return;
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleAddToSegment = async () => {
    if (!targetSegmentId || selectedIds.size === 0) return;
    await addToSegment.mutateAsync({
      segmentId: Number(targetSegmentId),
      leadIds: Array.from(selectedIds),
    });
  };

  // === Bulk WhatsApp Logic ===
  const openBulkWaDialog = () => {
    // فلترة العملاء المحددين الذين لديهم واتساب فعّال أو رقم هاتف
    setBulkWaStep("config");
    setBulkWaMessages([]);
    setBulkWaCurrentIdx(0);
    setBulkWaRunning(false);
    bulkWaStopRef.current = false;
    setShowBulkWaDialog(true);
  };

  const handleGenerateMessages = async () => {
    if (!bulkWaUseAI && !bulkWaTemplateId) {
      toast.error("اختر قالباً أو فعّل التوليد بالذكاء الاصطناعي");
      return;
    }
    setBulkWaGenerating(true);
    try {
      let results: Array<{ leadId: number; companyName: string; phone: string; message: string; waUrl: string }> = [];
      if (bulkWaUseAI) {
        const res = await bulkGenerate.mutateAsync({
          leadIds: Array.from(selectedIds),
          tone: bulkWaAiTone,
        });
        results = res.results;
      } else {
        const res = await bulkApplyTemplate.mutateAsync({
          templateId: bulkWaTemplateId!,
          leadIds: Array.from(selectedIds),
          senderName: bulkWaSenderName || undefined,
          senderCompany: bulkWaSenderCompany || undefined,
        });
        results = res.results;
      }
      if (results.length === 0) {
        toast.error("لا يوجد عملاء بأرقام هاتف صالحة من المحددين");
        return;
      }
      setBulkWaMessages(results.map(r => ({ ...r, status: "pending" as const })));
      setBulkWaStep("preview");
      toast.success(`تم توليد ${results.length} رسالة`);
    } catch (e: any) {
      toast.error("فشل التوليد: " + e.message);
    } finally {
      setBulkWaGenerating(false);
    }
  };

  const handleStartSending = async () => {
    if (bulkWaMessages.length === 0) return;
    setBulkWaStep("sending");
    setBulkWaRunning(true);
    bulkWaStopRef.current = false;
    let idx = bulkWaMessages.findIndex(m => m.status === "pending");
    while (idx !== -1 && !bulkWaStopRef.current) {
      setBulkWaCurrentIdx(idx);
      const msg = bulkWaMessages[idx];
      try {
        await sendOne.mutateAsync({
          phone: msg.phone,
          message: msg.message,
          leadId: msg.leadId,
          accountId: bulkWaAccountId,
        });
        setBulkWaMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: "sent" } : m));
        // تسجيل الرسالة
        try {
          await logMessage.mutateAsync({
            leadId: msg.leadId,
            phone: msg.phone,
            message: msg.message,
            messageType: "bulk",
          });
        } catch { /* تجاهل خطأ التسجيل */ }
      } catch {
        setBulkWaMessages(prev => prev.map((m, i) => i === idx ? { ...m, status: "failed" } : m));
      }
      // تأخير بين الرسائل
      if (!bulkWaStopRef.current) {
        await new Promise(res => setTimeout(res, bulkWaDelayMs));
      }
      idx = bulkWaMessages.findIndex((m, i) => i > idx && m.status === "pending");
    }
    setBulkWaRunning(false);
    if (!bulkWaStopRef.current) {
      setBulkWaStep("done");
      const sentCount = bulkWaMessages.filter(m => m.status === "sent").length;
      toast.success(`✅ تم إرسال ${sentCount} رسالة بنجاح`);
    }
  };

  const handlePauseSending = () => {
    bulkWaStopRef.current = true;
    setBulkWaRunning(false);
    toast.info("تم إيقاف الإرسال مؤقتاً");
  };

  const handleResumeSending = () => {
    bulkWaStopRef.current = false;
    setBulkWaRunning(true);
    handleStartSending();
  };

  const closeBulkWaDialog = () => {
    if (bulkWaRunning) {
      bulkWaStopRef.current = true;
      setBulkWaRunning(false);
    }
    setShowBulkWaDialog(false);
  };

  // إحصائيات الإرسال
  const sentCount = bulkWaMessages.filter(m => m.status === "sent").length;
  const failedCount = bulkWaMessages.filter(m => m.status === "failed").length;
  const pendingCount = bulkWaMessages.filter(m => m.status === "pending").length;
  const progressPct = bulkWaMessages.length > 0
    ? Math.round(((sentCount + failedCount) / bulkWaMessages.length) * 100)
    : 0;

  // العملاء المحددون الذين لديهم واتساب فعّال
  const selectedWithWhatsapp = useMemo(() => {
    if (!leads) return 0;
    return leads.filter(l => selectedIds.has(l.id) && l.hasWhatsapp === "yes").length;
  }, [leads, selectedIds]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">قائمة العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads?.length ?? 0} عميل مسجل</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {selectedIds.size > 0 && (
            <>
              <button
                onClick={() => bulkAnalyze.mutate({ leadIds: Array.from(selectedIds) })}
                disabled={bulkAnalyze.isPending}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.85 0.16 75 / 0.15)", color: "oklch(0.85 0.16 75)", border: "1px solid oklch(0.85 0.16 75 / 0.3)" }}
              >
                <Zap className="w-4 h-4" />
                {bulkAnalyze.isPending ? "جاري التحليل..." : `تحليل ${selectedIds.size} عميل`}
              </button>
              <button
                onClick={openBulkWaDialog}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.65 0.18 145 / 0.15)", color: "oklch(0.75 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.3)" }}
              >
                <MessageCircle className="w-4 h-4" />
                إرسال واتساب
                {selectedWithWhatsapp > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: "oklch(0.65 0.18 145 / 0.3)" }}>
                    {selectedWithWhatsapp} فعّال
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSegmentDialog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}
              >
                <Layers className="w-4 h-4" />
                إضافة {selectedIds.size} للشريحة
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.58 0.22 25 / 0.15)", color: "oklch(0.7 0.22 25)", border: "1px solid oklch(0.58 0.22 25 / 0.3)" }}
              >
                <Trash2 className="w-4 h-4" />
                حذف {selectedIds.size} عميل
              </button>
            </>
          )}
          <button
            onClick={handleExport}
            disabled={exportCSV.isPending || !leads?.length}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "oklch(0.65 0.18 145 / 0.1)", color: "var(--brand-green)", border: "1px solid oklch(0.65 0.18 145 / 0.25)" }}
          >
            <Download className="w-4 h-4" />
            تصدير CSV
          </button>
          <button
            onClick={() => setShowBulkImportDialog(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "oklch(0.65 0.18 75 / 0.1)", color: "oklch(0.85 0.16 75)", border: "1px solid oklch(0.65 0.18 75 / 0.25)" }}
          >
            <Upload className="w-4 h-4" />
            رفع جماعي
          </button>
          <Link href="/leads/add">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.15 200))" }}>
              <Plus className="w-4 h-4" />
              إضافة Lead
            </button>
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث باسم النشاط..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl text-sm border border-border bg-card text-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${showFilters ? "text-white" : "text-muted-foreground border border-border hover:bg-white/5"}`}
            style={showFilters ? { background: "oklch(0.65 0.18 200)" } : {}}
          >
            <Filter className="w-4 h-4" />
            فلترة
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الدولة</label>
              <select value={filterCountry} onChange={e => { setFilterCountry(e.target.value); setFilterCity(""); }}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">كل الدول</option>
                {COUNTRIES_DATA.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المدينة</label>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">كل المدن</option>
                {availableFilterCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حالة التحليل</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                <option value="pending">معلق</option>
                <option value="analyzing">جاري التحليل</option>
                <option value="completed">مُحلَّل</option>
                <option value="failed">فشل</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المنطقة</label>
              <select value={filterZone ?? ""} onChange={e => setFilterZone(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                {zones?.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">واتساب</label>
              <select value={filterWhatsapp} onChange={e => setFilterWhatsapp(e.target.value as "" | "yes" | "no" | "unknown")}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                <option value="yes">✅ واتساب فعّال</option>
                <option value="no">❌ ليس لديه واتساب</option>
                <option value="unknown">❓ غير محدد</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">مرحلة العميل</label>
              <select value={filterStage} onChange={e => setFilterStage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                <option value="new">جديد</option>
                <option value="contacted">تم التواصل</option>
                <option value="interested">مهتم</option>
                <option value="price_offer">عرض سعر</option>
                <option value="meeting">اجتماع</option>
                <option value="won">عميل فعلي</option>
                <option value="lost">خسرناه</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الأولوية</label>
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                <option value="high">عالية</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {leads && leads.length > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-border text-sm" style={{ background: "oklch(0.12 0.015 240)" }}>
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            {selectedIds.size === leads.length && leads.length > 0
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />}
            تحديد الكل
          </button>
          {selectedIds.size > 0 && (
            <span className="text-muted-foreground">
              — تم تحديد <span className="text-foreground font-medium">{selectedIds.size}</span> عميل
              {selectedWithWhatsapp > 0 && (
                <span className="mr-2" style={{ color: "oklch(0.75 0.18 145)" }}>
                  ({selectedWithWhatsapp} واتساب فعّال)
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Leads table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse border border-border" style={{ background: "oklch(0.12 0.015 240)" }} />
          ))}
        </div>
      ) : (leads?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Search className="w-16 h-16 text-muted-foreground opacity-20" />
          <p className="text-muted-foreground">لا توجد نتائج</p>
          <Link href="/leads/add">
            <button className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
              أضف أول Lead
            </button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "oklch(0.12 0.015 240)" }}>
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border text-xs text-muted-foreground font-medium">
            <div className="col-span-1 flex items-center justify-center">
              <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                {selectedIds.size === (leads?.length ?? 0) && (leads?.length ?? 0) > 0
                  ? <CheckSquare className="w-4 h-4 text-primary" />
                  : <Square className="w-4 h-4" />}
              </button>
            </div>
            <div className="col-span-3">النشاط</div>
            <div className="col-span-2">المدينة / المنطقة</div>
            <div className="col-span-2">الاتصال</div>
            <div className="col-span-2">الحضور الرقمي</div>
            <div className="col-span-1">الأولوية</div>
            <div className="col-span-1 text-center">إجراء</div>
          </div>
          {/* Table rows */}
          <div className="divide-y divide-border">
            {leads?.map((lead) => {
              const statusInfo = statusColors[lead.analysisStatus];
              const isSelected = selectedIds.has(lead.id);
              return (
                <div
                  key={lead.id}
                  className={`grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-white/3 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
                >
                  {/* Checkbox */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button onClick={() => toggleSelect(lead.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Name & type */}
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                      style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)" }}>
                      {lead.companyName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.companyName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground truncate">{lead.businessType}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
                        {(lead as any).stage && (lead as any).stage !== "new" && (() => {
                          const stageColors: Record<string, string> = { contacted: "oklch(0.65 0.15 200)", interested: "oklch(0.65 0.18 145)", price_offer: "oklch(0.65 0.18 60)", meeting: "oklch(0.65 0.18 280)", won: "oklch(0.65 0.18 145)", lost: "oklch(0.55 0.18 25)" };
                          const stageLabels: Record<string, string> = { contacted: "تم التواصل", interested: "مهتم", price_offer: "عرض سعر", meeting: "اجتماع", won: "عميل فعلي", lost: "خسرناه" };
                          const c = stageColors[(lead as any).stage] ?? "oklch(0.65 0.05 240)";
                          return <span key="stage" className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `color-mix(in oklch, ${c} 15%, transparent)`, color: c }}>{stageLabels[(lead as any).stage] ?? (lead as any).stage}</span>;
                        })()}
                        {(lead as any).priority === "high" && <span key="priority" className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.18 25 / 0.15)", color: "oklch(0.65 0.18 25)" }}>أولوية عالية</span>}
                      </div>
                    </div>
                  </div>
                  {/* City / Zone */}
                  <div className="col-span-2">
                    <p className="text-sm text-foreground">{lead.city}</p>
                    {lead.zoneName && <p className="text-xs text-muted-foreground truncate">{lead.zoneName}</p>}
                  </div>
                  {/* Contact */}
                  <div className="col-span-2">
                    {lead.verifiedPhone ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-foreground font-mono">{lead.verifiedPhone}</span>
                        </div>
                        {lead.hasWhatsapp === "yes" && (
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" style={{ color: "oklch(0.75 0.18 145)" }} />
                            <span className="text-xs font-medium" style={{ color: "oklch(0.75 0.18 145)" }}>واتساب فعّال</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">لا يوجد</span>
                    )}
                  </div>
                  {/* Digital presence */}
                  <div className="col-span-2 flex items-center gap-2">
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <Globe className="w-4 h-4 transition-colors" style={{ color: "var(--brand-cyan)" }} />
                      </a>
                    )}
                    {lead.instagramUrl && (
                      <a href={lead.instagramUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <Instagram className="w-4 h-4 transition-colors" style={{ color: "var(--brand-purple)" }} />
                      </a>
                    )}
                    {lead.googleMapsUrl && (
                      <a href={lead.googleMapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <MapPin className="w-4 h-4 transition-colors" style={{ color: "var(--brand-red)" }} />
                      </a>
                    )}
                    {!lead.website && !lead.instagramUrl && !lead.googleMapsUrl && (
                      <span className="text-xs text-muted-foreground">لا يوجد</span>
                    )}
                  </div>
                  {/* Priority score */}
                  <div className="col-span-1">
                    {lead.leadPriorityScore ? (
                      <span className="text-sm font-bold" style={{
                        color: lead.leadPriorityScore >= 7 ? "var(--brand-green)" :
                               lead.leadPriorityScore >= 5 ? "var(--brand-gold)" : "var(--brand-red)"
                      }}>
                        {lead.leadPriorityScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <Link href={`/leads/${lead.id}`}>
                      <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </Link>
                    <button onClick={() => handleDelete(lead.id, lead.companyName)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--brand-red)" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog إضافة للشريحة */}
      <Dialog open={showSegmentDialog} onOpenChange={setShowSegmentDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة {selectedIds.size} عميل لشريحة</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <label className="text-sm text-muted-foreground mb-2 block">اختر الشريحة</label>
            <select
              value={targetSegmentId}
              onChange={e => setTargetSegmentId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
            >
              <option value="">-- اختر شريحة --</option>
              {segmentsList?.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.leadCount} عميل)
                </option>
              ))}
            </select>
            {(!segmentsList || segmentsList.length === 0) && (
              <p className="text-xs text-muted-foreground mt-2">
                لا توجد شرائح بعد.{" "}
                <Link href="/segments">
                  <span className="text-primary cursor-pointer hover:underline">أنشئ شريحة أولاً</span>
                </Link>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSegmentDialog(false)}>إلغاء</Button>
            <Button
              onClick={handleAddToSegment}
              disabled={!targetSegmentId || addToSegment.isPending}
            >
              {addToSegment.isPending ? "جاري الإضافة..." : "إضافة للشريحة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== نافذة الإرسال الجماعي عبر واتساب ===== */}
      <Dialog open={showBulkWaDialog} onOpenChange={closeBulkWaDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" style={{ color: "oklch(0.75 0.18 145)" }} />
              إرسال واتساب جماعي — {selectedIds.size} عميل محدد
              {selectedWithWhatsapp > 0 && (
                <span className="text-sm font-normal px-2 py-0.5 rounded-full"
                  style={{ background: "oklch(0.65 0.18 145 / 0.15)", color: "oklch(0.75 0.18 145)" }}>
                  {selectedWithWhatsapp} واتساب فعّال
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Step: Config */}
          {bulkWaStep === "config" && (
            <div className="space-y-5 py-2">
              {/* تحذير الحسابات */}
              {connectedAccounts.length === 0 ? (
                <div className="p-4 rounded-xl border text-sm" style={{ background: "oklch(0.58 0.22 25 / 0.1)", borderColor: "oklch(0.58 0.22 25 / 0.3)", color: "oklch(0.7 0.22 25)" }}>
                  ⚠️ لا يوجد حساب واتساب متصل. يرجى الذهاب لصفحة واتساب وربط حساب أولاً.
                </div>
              ) : (
                <div className="p-3 rounded-xl border text-sm" style={{ background: "oklch(0.65 0.18 145 / 0.08)", borderColor: "oklch(0.65 0.18 145 / 0.2)", color: "oklch(0.75 0.18 145)" }}>
                  ✅ {connectedAccounts.length} حساب متصل وجاهز للإرسال
                </div>
              )}

              {/* اختيار الحساب */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">حساب الإرسال</label>
                <select
                  value={bulkWaAccountId}
                  onChange={e => setBulkWaAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="default">الحساب الافتراضي</option>
                  {waAccounts?.map(acc => (
                    <option key={acc.accountId} value={acc.accountId}>
                      {acc.label} — {acc.phoneNumber || acc.accountId}
                    </option>
                  ))}
                </select>
              </div>

              {/* طريقة توليد الرسائل */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">طريقة الرسالة</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBulkWaUseAI(false)}
                    className="p-3 rounded-xl border text-sm font-medium transition-all text-right"
                    style={{
                      background: !bulkWaUseAI ? "oklch(0.65 0.18 200 / 0.15)" : "transparent",
                      borderColor: !bulkWaUseAI ? "oklch(0.65 0.18 200 / 0.5)" : "var(--border)",
                      color: !bulkWaUseAI ? "var(--brand-cyan)" : "var(--muted-foreground)",
                    }}
                  >
                    <div className="font-semibold mb-1">📋 قالب جاهز</div>
                    <div className="text-xs opacity-70">استخدم قالب رسائل محدد مسبقاً</div>
                  </button>
                  <button
                    onClick={() => setBulkWaUseAI(true)}
                    className="p-3 rounded-xl border text-sm font-medium transition-all text-right"
                    style={{
                      background: bulkWaUseAI ? "oklch(0.65 0.18 280 / 0.15)" : "transparent",
                      borderColor: bulkWaUseAI ? "oklch(0.65 0.18 280 / 0.5)" : "var(--border)",
                      color: bulkWaUseAI ? "var(--brand-purple)" : "var(--muted-foreground)",
                    }}
                  >
                    <div className="font-semibold mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> ذكاء اصطناعي</div>
                    <div className="text-xs opacity-70">رسائل مخصصة لكل عميل بالـ AI</div>
                  </button>
                </div>
              </div>

              {/* إعدادات القالب */}
              {!bulkWaUseAI && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">اختر القالب</label>
                    <select
                      value={bulkWaTemplateId ?? ""}
                      onChange={e => setBulkWaTemplateId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="">-- اختر قالباً --</option>
                      {waTemplates?.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    {(!waTemplates || waTemplates.length === 0) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        لا توجد قوالب.{" "}
                        <Link href="/whatsapp">
                          <span className="text-primary cursor-pointer hover:underline">أنشئ قالباً أولاً</span>
                        </Link>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">اسم المرسل (اختياري)</label>
                      <input
                        value={bulkWaSenderName}
                        onChange={e => setBulkWaSenderName(e.target.value)}
                        placeholder="مثال: أحمد"
                        className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">اسم الشركة (اختياري)</label>
                      <input
                        value={bulkWaSenderCompany}
                        onChange={e => setBulkWaSenderCompany(e.target.value)}
                        placeholder="مثال: شركة مكسب"
                        className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* إعدادات AI */}
              {bulkWaUseAI && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">أسلوب الرسالة</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: "friendly", label: "ودّي", icon: "😊" },
                      { value: "formal", label: "رسمي", icon: "👔" },
                      { value: "direct", label: "مباشر", icon: "⚡" },
                    ] as const).map(tone => (
                      <button
                        key={tone.value}
                        onClick={() => setBulkWaAiTone(tone.value)}
                        className="py-2 rounded-lg text-sm border transition-all"
                        style={{
                          background: bulkWaAiTone === tone.value ? "oklch(0.65 0.18 280 / 0.15)" : "transparent",
                          borderColor: bulkWaAiTone === tone.value ? "oklch(0.65 0.18 280 / 0.5)" : "var(--border)",
                          color: bulkWaAiTone === tone.value ? "var(--brand-purple)" : "var(--muted-foreground)",
                        }}
                      >
                        {tone.icon} {tone.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* التأخير بين الرسائل */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  التأخير بين الرسائل: <span style={{ color: "var(--brand-cyan)" }}>{bulkWaDelayMs / 1000} ثانية</span>
                </label>
                <input
                  type="range"
                  min={5000}
                  max={60000}
                  step={5000}
                  value={bulkWaDelayMs}
                  onChange={e => setBulkWaDelayMs(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>5 ثوانٍ (سريع)</span>
                  <span>60 ثانية (آمن)</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">⚠️ تأخير أطول يقلل خطر الحظر</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeBulkWaDialog}>إلغاء</Button>
                <Button
                  onClick={handleGenerateMessages}
                  disabled={bulkWaGenerating || connectedAccounts.length === 0 || (!bulkWaUseAI && !bulkWaTemplateId)}
                  style={{ background: "oklch(0.65 0.18 145)", color: "white" }}
                >
                  {bulkWaGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري التوليد...</>
                  ) : (
                    <>توليد الرسائل ({selectedIds.size} عميل)</>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Preview */}
          {bulkWaStep === "preview" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  تم توليد <span className="text-foreground font-medium">{bulkWaMessages.length}</span> رسالة — راجع قبل الإرسال
                </p>
                <button onClick={() => setBulkWaStep("config")} className="text-xs text-muted-foreground hover:text-foreground">
                  ← تعديل الإعدادات
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bulkWaMessages.map((msg, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border text-sm" style={{ background: "oklch(0.10 0.01 240)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{msg.companyName}</span>
                      <span className="text-xs font-mono text-muted-foreground">{msg.phone}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{msg.message}</p>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkWaStep("config")}>تعديل</Button>
                <Button
                  onClick={handleStartSending}
                  style={{ background: "oklch(0.65 0.18 145)", color: "white" }}
                >
                  <Send className="w-4 h-4 ml-2" />
                  بدء الإرسال ({bulkWaMessages.length} رسالة)
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Step: Sending */}
          {(bulkWaStep === "sending" || (bulkWaStep === "done")) && (
            <div className="space-y-4 py-2">
              {/* شريط التقدم */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-foreground font-medium">
                    {bulkWaStep === "done" ? "اكتمل الإرسال" : bulkWaRunning ? "جاري الإرسال..." : "متوقف مؤقتاً"}
                  </span>
                  <span className="text-muted-foreground">{progressPct}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 240)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: bulkWaStep === "done"
                        ? "oklch(0.65 0.18 145)"
                        : "linear-gradient(90deg, oklch(0.65 0.18 200), oklch(0.65 0.18 145))",
                    }}
                  />
                </div>
              </div>

              {/* إحصائيات */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl text-center" style={{ background: "oklch(0.65 0.18 145 / 0.1)" }}>
                  <div className="text-2xl font-bold" style={{ color: "oklch(0.75 0.18 145)" }}>{sentCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">مُرسَل</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "oklch(0.18 0.02 240)" }}>
                  <div className="text-2xl font-bold text-muted-foreground">{pendingCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">متبقي</div>
                </div>
                <div className="p-3 rounded-xl text-center" style={{ background: "oklch(0.58 0.22 25 / 0.1)" }}>
                  <div className="text-2xl font-bold" style={{ color: "oklch(0.7 0.22 25)" }}>{failedCount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">فشل</div>
                </div>
              </div>

              {/* قائمة الرسائل */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {bulkWaMessages.map((msg, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm"
                    style={{ background: i === bulkWaCurrentIdx && bulkWaRunning ? "oklch(0.65 0.18 200 / 0.08)" : "transparent" }}>
                    <div className="flex-shrink-0">
                      {msg.status === "sent" && <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.75 0.18 145)" }} />}
                      {msg.status === "failed" && <XCircle className="w-4 h-4" style={{ color: "oklch(0.7 0.22 25)" }} />}
                      {msg.status === "pending" && i === bulkWaCurrentIdx && bulkWaRunning
                        ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        : msg.status === "pending" && <div className="w-4 h-4 rounded-full border border-border" />}
                    </div>
                    <span className={`flex-1 truncate ${msg.status === "sent" ? "text-foreground" : "text-muted-foreground"}`}>
                      {msg.companyName}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{msg.phone}</span>
                  </div>
                ))}
              </div>

              <DialogFooter>
                {bulkWaStep === "done" ? (
                  <Button onClick={closeBulkWaDialog} style={{ background: "oklch(0.65 0.18 145)", color: "white" }}>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    إغلاق
                  </Button>
                ) : bulkWaRunning ? (
                  <Button variant="outline" onClick={handlePauseSending}>
                    <Pause className="w-4 h-4 ml-2" />
                    إيقاف مؤقت
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeBulkWaDialog}>إلغاء</Button>
                    <Button onClick={handleResumeSending} style={{ background: "oklch(0.65 0.18 145)", color: "white" }}>
                      <Play className="w-4 h-4 ml-2" />
                      استئناف الإرسال
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== نافذة تأكيد الحذف الجماعي ===== */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5" style={{ color: "oklch(0.7 0.22 25)" }} />
              تأكيد الحذف الجماعي
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center space-y-3">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
              style={{ background: "oklch(0.58 0.22 25 / 0.15)", border: "2px solid oklch(0.58 0.22 25 / 0.3)" }}>
              <Trash2 className="w-8 h-8" style={{ color: "oklch(0.7 0.22 25)" }} />
            </div>
            <p className="text-base font-semibold">هل أنت متأكد من حذف {selectedIds.size} عميل؟</p>
            <p className="text-sm text-muted-foreground">هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع البيانات المرتبطة بهؤلاء العملاء نهائياً.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={bulkDelete.isPending}>
              إلغاء
            </Button>
            <Button
              onClick={() => bulkDelete.mutate({ ids: Array.from(selectedIds) })}
              disabled={bulkDelete.isPending}
              style={{ background: "oklch(0.58 0.22 25)", color: "white" }}
            >
              {bulkDelete.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الحذف...</>
              ) : (
                <><Trash2 className="w-4 h-4 ml-2" /> حذف {selectedIds.size} عميل نهائياً</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== نافذة الرفع الجماعي (BulkImport Dialog) ===== */}
      <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" style={{ color: "oklch(0.85 0.16 75)" }} />
              رفع عملاء جماعي
            </DialogTitle>
          </DialogHeader>
          <BulkImportInline onClose={() => {
            setShowBulkImportDialog(false);
            utils.leads.list.invalidate();
            utils.leads.stats.invalidate();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
