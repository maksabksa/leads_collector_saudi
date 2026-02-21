import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, Download, Trash2, Eye, Globe, Instagram, Phone, MapPin, ChevronDown, Layers, CheckSquare, Square, MessageCircle, Zap } from "lucide-react";
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

export default function Leads() {
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterZone, setFilterZone] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterWhatsapp, setFilterWhatsapp] = useState<"" | "yes" | "no" | "unknown">("");
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [targetSegmentId, setTargetSegmentId] = useState<string>("");

  const availableFilterCities = filterCountry
    ? (COUNTRIES_DATA.find(c => c.name === filterCountry)?.cities ?? [])
    : [];

  const { data: leads, isLoading } = trpc.leads.list.useQuery({
    search: search || undefined,
    city: filterCity || undefined,
    analysisStatus: filterStatus || undefined,
    zoneId: filterZone,
    hasWhatsapp: filterWhatsapp || undefined,
  });
  const { data: zones } = trpc.zones.list.useQuery();
  const { data: segmentsList } = trpc.segments.list.useQuery();
  const deleteLead = trpc.leads.delete.useMutation();
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
  const utils = trpc.useUtils();

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">قائمة العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads?.length ?? 0} عميل مسجل</p>
        </div>
        <div className="flex items-center gap-2">
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
                onClick={() => setShowSegmentDialog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}
              >
                <Layers className="w-4 h-4" />
                إضافة {selectedIds.size} للشريحة
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{lead.businessType}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: statusInfo.bg, color: statusInfo.color }}>
                          {statusInfo.label}
                        </span>
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
    </div>
  );
}
