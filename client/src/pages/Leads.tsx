import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Link } from "wouter";
import { Plus, Search, Filter, Download, Trash2, Eye, Globe, Instagram, Phone, MapPin, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "oklch(0.55 0.01 240)", bg: "oklch(0.18 0.02 240)", label: "معلق" },
  analyzing: { color: "oklch(0.85 0.16 75)", bg: "oklch(0.78 0.16 75 / 0.15)", label: "جاري التحليل" },
  completed: { color: "oklch(0.75 0.18 145)", bg: "oklch(0.65 0.18 145 / 0.15)", label: "مُحلَّل" },
  failed: { color: "oklch(0.7 0.22 25)", bg: "oklch(0.58 0.22 25 / 0.15)", label: "فشل" },
};

export default function Leads() {
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterZone, setFilterZone] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery({
    search: search || undefined,
    city: filterCity || undefined,
    analysisStatus: filterStatus || undefined,
    zoneId: filterZone,
  });
  const { data: zones } = trpc.zones.list.useQuery();
  const deleteLead = trpc.leads.delete.useMutation();
  const exportCSV = trpc.export.exportCSV.useMutation();
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

  const cities = Array.from(new Set((leads ?? []).map(l => l.city))).filter(Boolean);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">قائمة العملاء</h1>
          <p className="text-muted-foreground text-sm mt-1">{leads?.length ?? 0} عميل مسجل</p>
        </div>
        <div className="flex items-center gap-2">
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
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المدينة</label>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border border-border bg-background text-foreground focus:outline-none">
                <option value="">الكل</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
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
          </div>
        )}
      </div>

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
            <div className="col-span-4">النشاط</div>
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
              return (
                <div key={lead.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-white/3 transition-colors group">
                  {/* Name & type */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
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
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-foreground font-mono">{lead.verifiedPhone}</span>
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
    </div>
  );
}
