import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { MessageCircle, Send, Zap, Loader2, CheckCircle, XCircle, Filter, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function BulkWhatsapp() {
  const { data: leads, isLoading } = trpc.leads.list.useQuery({});
  const bulkGenerate = trpc.whatsapp.bulkGenerate.useMutation();
  const logMessage = trpc.whatsapp.logMessage.useMutation();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [tone, setTone] = useState<"formal" | "friendly" | "direct">("friendly");
  const [customTemplate, setCustomTemplate] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [filterCity, setFilterCity] = useState("all");
  const [filterHasPhone, setFilterHasPhone] = useState(true);
  const [generatedMessages, setGeneratedMessages] = useState<Array<{
    leadId: number; companyName: string; phone: string; message: string; waUrl: string; sent: boolean;
  }>>([]);
  const [generating, setGenerating] = useState(false);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter(l => {
      if (filterHasPhone && !l.verifiedPhone) return false;
      if (filterCity !== "all" && l.city !== filterCity) return false;
      return true;
    });
  }, [leads, filterHasPhone, filterCity]);

  const cities = useMemo(() => {
    if (!leads) return [];
    const citySet = new Set(leads.map(l => l.city).filter(Boolean));
    return Array.from(citySet);
  }, [leads]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) { toast.error("اختر عملاء أولاً"); return; }
    setGenerating(true);
    setGeneratedMessages([]);
    try {
      const result = await bulkGenerate.mutateAsync({
        leadIds: Array.from(selectedIds),
        tone,
        customTemplate: useTemplate && customTemplate ? customTemplate : undefined,
      });
      setGeneratedMessages(result.results.map(r => ({ ...r, sent: false })));
      toast.success(`تم توليد ${result.results.length} رسالة بنجاح`);
    } catch { toast.error("فشل توليد الرسائل"); }
    finally { setGenerating(false); }
  };

  const handleSendOne = async (index: number) => {
    const msg = generatedMessages[index];
    if (!msg) return;
    setSendingIndex(index);
    window.open(msg.waUrl, "_blank");
    await logMessage.mutateAsync({ leadId: msg.leadId, phone: msg.phone, message: msg.message, messageType: "bulk" });
    setGeneratedMessages(prev => prev.map((m, i) => i === index ? { ...m, sent: true } : m));
    setSendingIndex(null);
    toast.success(`تم إرسال رسالة ${msg.companyName}`);
  };

  const handleSendAll = async () => {
    for (let i = 0; i < generatedMessages.length; i++) {
      if (!generatedMessages[i].sent) {
        await handleSendOne(i);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    toast.success("تم إرسال جميع الرسائل");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="w-6 h-6" style={{ color: "oklch(0.65 0.2 145)" }} />
            إرسال واتساب مجمع
          </h1>
          <p className="text-sm text-muted-foreground mt-1">توليد وإرسال رسائل واتساب مخصصة لعدة عملاء دفعة واحدة</p>
        </div>
        {generatedMessages.length > 0 && (
          <button onClick={handleSendAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "oklch(0.55 0.2 145)" }}>
            <Send className="w-4 h-4" />
            إرسال الكل ({generatedMessages.filter(m => !m.sent).length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Lead selection */}
        <div className="col-span-2 space-y-4">
          {/* Filters */}
          <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              فلترة العملاء
            </h3>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filterHasPhone} onChange={e => setFilterHasPhone(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-xs text-foreground">لديهم رقم هاتف فقط</span>
              </label>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-xs border border-border bg-background text-foreground focus:outline-none">
                <option value="all">كل المدن</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Lead list */}
          <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "oklch(0.12 0.015 240)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button onClick={selectAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selectedIds.size === filteredLeads.length ? "إلغاء الكل" : "تحديد الكل"} ({filteredLeads.length})
              </button>
              <span className="text-xs font-semibold" style={{ color: "oklch(0.65 0.2 145)" }}>
                {selectedIds.size} محدد
              </span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">لا يوجد عملاء مطابقون</div>
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-border">
                {filteredLeads.map(lead => (
                  <div key={lead.id} onClick={() => toggleSelect(lead.id)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition-colors"
                    style={selectedIds.has(lead.id) ? { background: "oklch(0.55 0.2 145 / 0.08)" } : {}}>
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={selectedIds.has(lead.id) ? { background: "oklch(0.55 0.2 145)", borderColor: "oklch(0.55 0.2 145)" } : { borderColor: "oklch(0.35 0.02 240)" }}>
                      {selectedIds.has(lead.id) && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground">{lead.businessType} · {lead.city}</p>
                    </div>
                    {lead.verifiedPhone ? (
                      <span className="text-xs font-mono text-muted-foreground">{lead.verifiedPhone}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground opacity-50">لا هاتف</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings + Generated messages */}
        <div className="col-span-1 space-y-4">
          {/* Message settings */}
          <div className="rounded-2xl p-4 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
            <h3 className="text-sm font-semibold text-foreground">إعدادات الرسالة</h3>
            {/* Tone */}
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">أسلوب الرسالة</label>
              <div className="flex gap-1">
                {(["friendly", "formal", "direct"] as const).map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs transition-all"
                    style={tone === t ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.4)" } : { background: "oklch(0.15 0.015 240)", color: "oklch(0.5 0.01 240)", border: "1px solid oklch(0.25 0.02 240)" }}>
                    {t === "friendly" ? "ودي" : t === "formal" ? "رسمي" : "مباشر"}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom template toggle */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-2">
                <input type="checkbox" checked={useTemplate} onChange={e => setUseTemplate(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs text-foreground">استخدام قالب مخصص</span>
              </label>
              {useTemplate && (
                <div>
                  <textarea value={customTemplate} onChange={e => setCustomTemplate(e.target.value)} rows={4}
                    placeholder={"استخدم المتغيرات:\n{{اسم_النشاط}}\n{{نوع_النشاط}}\n{{المدينة}}"}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-border bg-background text-foreground resize-none focus:outline-none focus:border-primary" />
                </div>
              )}
            </div>
            {/* Generate button */}
            <button onClick={handleGenerate} disabled={generating || selectedIds.size === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "oklch(0.65 0.18 200)", color: "white" }}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? "جاري التوليد..." : `توليد ${selectedIds.size} رسالة`}
            </button>
          </div>

          {/* Generated messages list */}
          {generatedMessages.length > 0 && (
            <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "oklch(0.12 0.015 240)" }}>
              <div className="px-4 py-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground">
                  الرسائل المولّدة ({generatedMessages.filter(m => m.sent).length}/{generatedMessages.length} أُرسلت)
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {generatedMessages.map((msg, i) => (
                  <div key={msg.leadId} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate max-w-28">{msg.companyName}</p>
                      {msg.sent ? (
                        <span className="text-xs flex items-center gap-1" style={{ color: "oklch(0.65 0.2 145)" }}>
                          <CheckCircle className="w-3 h-3" /> أُرسلت
                        </span>
                      ) : (
                        <button onClick={() => handleSendOne(i)} disabled={sendingIndex === i}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: "oklch(0.55 0.2 145)", color: "white" }}>
                          {sendingIndex === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          إرسال
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
