import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MessageCircle, Wifi, WifiOff, QrCode, Send, Users, FileText,
  Plus, Trash2, Edit, Loader2, Sparkles, CheckCircle, RefreshCw,
  Play, Square, Copy, ChevronDown, ChevronUp
} from "lucide-react";

// ===== مكون حالة الاتصال =====
const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  disconnected: { label: "غير متصل", color: "text-red-400 bg-red-500/10 border-red-500/30", icon: <WifiOff className="w-4 h-4" /> },
  initializing: { label: "جاري التهيئة...", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: <Loader2 className="w-4 h-4 animate-spin" /> },
  qr_pending: { label: "في انتظار المسح", color: "text-blue-400 bg-blue-500/10 border-blue-500/30", icon: <QrCode className="w-4 h-4" /> },
  connected: { label: "متصل", color: "text-green-400 bg-green-500/10 border-green-500/30", icon: <Wifi className="w-4 h-4" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, color: "text-gray-400 bg-gray-500/10 border-gray-500/30", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("connect");
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [preparedMessages, setPreparedMessages] = useState<{ leadId: number; name: string; phone: string; message: string }[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "", category: "" });
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string>("");
  const [sendProgress, setSendProgress] = useState<{ sent: number; total: number; current: string } | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const sendingRef = useRef(false);

  // ===== Queries =====
  const { data: statusData, refetch: refetchStatus } = trpc.wauto.status.useQuery(undefined, { refetchInterval: 3000 });
  const { data: leads } = trpc.leads.list.useQuery({});
  const { data: templates, refetch: refetchTemplates } = trpc.whatsapp.listTemplates.useQuery();

  // ===== Mutations =====
  const startSession = trpc.wauto.startSession.useMutation({
    onSuccess: () => { toast.success("جاري تهيئة واتساب..."); refetchStatus(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const disconnect = trpc.wauto.disconnect.useMutation({
    onSuccess: () => { toast.success("تم قطع الاتصال"); refetchStatus(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const sendOne = trpc.wauto.sendOne.useMutation();
  const bulkApplyTemplate = trpc.whatsapp.bulkApplyTemplate.useMutation();
  const bulkGenerate = trpc.whatsapp.bulkGenerate.useMutation();
  const createTemplate = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => { toast.success("تم إنشاء القالب"); refetchTemplates(); setShowNewTemplate(false); setNewTemplate({ name: "", content: "", category: "" }); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const updateTemplate = trpc.whatsapp.updateTemplate.useMutation({
    onSuccess: () => { toast.success("تم تحديث القالب"); refetchTemplates(); setEditingTemplate(null); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const deleteTemplate = trpc.whatsapp.deleteTemplate.useMutation({
    onSuccess: () => { toast.success("تم حذف القالب"); refetchTemplates(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const generateTemplate = trpc.whatsapp.generateTemplate.useMutation({
    onSuccess: (data) => {
      if (editingTemplate) setEditingTemplate((t: any) => ({ ...t, content: data.content }));
      else setNewTemplate(t => ({ ...t, content: data.content }));
      toast.success("تم توليد المحتوى بالذكاء الاصطناعي");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const status = statusData?.status ?? "disconnected";
  const qrCode = statusData?.qr;
  const isConnected = status === "connected";
  const isQrReady = status === "qr_pending";

  // تحضير الرسائل
  const handlePrepare = () => {
    if (!selectedTemplateId || selectedLeads.length === 0) {
      toast.error("اختر قالباً وعملاء أولاً");
      return;
    }
    const template = templates?.find(t => t.id === selectedTemplateId);
    if (!template) return;
        bulkApplyTemplate.mutate(
      { templateId: selectedTemplateId, leadIds: selectedLeads },
      {
        onSuccess: (data) => {
          const msgs = (data as any).results || (data as any).messages || [];
          setPreparedMessages(msgs.map((m: any) => ({
            leadId: m.leadId,
            name: m.leadName || m.companyName,
            phone: m.phone,
            message: m.message,
          })));
          setActiveTab("send");
          toast.success(`${msgs.length} رسالة جاهزة للإرسال`);
        },
        onError: (e) => toast.error("خطأ", { description: e.message }),
      }
    );
  };

  // إرسال تلقائي
  const handleSendAll = async () => {
    if (!isConnected) { toast.error("يجب الاتصال بواتساب أولاً"); return; }
    if (preparedMessages.length === 0) { toast.error("لا توجد رسائل محضّرة"); return; }
    sendingRef.current = true;
    setSendProgress({ sent: 0, total: preparedMessages.length, current: "" });
    let sent = 0;
    for (const msg of preparedMessages) {
      if (!sendingRef.current) break;
      setSendProgress({ sent, total: preparedMessages.length, current: msg.name });
      try {
        await sendOne.mutateAsync({ phone: msg.phone, message: msg.message });
        sent++;
      } catch (e: any) {
        toast.error(`فشل إرسال ${msg.name}`, { description: e.message });
      }
      // تأخير بشري عشوائي 3-7 ثواني
      await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));
    }
    setSendProgress(null);
    sendingRef.current = false;
    toast.success(`تم إرسال ${sent} من ${preparedMessages.length} رسالة`);
  };

  const stopSending = () => { sendingRef.current = false; setSendProgress(null); };

  const toggleLead = (id: number) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const withPhone = (Array.isArray(leads) ? leads : []).filter((l: any) => l.verifiedPhone);
    setSelectedLeads(withPhone.map((l: any) => l.id));
  };

  const leadsWithPhone = (Array.isArray(leads) ? leads : []).filter((l: any) => l.verifiedPhone);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">واتساب</h1>
              <p className="text-muted-foreground text-sm">ربط الحساب، القوالب، والإرسال التلقائي</p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="connect" className="flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              الربط
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              القوالب
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              الإرسال
            </TabsTrigger>
          </TabsList>

          {/* ===== تبويب الربط ===== */}
          <TabsContent value="connect" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* بطاقة الاتصال */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-primary" />
                    ربط الحساب
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isConnected && status !== "initializing" && status !== "qr_pending" && (
                    <Button onClick={() => startSession.mutate()} disabled={startSession.isPending} className="w-full" size="lg">
                      {startSession.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                      بدء الاتصال
                    </Button>
                  )}

                  {(status === "initializing") && (
                    <div className="text-center py-8 space-y-3">
                      <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground text-sm">جاري تهيئة واتساب... انتظر 20-30 ثانية</p>
                    </div>
                  )}

                  {isQrReady && qrCode && (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">امسح الرمز بهاتفك من واتساب ← الأجهزة المرتبطة ← ربط جهاز</p>
                      <div className="bg-white p-3 rounded-xl inline-block">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        تحديث الرمز
                      </Button>
                    </div>
                  )}

                  {isConnected && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3 py-4 bg-green-500/10 rounded-xl border border-green-500/20">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="font-semibold text-green-400">متصل بنجاح</p>
                          <p className="text-xs text-muted-foreground">الجلسة محفوظة تلقائياً</p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10">
                        <Square className="w-4 h-4 mr-2" />
                        قطع الاتصال
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* تعليمات */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">كيفية الربط</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3 text-sm">
                    {[
                      { n: 1, t: "اضغط \"بدء الاتصال\"", d: "سيفتح النظام واتساب ويب في الخلفية" },
                      { n: 2, t: "امسح رمز QR", d: "افتح واتساب على هاتفك ← الأجهزة المرتبطة ← ربط جهاز" },
                      { n: 3, t: "انتظر التأكيد", d: "ستتحول الحالة إلى \"متصل\" تلقائياً" },
                      { n: 4, t: "الجلسة محفوظة", d: "لن تحتاج لمسح QR مرة أخرى إلا إذا قطعت الاتصال" },
                    ].map(item => (
                      <li key={item.n} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold">{item.n}</span>
                        <div>
                          <p className="font-medium text-foreground">{item.t}</p>
                          <p className="text-muted-foreground text-xs">{item.d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== تبويب القوالب ===== */}
          <TabsContent value="templates" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">قوالب الرسائل</h2>
                <Button onClick={() => setShowNewTemplate(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  قالب جديد
                </Button>
              </div>

              {/* قالب جديد */}
              {showNewTemplate && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>اسم القالب</Label>
                        <Input value={newTemplate.name} onChange={e => setNewTemplate(t => ({ ...t, name: e.target.value }))} placeholder="مثال: رسالة ترحيب" className="mt-1" />
                      </div>
                      <div>
                        <Label>الفئة</Label>
                        <Input value={newTemplate.category} onChange={e => setNewTemplate(t => ({ ...t, category: e.target.value }))} placeholder="مثال: مطاعم، صالونات" className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>محتوى الرسالة</Label>
                        <Button
                          variant="outline" size="sm"
                          onClick={() => { setGeneratingFor("new"); generateTemplate.mutate({ businessType: newTemplate.category || "عام", tone: "friendly" }); }}
                          disabled={generateTemplate.isPending}
                          className="text-xs h-7"
                        >
                          {generateTemplate.isPending && generatingFor === "new" ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                          توليد بالذكاء الاصطناعي
                        </Button>
                      </div>
                      <Textarea value={newTemplate.content} onChange={e => setNewTemplate(t => ({ ...t, content: e.target.value }))} rows={5} placeholder="محتوى الرسالة... يمكن استخدام {{اسم_النشاط}} {{المدينة}}" className="mt-1" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowNewTemplate(false)}>إلغاء</Button>
                      <Button size="sm" onClick={() => createTemplate.mutate(newTemplate)} disabled={createTemplate.isPending || !newTemplate.name || !newTemplate.content}>
                        {createTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        إنشاء
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* قائمة القوالب */}
              {!templates || templates.length === 0 ? (
                <Card className="text-center py-10">
                  <p className="text-muted-foreground">لا توجد قوالب بعد</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {templates.map((t: any) => (
                    <Card key={t.id} className={`transition-all ${selectedTemplateId === t.id ? "border-primary/50 bg-primary/5" : ""}`}>
                      <CardContent className="pt-4 pb-4">
                        {editingTemplate?.id === t.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <Input value={editingTemplate.name} onChange={e => setEditingTemplate((et: any) => ({ ...et, name: e.target.value }))} />
                              <Input value={editingTemplate.category || ""} onChange={e => setEditingTemplate((et: any) => ({ ...et, category: e.target.value }))} placeholder="الفئة" />
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label>المحتوى</Label>
                                <Button variant="outline" size="sm" className="text-xs h-7"
                                  onClick={() => { setGeneratingFor(`edit-${t.id}`); generateTemplate.mutate({ businessType: editingTemplate.category || "عام", tone: "friendly" }); }}
                                  disabled={generateTemplate.isPending}
                                >
                                  {generateTemplate.isPending && generatingFor === `edit-${t.id}` ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                  توليد بالذكاء الاصطناعي
                                </Button>
                              </div>
                              <Textarea value={editingTemplate.content} onChange={e => setEditingTemplate((et: any) => ({ ...et, content: e.target.value }))} rows={5} />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" size="sm" onClick={() => setEditingTemplate(null)}>إلغاء</Button>
                              <Button size="sm" onClick={() => updateTemplate.mutate({ id: t.id, name: editingTemplate.name, content: editingTemplate.content })} disabled={updateTemplate.isPending}>
                                {updateTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                حفظ
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedTemplateId === t.id}
                              onCheckedChange={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-foreground">{t.name}</span>
                                {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{t.content}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(t.content); toast.success("تم النسخ"); }}>
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTemplate(t)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => deleteTemplate.mutate({ id: t.id })}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== تبويب الإرسال ===== */}
          <TabsContent value="send" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* اختيار العملاء */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4" />العملاء ({selectedLeads.length} محدد)</span>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>تحديد الكل</Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {leadsWithPhone.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">لا يوجد عملاء بأرقام هاتف</p>
                    ) : (leadsWithPhone as any[]).map((l: any) => (
                      <label key={l.id} className="flex items-center gap-2 cursor-pointer hover:bg-accent/30 rounded-lg p-2 transition-colors">
                        <Checkbox checked={selectedLeads.includes(l.id)} onCheckedChange={() => toggleLead(l.id)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{l.companyName}</p>
                          <p className="text-xs text-muted-foreground">{l.verifiedPhone}</p>
                        </div>
                      </label>
                    ))}
                  </CardContent>
                </Card>

                {/* اختيار القالب */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      القالب المحدد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTemplateId ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-primary">{templates?.find((t: any) => t.id === selectedTemplateId)?.name}</p>
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab("templates")}>تغيير القالب</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab("templates")}>
                        اختر قالباً من تبويب القوالب
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Button
                  className="w-full"
                  onClick={handlePrepare}
                  disabled={bulkApplyTemplate.isPending || selectedLeads.length === 0 || !selectedTemplateId}
                >
                  {bulkApplyTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  تحضير الرسائل ({selectedLeads.length})
                </Button>
              </div>

              {/* الرسائل المحضّرة */}
              <div className="lg:col-span-2 space-y-4">
                {sendProgress && (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">جاري الإرسال...</span>
                          <Button variant="outline" size="sm" className="text-xs h-7 text-red-400" onClick={stopSending}>إيقاف</Button>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(sendProgress.sent / sendProgress.total) * 100}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{sendProgress.sent}/{sendProgress.total} — جاري إرسال: {sendProgress.current}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {preparedMessages.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{preparedMessages.length} رسالة محضّرة</p>
                      <Button
                        onClick={handleSendAll}
                        disabled={!!sendProgress || !isConnected}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isConnected ? "إرسال الكل تلقائياً" : "يجب الاتصال أولاً"}
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {preparedMessages.map((msg, i) => (
                        <Card key={i}>
                          <CardContent className="pt-3 pb-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{msg.name}</span>
                                  <span className="text-xs text-muted-foreground">{msg.phone}</span>
                                </div>
                                <p className={`text-xs text-muted-foreground ${expandedMsg === i ? "" : "line-clamp-2"}`}>{msg.message}</p>
                              </div>
                              <button onClick={() => setExpandedMsg(expandedMsg === i ? null : i)} className="text-muted-foreground hover:text-foreground shrink-0">
                                {expandedMsg === i ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <Card className="h-64 flex items-center justify-center">
                    <div className="text-center text-muted-foreground space-y-2">
                      <Send className="w-10 h-10 mx-auto opacity-20" />
                      <p className="text-sm">اختر عملاء وقالباً ثم اضغط "تحضير الرسائل"</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
