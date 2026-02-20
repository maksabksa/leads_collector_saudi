import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  MessageCircle, Send, Zap, Loader2, CheckCircle, Filter,
  Plus, Pencil, Trash2, Save, X, Copy, ExternalLink, ChevronLeft, ChevronRight,
  BookTemplate, Sparkles, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// ==================== TYPES ====================
type Template = {
  id: number; name: string; content: string;
  tone: "formal" | "friendly" | "direct"; isDefault: boolean; usageCount: number;
};
type GeneratedMsg = {
  leadId: number; companyName: string; phone: string; message: string; waUrl: string; sent: boolean;
};

// ==================== TEMPLATE EDITOR ====================
function TemplateEditor({
  template, onSave, onCancel, isNew
}: {
  template: Partial<Template>; onSave: (t: Partial<Template>) => void; onCancel: () => void; isNew: boolean;
}) {
  const [form, setForm] = useState({ name: template.name || "", content: template.content || "", tone: template.tone || "friendly" as const });
  const generateTemplate = trpc.whatsapp.generateTemplate.useMutation();
  const [genBusinessType, setGenBusinessType] = useState("");
  const [genServiceType, setGenServiceType] = useState("");

  const handleGenerate = async () => {
    try {
      const result = await generateTemplate.mutateAsync({ tone: form.tone as any, businessType: genBusinessType || undefined, serviceType: genServiceType || undefined });
      setForm(f => ({ ...f, content: result.content }));
      toast.success("تم توليد القالب بالذكاء الاصطناعي");
    } catch { toast.error("فشل التوليد"); }
  };

  const VARS = ["{{اسم_النشاط}}", "{{نوع_النشاط}}", "{{المدينة}}", "{{اسمي}}", "{{شركتي}}", "{{الثغرة}}"];

  return (
    <div className="rounded-2xl border p-5 space-y-4" style={{ background: "oklch(0.11 0.015 240)", borderColor: "oklch(0.65 0.18 200 / 0.3)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">{isNew ? "قالب جديد" : "تعديل القالب"}</h3>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>

      {/* Name */}
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="اسم القالب (مثال: قالب المطاعم)"
        className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary" />

      {/* Tone */}
      <div className="flex gap-2">
        {(["friendly", "formal", "direct"] as const).map(t => (
          <button key={t} onClick={() => setForm(f => ({ ...f, tone: t }))}
            className="flex-1 py-1.5 rounded-lg text-xs transition-all"
            style={form.tone === t
              ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.4)" }
              : { background: "oklch(0.15 0.015 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
            {t === "friendly" ? "ودي" : t === "formal" ? "رسمي" : "مباشر"}
          </button>
        ))}
      </div>

      {/* AI generation helpers */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "oklch(0.14 0.015 240)" }}>
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> توليد بالذكاء الاصطناعي
        </p>
        <div className="flex gap-2">
          <input value={genBusinessType} onChange={e => setGenBusinessType(e.target.value)}
            placeholder="نوع النشاط (اختياري)"
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
          <input value={genServiceType} onChange={e => setGenServiceType(e.target.value)}
            placeholder="خدمتك (اختياري)"
            className="flex-1 px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
        </div>
        <button onClick={handleGenerate} disabled={generateTemplate.isPending}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "oklch(0.75 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
          {generateTemplate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          توليد قالب جديد
        </button>
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-muted-foreground">نص القالب</label>
          <div className="flex flex-wrap gap-1">
            {VARS.map(v => (
              <button key={v} onClick={() => setForm(f => ({ ...f, content: f.content + v }))}
                className="px-1.5 py-0.5 rounded text-xs transition-all"
                style={{ background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)", border: "1px solid oklch(0.55 0.2 145 / 0.3)" }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6}
          placeholder="اكتب نص القالب هنا أو ولّده بالذكاء الاصطناعي..."
          className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground resize-none focus:outline-none focus:border-primary" />
        <p className="text-xs text-muted-foreground mt-1">{form.content.length} حرف</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-white/5 transition-all">إلغاء</button>
        <button onClick={() => { if (!form.name || !form.content) { toast.error("أدخل الاسم والمحتوى"); return; } onSave({ ...template, ...form }); }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "oklch(0.55 0.2 145)" }}>
          <Save className="w-4 h-4" /> حفظ القالب
        </button>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function BulkWhatsapp() {
  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery({});
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const createTemplate = trpc.whatsapp.createTemplate.useMutation();
  const updateTemplate = trpc.whatsapp.updateTemplate.useMutation();
  const deleteTemplate = trpc.whatsapp.deleteTemplate.useMutation();
  const bulkApplyTemplate = trpc.whatsapp.bulkApplyTemplate.useMutation();
  const bulkGenerate = trpc.whatsapp.bulkGenerate.useMutation();
  const logMessage = trpc.whatsapp.logMessage.useMutation();

  // Lead selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterCity, setFilterCity] = useState("all");
  const [filterHasPhone, setFilterHasPhone] = useState(true);
  const [filterWa, setFilterWa] = useState<"all" | "yes" | "unknown">("all");

  // Template management
  const [activeTab, setActiveTab] = useState<"templates" | "ai">("templates");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderCompany, setSenderCompany] = useState("");

  // AI generation
  const [aiTone, setAiTone] = useState<"formal" | "friendly" | "direct">("friendly");

  // Generated messages
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMsg[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentSendIndex, setCurrentSendIndex] = useState<number | null>(null);
  const [step, setStep] = useState<"select" | "preview">("select");

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      if (filterHasPhone && !l.verifiedPhone) return false;
      if (filterCity !== "all" && l.city !== filterCity) return false;
      if (filterWa !== "all" && (l as any).hasWhatsapp !== filterWa) return false;
      return true;
    });
  }, [leads, filterHasPhone, filterCity, filterWa]);

  const cities = useMemo(() => {
    if (!leads) return [];
    return Array.from(new Set(leads.map(l => l.city).filter(Boolean)));
  }, [leads]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLeads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredLeads.map(l => l.id)));
  };

  const handleSaveTemplate = async (t: Partial<Template>) => {
    try {
      if (isNewTemplate) {
        const result = await createTemplate.mutateAsync({ name: t.name!, content: t.content!, tone: t.tone || "friendly", isDefault: false });
        setSelectedTemplateId(result.id);
        toast.success("تم إنشاء القالب");
      } else {
        await updateTemplate.mutateAsync({ id: t.id!, name: t.name, content: t.content, tone: t.tone });
        toast.success("تم تحديث القالب");
      }
      await refetchTemplates();
      setEditingTemplate(null);
    } catch { toast.error("فشل حفظ القالب"); }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("هل تريد حذف هذا القالب؟")) return;
    await deleteTemplate.mutateAsync({ id });
    await refetchTemplates();
    if (selectedTemplateId === id) setSelectedTemplateId(null);
    toast.success("تم حذف القالب");
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) { toast.error("اختر عملاء أولاً"); return; }
    setGenerating(true);
    setGeneratedMessages([]);
    try {
      let results: Array<{ leadId: number; companyName: string; phone: string; message: string; waUrl: string }> = [];
      if (activeTab === "templates" && selectedTemplateId) {
        const res = await bulkApplyTemplate.mutateAsync({
          templateId: selectedTemplateId,
          leadIds: Array.from(selectedIds),
          senderName: senderName || undefined,
          senderCompany: senderCompany || undefined,
        });
        results = res.results;
      } else {
        const res = await bulkGenerate.mutateAsync({ leadIds: Array.from(selectedIds), tone: aiTone });
        results = res.results;
      }
      setGeneratedMessages(results.map(r => ({ ...r, sent: false })));
      setStep("preview");
      toast.success(`تم توليد ${results.length} رسالة`);
    } catch { toast.error("فشل التوليد"); }
    finally { setGenerating(false); }
  };

  const handleSendOne = async (index: number) => {
    const msg = generatedMessages[index];
    if (!msg || msg.sent) return;
    setCurrentSendIndex(index);
    // فتح واتساب ويب مع الرسالة مباشرة
    window.open(msg.waUrl, "_blank", "noopener,noreferrer");
    // تسجيل الإرسال
    try {
      await logMessage.mutateAsync({ leadId: msg.leadId, phone: msg.phone, message: msg.message, messageType: "bulk" });
    } catch { /* تجاهل خطأ التسجيل */ }
    setGeneratedMessages(prev => prev.map((m, i) => i === index ? { ...m, sent: true } : m));
    setCurrentSendIndex(null);
    toast.success(`✅ تم فتح واتساب لـ ${msg.companyName}`);
  };

  const handleSendNext = async () => {
    const nextIndex = generatedMessages.findIndex(m => !m.sent);
    if (nextIndex === -1) { toast.success("تم إرسال جميع الرسائل!"); return; }
    await handleSendOne(nextIndex);
  };

  const sentCount = generatedMessages.filter(m => m.sent).length;
  const pendingCount = generatedMessages.filter(m => !m.sent).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="w-6 h-6" style={{ color: "oklch(0.65 0.2 145)" }} />
            واتساب مجمع
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === "select" ? "اختر العملاء وحدد القالب أو استخدم الذكاء الاصطناعي" : `${sentCount}/${generatedMessages.length} رسالة أُرسلت`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {step === "preview" && (
            <button onClick={() => setStep("select")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:bg-white/5 transition-all">
              <ChevronRight className="w-4 h-4" /> العودة
            </button>
          )}
          {step === "preview" && pendingCount > 0 && (
            <button onClick={handleSendNext}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "oklch(0.55 0.2 145)" }}>
              <Send className="w-4 h-4" />
              إرسال التالي ({pendingCount} متبقي)
            </button>
          )}
        </div>
      </div>

      {step === "select" ? (
        <div className="grid grid-cols-5 gap-5">
          {/* ===== LEFT: LEAD SELECTION (3 cols) ===== */}
          <div className="col-span-3 space-y-4">
            {/* Filters */}
            <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" /> فلترة العملاء
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={filterHasPhone} onChange={e => setFilterHasPhone(e.target.checked)} className="w-3.5 h-3.5 rounded" />
                  <span className="text-xs text-foreground">لديهم هاتف</span>
                </label>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none">
                  <option value="all">كل المدن</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterWa} onChange={e => setFilterWa(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none">
                  <option value="all">كل الحالات</option>
                  <option value="yes">لديه واتساب ✅</option>
                  <option value="unknown">غير محدد ❓</option>
                </select>
              </div>
            </div>

            {/* Lead list */}
            <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "oklch(0.12 0.015 240)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {selectedIds.size === filteredLeads.length && filteredLeads.length > 0 ? "إلغاء الكل" : "تحديد الكل"}
                  <span className="mr-1 opacity-60">({filteredLeads.length})</span>
                </button>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)" }}>
                  {selectedIds.size} محدد
                </span>
              </div>
              {leadsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">لا يوجد عملاء مطابقون</div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                  {filteredLeads.map(lead => {
                    const selected = selectedIds.has(lead.id);
                    const waStatus = (lead as any).hasWhatsapp;
                    return (
                      <div key={lead.id} onClick={() => toggleSelect(lead.id)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/3 transition-colors"
                        style={selected ? { background: "oklch(0.55 0.2 145 / 0.07)" } : {}}>
                        <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                          style={selected ? { background: "oklch(0.55 0.2 145)", borderColor: "oklch(0.55 0.2 145)" } : { borderColor: "oklch(0.35 0.02 240)" }}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.companyName}</p>
                          <p className="text-xs text-muted-foreground">{lead.businessType} · {lead.city}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {waStatus === "yes" && <span className="text-xs">✅</span>}
                          {lead.verifiedPhone ? (
                            <span className="text-xs font-mono text-muted-foreground">{lead.verifiedPhone}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground opacity-40">لا هاتف</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT: TEMPLATE / AI (2 cols) ===== */}
          <div className="col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
              {(["templates", "ai"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 py-2.5 text-xs font-semibold transition-all"
                  style={activeTab === tab ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)" } : { color: "oklch(0.5 0.01 240)" }}>
                  {tab === "templates" ? "📋 القوالب" : "🤖 ذكاء اصطناعي"}
                </button>
              ))}
            </div>

            {activeTab === "templates" ? (
              <div className="space-y-3">
                {/* Sender info */}
                <div className="rounded-xl p-3 border border-border space-y-2" style={{ background: "oklch(0.12 0.015 240)" }}>
                  <p className="text-xs font-medium text-muted-foreground">بيانات المرسل (تُستبدل في القالب)</p>
                  <input value={senderName} onChange={e => setSenderName(e.target.value)}
                    placeholder="اسمك ({{اسمي}})"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
                  <input value={senderCompany} onChange={e => setSenderCompany(e.target.value)}
                    placeholder="اسم شركتك ({{شركتي}})"
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
                </div>

                {/* Template list */}
                {editingTemplate ? (
                  <TemplateEditor template={editingTemplate} onSave={handleSaveTemplate} onCancel={() => setEditingTemplate(null)} isNew={isNewTemplate} />
                ) : (
                  <>
                    <button onClick={() => { setIsNewTemplate(true); setEditingTemplate({ tone: "friendly" }); }}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: "oklch(0.15 0.015 240)", color: "oklch(0.6 0.01 240)", border: "1px dashed oklch(0.3 0.02 240)" }}>
                      <Plus className="w-3.5 h-3.5" /> قالب جديد
                    </button>
                    {templatesLoading ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {(templates || []).map(t => (
                          <div key={t.id} onClick={() => setSelectedTemplateId(t.id)}
                            className="rounded-xl p-3 cursor-pointer transition-all border"
                            style={selectedTemplateId === t.id
                              ? { background: "oklch(0.55 0.2 145 / 0.1)", borderColor: "oklch(0.55 0.2 145 / 0.4)" }
                              : { background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.22 0.02 240)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  {selectedTemplateId === t.id && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.65 0.2 145)" }} />}
                                  <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                                  {t.isDefault && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "oklch(0.75 0.18 200)" }}>افتراضي</span>}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                                <p className="text-xs text-muted-foreground mt-1 opacity-60">استُخدم {t.usageCount} مرة</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={e => { e.stopPropagation(); setIsNewTemplate(false); setEditingTemplate(t); }}
                                  className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground transition-all">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                                  className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* AI Tab */
              <div className="rounded-xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
                <p className="text-xs text-muted-foreground">يولّد الذكاء الاصطناعي رسالة مخصصة لكل عميل بناءً على بياناته وثغراته التسويقية</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">أسلوب الرسالة</label>
                  <div className="flex gap-1">
                    {(["friendly", "formal", "direct"] as const).map(t => (
                      <button key={t} onClick={() => setAiTone(t)}
                        className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                        style={aiTone === t
                          ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.4)" }
                          : { background: "oklch(0.15 0.015 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                        {t === "friendly" ? "ودي" : t === "formal" ? "رسمي" : "مباشر"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl p-3 space-y-1.5" style={{ background: "oklch(0.14 0.015 240)" }}>
                  <p className="text-xs font-medium text-foreground">ما الذي يفعله الذكاء الاصطناعي؟</p>
                  {["يقرأ اسم النشاط ونوعه ومدينته", "يستخدم الثغرة التسويقية المكتشفة", "يكتب رسالة مقنعة ومخصصة لكل عميل"].map(item => (
                    <p key={item} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span style={{ color: "oklch(0.65 0.2 145)" }}>✓</span> {item}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Generate button */}
            <button onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0 || (activeTab === "templates" && !selectedTemplateId)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: "oklch(0.55 0.2 145)", color: "white" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? "جاري التوليد..." : `توليد رسائل لـ ${selectedIds.size} عميل`}
            </button>
          </div>
        </div>
      ) : (
        /* ===== PREVIEW STEP ===== */
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "إجمالي الرسائل", value: generatedMessages.length, color: "oklch(0.75 0.18 200)" },
              { label: "تم الإرسال", value: sentCount, color: "oklch(0.65 0.2 145)" },
              { label: "متبقي", value: pendingCount, color: "oklch(0.78 0.16 75)" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-4 border border-border text-center" style={{ background: "oklch(0.12 0.015 240)" }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* How to send instructions */}
          <div className="rounded-2xl p-4 border space-y-2" style={{ background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.65 0.18 200 / 0.2)" }}>
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5" style={{ color: "oklch(0.75 0.18 200)" }} />
              كيفية الإرسال
            </p>
            <p className="text-xs text-muted-foreground">
              اضغط على زر <strong className="text-foreground">إرسال</strong> بجانب كل رسالة — سيفتح واتساب ويب مع الرسالة جاهزة تلقائياً، فقط اضغط إرسال في واتساب.
            </p>
          </div>

          {/* Messages list */}
          <div className="grid grid-cols-1 gap-3">
            {generatedMessages.map((msg, i) => (
              <div key={msg.leadId} className="rounded-2xl p-4 border transition-all"
                style={{
                  background: msg.sent ? "oklch(0.55 0.2 145 / 0.05)" : "oklch(0.12 0.015 240)",
                  borderColor: msg.sent ? "oklch(0.55 0.2 145 / 0.3)" : "oklch(0.22 0.02 240)"
                }}>
                <div className="flex items-start gap-4">
                  {/* Lead info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-foreground">{msg.companyName}</p>
                      <span className="text-xs font-mono text-muted-foreground">{msg.phone}</span>
                      {msg.sent && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)" }}>
                          <CheckCircle className="w-3 h-3" /> أُرسلت
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!msg.sent ? (
                      <button onClick={() => handleSendOne(i)} disabled={currentSendIndex === i}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                        style={{ background: "oklch(0.55 0.2 145)" }}>
                        {currentSendIndex === i ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        إرسال
                      </button>
                    ) : (
                      <button onClick={() => handleSendOne(i)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground transition-all border border-border hover:bg-white/5">
                        <RefreshCw className="w-3.5 h-3.5" /> إعادة
                      </button>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(msg.message); toast.success("تم النسخ"); }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-muted-foreground transition-all border border-border hover:bg-white/5">
                      <Copy className="w-3.5 h-3.5" /> نسخ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
