import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import {
  MessageCircle, Loader2, CheckCircle, XCircle, Wifi, WifiOff,
  Send, Play, Square, RefreshCw, Smartphone, AlertCircle, Zap
} from "lucide-react";
import { toast } from "sonner";

type WaStatus = "disconnected" | "qr_pending" | "connected" | "sending" | "error";
type MsgState = { phone: string; message: string; leadId: number; companyName: string; status: "pending" | "sending" | "sent" | "failed"; error?: string };

// ==================== STATUS BADGE ====================
function StatusBadge({ status }: { status: WaStatus }) {
  const map: Record<WaStatus, { label: string; color: string; icon: React.ReactNode }> = {
    disconnected: { label: "غير متصل", color: "oklch(0.5 0.01 240)", icon: <WifiOff className="w-3.5 h-3.5" /> },
    qr_pending: { label: "في انتظار مسح QR", color: "oklch(0.78 0.16 75)", icon: <Smartphone className="w-3.5 h-3.5" /> },
    connected: { label: "متصل", color: "oklch(0.65 0.2 145)", icon: <Wifi className="w-3.5 h-3.5" /> },
    sending: { label: "جاري الإرسال...", color: "oklch(0.75 0.18 200)", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    error: { label: "خطأ", color: "oklch(0.7 0.22 25)", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  };
  const s = map[status];
  return (
    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}>
      {s.icon} {s.label}
    </span>
  );
}

// ==================== MAIN PAGE ====================
export default function WhatsAppAuto() {
  const utils = trpc.useUtils();
  const { data: statusData, refetch: refetchStatus } = trpc.wauto.status.useQuery(undefined, { refetchInterval: 3000 });
  const startSession = trpc.wauto.startSession.useMutation();
  const disconnect = trpc.wauto.disconnect.useMutation();
  const sendBulk = trpc.wauto.sendBulk.useMutation();
  const sendOne = trpc.wauto.sendOne.useMutation();

  // قوالب وعملاء
  const { data: templates } = trpc.whatsapp.listTemplates.useQuery();
  const { data: leads } = trpc.leads.list.useQuery({});
  const bulkApplyTemplate = trpc.whatsapp.bulkApplyTemplate.useMutation();

  const [status, setStatus] = useState<WaStatus>("disconnected");
  const [qrImg, setQrImg] = useState<string | null>(null);
  const [messages, setMessages] = useState<MsgState[]>([]);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [senderName, setSenderName] = useState("");
  const [senderCompany, setSenderCompany] = useState("");
  const [step, setStep] = useState<"connect" | "prepare" | "send">("connect");
  const stopRef = useRef(false);

  // مزامنة الحالة من الخادم
  useEffect(() => {
    if (statusData) {
      setStatus(statusData.status as WaStatus);
      if (statusData.qr) setQrImg(statusData.qr);
      if (statusData.status === "connected") {
        setQrImg(null);
        if (step === "connect") setStep("prepare");
      }
    }
  }, [statusData]);

  const handleConnect = async () => {
    try {
      const result = await startSession.mutateAsync();
      setStatus(result.status as WaStatus);
      if (result.qr) setQrImg(result.qr);
      if (result.status === "connected") {
        setStep("prepare");
        toast.success("تم الاتصال بواتساب");
      } else {
        toast.info("امسح رمز QR بهاتفك");
      }
    } catch (e: any) {
      toast.error("فشل الاتصال: " + e.message);
    }
  };

  const handleDisconnect = async () => {
    await disconnect.mutateAsync();
    setStatus("disconnected");
    setQrImg(null);
    setStep("connect");
    toast.success("تم قطع الاتصال");
  };

  const handlePrepareMessages = async () => {
    if (!selectedTemplateId || selectedLeadIds.length === 0) {
      toast.error("اختر قالباً وعملاء أولاً");
      return;
    }
    try {
      const res = await bulkApplyTemplate.mutateAsync({
        templateId: selectedTemplateId,
        leadIds: selectedLeadIds,
        senderName: senderName || undefined,
        senderCompany: senderCompany || undefined,
      });
      setMessages(res.results.map(r => ({ ...r, status: "pending" as const })));
      setStep("send");
      toast.success(`تم تحضير ${res.results.length} رسالة`);
    } catch {
      toast.error("فشل تحضير الرسائل");
    }
  };

  const handleSendAll = async () => {
    if (status !== "connected") { toast.error("واتساب غير متصل"); return; }
    setIsSendingAll(true);
    stopRef.current = false;

    for (let i = 0; i < messages.length; i++) {
      if (stopRef.current) break;
      const msg = messages[i];
      if (msg.status === "sent") continue;

      // تحديث الحالة لـ sending
      setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, status: "sending" } : m));

      try {
        const result = await sendOne.mutateAsync({
          phone: msg.phone,
          message: msg.message,
          leadId: msg.leadId,
        });
        setMessages(prev => prev.map((m, idx) =>
          idx === i ? { ...m, status: result.success ? "sent" : "failed", error: result.error } : m
        ));
        if (result.success) {
          toast.success(`✅ ${msg.companyName}`);
        } else {
          toast.error(`❌ ${msg.companyName}: ${result.error}`);
        }
      } catch (e: any) {
        setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, status: "failed", error: e.message } : m));
      }

      // تأخير بشري
      if (i < messages.length - 1 && !stopRef.current) {
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
      }
    }
    setIsSendingAll(false);
    toast.success("اكتمل الإرسال");
  };

  const handleStop = () => {
    stopRef.current = true;
    setIsSendingAll(false);
    toast.info("تم إيقاف الإرسال");
  };

  const sentCount = messages.filter(m => m.status === "sent").length;
  const failedCount = messages.filter(m => m.status === "failed").length;
  const pendingCount = messages.filter(m => m.status === "pending").length;

  // فلتر العملاء الذين لديهم هاتف
  const eligibleLeads = (leads || []).filter(l => l.verifiedPhone);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="w-6 h-6" style={{ color: "oklch(0.65 0.2 145)" }} />
            إرسال واتساب تلقائي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">يرسل الرسائل مباشرة عبر واتساب ويب بدون تدخل يدوي</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(["connect", "prepare", "send"] as const).map((s, i) => {
          const labels = ["1. ربط الحساب", "2. تحضير الرسائل", "3. الإرسال التلقائي"];
          const isActive = step === s;
          const isDone = (step === "prepare" && s === "connect") || (step === "send" && s !== "send");
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={isDone
                  ? { background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)" }
                  : isActive
                    ? { background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)" }
                    : { background: "oklch(0.15 0.015 240)", color: "oklch(0.4 0.01 240)" }}>
                {isDone ? <CheckCircle className="w-3 h-3" /> : null}
                {labels[i]}
              </div>
              {i < 2 && <div className="w-6 h-px" style={{ background: "oklch(0.25 0.02 240)" }} />}
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1: CONNECT ===== */}
      {step === "connect" && (
        <div className="grid grid-cols-2 gap-6">
          {/* Instructions */}
          <div className="rounded-2xl p-6 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
            <h3 className="text-base font-bold text-foreground">كيفية الربط</h3>
            {[
              { n: "1", t: "اضغط \"بدء الاتصال\"", d: "سيفتح النظام واتساب ويب في الخلفية" },
              { n: "2", t: "امسح رمز QR", d: "افتح واتساب على هاتفك → الأجهزة المرتبطة → ربط جهاز" },
              { n: "3", t: "انتظر التأكيد", d: "ستتحول الحالة إلى \"متصل\" تلقائياً" },
              { n: "4", t: "الجلسة محفوظة", d: "لن تحتاج لمسح QR مرة أخرى إلا إذا قطعت الاتصال" },
            ].map(item => (
              <div key={item.n} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "oklch(0.65 0.18 200 / 0.2)", color: "oklch(0.75 0.18 200)" }}>
                  {item.n}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.t}</p>
                  <p className="text-xs text-muted-foreground">{item.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* QR / Connect button */}
          <div className="rounded-2xl p-6 border border-border flex flex-col items-center justify-center gap-4" style={{ background: "oklch(0.12 0.015 240)" }}>
            {qrImg ? (
              <>
                <p className="text-sm font-semibold text-foreground">امسح رمز QR بهاتفك</p>
                <img src={qrImg} alt="WhatsApp QR" className="w-64 h-64 rounded-xl object-cover" />
                <p className="text-xs text-muted-foreground">الرمز يتجدد كل 20 ثانية</p>
                <button onClick={() => refetchStatus()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs border border-border text-muted-foreground hover:bg-white/5 transition-all">
                  <RefreshCw className="w-3.5 h-3.5" /> تحديث
                </button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.55 0.2 145 / 0.1)" }}>
                  <MessageCircle className="w-10 h-10" style={{ color: "oklch(0.65 0.2 145)" }} />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  اضغط لبدء الاتصال بواتساب ويب
                </p>
                <button onClick={handleConnect} disabled={startSession.isPending}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                  style={{ background: "oklch(0.55 0.2 145)" }}>
                  {startSession.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  بدء الاتصال
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== STEP 2: PREPARE ===== */}
      {step === "prepare" && (
        <div className="space-y-5">
          {/* Connection status bar */}
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{ background: "oklch(0.55 0.2 145 / 0.05)", borderColor: "oklch(0.55 0.2 145 / 0.3)" }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.65 0.2 145)" }} />
              <span className="text-sm text-foreground font-medium">واتساب متصل</span>
            </div>
            <button onClick={handleDisconnect}
              className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> قطع الاتصال
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Template selection */}
            <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
              <h3 className="text-sm font-semibold text-foreground">اختر القالب</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(templates || []).map(t => (
                  <div key={t.id} onClick={() => setSelectedTemplateId(t.id)}
                    className="p-3 rounded-xl cursor-pointer transition-all border"
                    style={selectedTemplateId === t.id
                      ? { background: "oklch(0.55 0.2 145 / 0.1)", borderColor: "oklch(0.55 0.2 145 / 0.4)" }
                      : { background: "oklch(0.14 0.015 240)", borderColor: "oklch(0.22 0.02 240)" }}>
                    <div className="flex items-center gap-2">
                      {selectedTemplateId === t.id && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.65 0.2 145)" }} />}
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.content}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">بيانات المرسل (اختياري)</p>
                <input value={senderName} onChange={e => setSenderName(e.target.value)}
                  placeholder="اسمك" className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
                <input value={senderCompany} onChange={e => setSenderCompany(e.target.value)}
                  placeholder="اسم شركتك" className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-border bg-background text-foreground focus:outline-none" />
              </div>
            </div>

            {/* Lead selection */}
            <div className="rounded-2xl p-4 border border-border space-y-3" style={{ background: "oklch(0.12 0.015 240)" }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">اختر العملاء</h3>
                <button onClick={() => {
                  if (selectedLeadIds.length === eligibleLeads.length) setSelectedLeadIds([]);
                  else setSelectedLeadIds(eligibleLeads.map(l => l.id));
                }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {selectedLeadIds.length === eligibleLeads.length ? "إلغاء الكل" : "تحديد الكل"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{selectedLeadIds.length} محدد من {eligibleLeads.length}</p>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {eligibleLeads.map(l => (
                  <div key={l.id} onClick={() => setSelectedLeadIds(prev =>
                    prev.includes(l.id) ? prev.filter(id => id !== l.id) : [...prev, l.id]
                  )} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white/3 transition-colors">
                    <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={selectedLeadIds.includes(l.id)
                        ? { background: "oklch(0.55 0.2 145)", borderColor: "oklch(0.55 0.2 145)" }
                        : { borderColor: "oklch(0.35 0.02 240)" }}>
                      {selectedLeadIds.includes(l.id) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{l.companyName}</p>
                      <p className="text-xs text-muted-foreground">{l.verifiedPhone}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handlePrepareMessages}
            disabled={bulkApplyTemplate.isPending || !selectedTemplateId || selectedLeadIds.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
            style={{ background: "oklch(0.65 0.18 200)" }}>
            {bulkApplyTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            تحضير {selectedLeadIds.length} رسالة
          </button>
        </div>
      )}

      {/* ===== STEP 3: SEND ===== */}
      {step === "send" && (
        <div className="space-y-4">
          {/* Stats + controls */}
          <div className="flex items-center gap-4">
            <div className="flex gap-3 flex-1">
              {[
                { label: "إجمالي", value: messages.length, color: "oklch(0.75 0.18 200)" },
                { label: "أُرسلت", value: sentCount, color: "oklch(0.65 0.2 145)" },
                { label: "فشلت", value: failedCount, color: "oklch(0.7 0.22 25)" },
                { label: "متبقي", value: pendingCount, color: "oklch(0.78 0.16 75)" },
              ].map(s => (
                <div key={s.label} className="rounded-xl px-4 py-2 border border-border text-center" style={{ background: "oklch(0.12 0.015 240)" }}>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep("prepare")}
                className="px-3 py-2 rounded-xl text-xs border border-border text-muted-foreground hover:bg-white/5 transition-all">
                تعديل
              </button>
              {isSendingAll ? (
                <button onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{ background: "oklch(0.58 0.22 25 / 0.2)", color: "oklch(0.7 0.22 25)", border: "1px solid oklch(0.58 0.22 25 / 0.4)" }}>
                  <Square className="w-4 h-4" /> إيقاف
                </button>
              ) : (
                <button onClick={handleSendAll} disabled={status !== "connected" || pendingCount === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: "oklch(0.55 0.2 145)" }}>
                  <Send className="w-4 h-4" />
                  إرسال الكل تلقائياً
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {messages.length > 0 && (
            <div className="rounded-xl overflow-hidden h-2" style={{ background: "oklch(0.18 0.02 240)" }}>
              <div className="h-full transition-all duration-500 rounded-xl"
                style={{ width: `${(sentCount / messages.length) * 100}%`, background: "oklch(0.55 0.2 145)" }} />
            </div>
          )}

          {/* Messages list */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className="rounded-xl p-3 border transition-all"
                style={{
                  background: msg.status === "sent" ? "oklch(0.55 0.2 145 / 0.05)"
                    : msg.status === "failed" ? "oklch(0.58 0.22 25 / 0.05)"
                      : msg.status === "sending" ? "oklch(0.65 0.18 200 / 0.05)"
                        : "oklch(0.12 0.015 240)",
                  borderColor: msg.status === "sent" ? "oklch(0.55 0.2 145 / 0.25)"
                    : msg.status === "failed" ? "oklch(0.58 0.22 25 / 0.25)"
                      : msg.status === "sending" ? "oklch(0.65 0.18 200 / 0.3)"
                        : "oklch(0.22 0.02 240)"
                }}>
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className="flex-shrink-0">
                    {msg.status === "sent" && <CheckCircle className="w-4 h-4" style={{ color: "oklch(0.65 0.2 145)" }} />}
                    {msg.status === "failed" && <XCircle className="w-4 h-4" style={{ color: "oklch(0.7 0.22 25)" }} />}
                    {msg.status === "sending" && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "oklch(0.75 0.18 200)" }} />}
                    {msg.status === "pending" && <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "oklch(0.35 0.02 240)" }} />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{msg.companyName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{msg.phone}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message.slice(0, 80)}...</p>
                    {msg.error && <p className="text-xs mt-0.5" style={{ color: "oklch(0.7 0.22 25)" }}>{msg.error}</p>}
                  </div>
                  {/* Manual send */}
                  {msg.status === "pending" && !isSendingAll && (
                    <button onClick={async () => {
                      setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, status: "sending" } : m));
                      const result = await sendOne.mutateAsync({ phone: msg.phone, message: msg.message, leadId: msg.leadId });
                      setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, status: result.success ? "sent" : "failed", error: result.error } : m));
                    }}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "oklch(0.55 0.2 145 / 0.15)", color: "oklch(0.65 0.2 145)", border: "1px solid oklch(0.55 0.2 145 / 0.3)" }}>
                      <Send className="w-3 h-3" /> إرسال
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
