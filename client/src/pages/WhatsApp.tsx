import { useState, useRef } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle, Wifi, WifiOff, QrCode, Send, Users, FileText,
  Plus, Trash2, Loader2, Sparkles, CheckCircle, RefreshCw,
  Play, Square, Copy, ChevronDown, ChevronUp, Settings, Bell, Bot, Tag,
  Smartphone, Pencil, Zap, UserCheck, Layers, AlertTriangle, ExternalLink,
  PhoneCall, Info
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";

// ===== ثوابت =====
const MAX_ACCOUNTS = 10;

// ===== إعدادات حالة الاتصال =====
const statusConfig: Record<string, { label: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  disconnected: {
    label: "غير متصل",
    color: "text-red-400 bg-red-500/10 border-red-500/30",
    dotColor: "bg-red-500",
    icon: <WifiOff className="w-3.5 h-3.5" />,
  },
  initializing: {
    label: "جاري التهيئة...",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    dotColor: "bg-yellow-400 animate-pulse",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  qr_pending: {
    label: "في انتظار المسح",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    dotColor: "bg-blue-400 animate-pulse",
    icon: <QrCode className="w-3.5 h-3.5" />,
  },
  connected: {
    label: "متصل",
    color: "text-green-400 bg-green-500/10 border-green-500/30",
    dotColor: "bg-green-500",
    icon: <Wifi className="w-3.5 h-3.5" />,
  },
};

function StatusPill({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    color: "text-gray-400 bg-gray-500/10 border-gray-500/30",
    dotColor: "bg-gray-400",
    icon: null,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
      {cfg.label}
    </span>
  );
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType; desc: string }> = {
  bulk_sender: {
    label: "إرسال جماعي",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Zap,
    desc: "مخصص لإرسال الرسائل الجماعية للعملاء",
  },
  human_handoff: {
    label: "تحويل للموظف",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: UserCheck,
    desc: "مخصص لاستقبال العملاء المهتمين وإتمام البيع",
  },
  both: {
    label: "إرسال + تحويل",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Layers,
    desc: "يقوم بالإرسال الجماعي وتحويل العملاء المهتمين",
  },
};

// ===== بطاقة حساب واتساب =====
function AccountCard({
  account,
  sessionStatus,
  sessionQr,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  onToggleActive,
  isConnecting,
  isDisconnecting,
}: {
  account: any;
  sessionStatus: string;
  sessionQr?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (v: boolean) => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
}) {
  const roleInfo = ROLE_LABELS[account.role] ?? ROLE_LABELS.bulk_sender;
  const RoleIcon = roleInfo.icon;
  const isConnected = sessionStatus === "connected";
  const isQrPending = sessionStatus === "qr_pending";
  const isInitializing = sessionStatus === "initializing";
  const isActive = account.isActive;

  return (
    <Card className={`transition-all duration-200 ${isActive ? "border-border" : "border-border/30 opacity-50"} ${isConnected ? "ring-1 ring-green-500/20" : ""}`}>
      <CardContent className="p-4 space-y-3">

        {/* رأس البطاقة */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* أيقونة الحالة */}
            <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
              isConnected ? "bg-green-500/15 border border-green-500/30" : "bg-muted border border-border"
            }`}>
              <Smartphone className={`w-5 h-5 ${isConnected ? "text-green-400" : "text-muted-foreground"}`} />
              {/* نقطة الحالة */}
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                isConnected ? "bg-green-500" :
                isInitializing || isQrPending ? "bg-yellow-400 animate-pulse" :
                "bg-red-500"
              }`} />
            </div>

            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{account.label}</p>
              <p className="text-xs text-muted-foreground font-mono" dir="ltr">{account.phoneNumber}</p>
            </div>
          </div>

          {/* تفعيل/إيقاف */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Switch
                  checked={account.isActive}
                  onCheckedChange={onToggleActive}
                  className="flex-shrink-0"
                />
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{account.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* الدور والموظف */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${roleInfo.color} border text-xs flex items-center gap-1`}>
            <RoleIcon className="w-3 h-3" />
            {roleInfo.label}
          </Badge>
          {account.assignedEmployee && (
            <Badge variant="outline" className="text-xs">
              <UserCheck className="w-3 h-3 ml-1" />
              {account.assignedEmployee}
            </Badge>
          )}
        </div>

        {/* حالة الاتصال */}
        <div className="space-y-2">
          <StatusPill status={sessionStatus} />

          {/* QR Code */}
          {isQrPending && sessionQr && (
            <div className="bg-muted/30 rounded-xl p-3 text-center space-y-2 border border-border">
              <p className="text-xs text-muted-foreground">افتح واتساب → الأجهزة المرتبطة → ربط جهاز</p>
              <div className="bg-white p-2 rounded-lg inline-block">
                <img src={sessionQr} alt="QR Code" className="w-36 h-36" />
              </div>
            </div>
          )}

          {/* جاري التهيئة */}
          {isInitializing && (
            <div className="flex items-center gap-2 py-2 px-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
              <span className="text-xs text-yellow-400">جاري تهيئة الاتصال... (20-30 ثانية)</span>
            </div>
          )}

          {/* متصل */}
          {isConnected && (
            <div className="flex items-center gap-2 py-2 px-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-400">متصل بنجاح — الجلسة محفوظة</span>
            </div>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex gap-2 pt-1">
          {/* زر الربط */}
          {!isConnected && !isInitializing && !isQrPending && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              onClick={onConnect}
              disabled={isConnecting || !isActive}
            >
              {isConnecting ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Play className="w-3 h-3 ml-1" />
              )}
              ربط الحساب
            </Button>
          )}

          {/* زر قطع الاتصال */}
          {(isConnected || isQrPending || isInitializing) && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Square className="w-3 h-3 ml-1" />
              )}
              قطع الاتصال
            </Button>
          )}

          {/* تعديل */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={onEdit}
          >
            <Pencil className="w-3 h-3" />
          </Button>

          {/* حذف */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== الصفحة الرئيسية =====
export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("accounts");
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

  // إعدادات
  const [messageDelay, setMessageDelay] = useState(10);
  const [notificationThreshold, setNotificationThreshold] = useState(50);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [newRule, setNewRule] = useState({ keywords: "", template: "", useAI: false, aiContext: "" });
  const [showNewRule, setShowNewRule] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  // حسابات واتساب
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<{ id: number; label: string } | null>(null);
  const [accountForm, setAccountForm] = useState({
    label: "",
    phoneNumber: "",
    role: "bulk_sender" as "bulk_sender" | "human_handoff" | "both",
    assignedEmployee: "",
    notes: "",
    sortOrder: 0,
  });

  // ===== Queries =====
  const { data: allSessionsData, refetch: refetchAllSessions } = trpc.wauto.allStatus.useQuery(
    undefined,
    { refetchInterval: 4000 }
  );
  const { data: accounts = [], refetch: refetchAccounts } = trpc.waAccounts.listAccounts.useQuery();
  const { data: pendingAlerts = [], refetch: refetchAlerts } = trpc.waAccounts.listAlerts.useQuery({ status: "pending" });
  const { data: leads } = trpc.leads.list.useQuery({});
  const { data: templates, refetch: refetchTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const { data: waSettings, refetch: refetchSettings } = trpc.waSettings.getSettings.useQuery({ accountId: "default" });
  const { data: autoReplyRules, refetch: refetchRules } = trpc.waSettings.listAutoReplyRules.useQuery({ accountId: "default" });

  // تحميل الإعدادات من قاعدة البيانات
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  if (waSettings && !settingsLoaded) {
    setMessageDelay(Math.round(waSettings.messageDelay / 1000));
    setNotificationThreshold(waSettings.notificationThreshold);
    setAutoReplyEnabled(waSettings.autoReplyEnabled);
    setSettingsLoaded(true);
  }

  // ===== Mutations =====
  const sendOne = trpc.wauto.sendOne.useMutation();
  const bulkApplyTemplate = trpc.whatsapp.bulkApplyTemplate.useMutation();
  const bulkGenerate = trpc.whatsapp.bulkGenerate.useMutation();

  const createTemplate = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء القالب");
      refetchTemplates();
      setShowNewTemplate(false);
      setNewTemplate({ name: "", content: "", category: "" });
    },
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

  const updateSettings = trpc.waSettings.updateSettings.useMutation({
    onSuccess: () => { toast.success("تم حفظ الإعدادات"); refetchSettings(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const addAutoReplyRule = trpc.waSettings.addAutoReplyRule.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة قاعدة الرد");
      refetchRules();
      setShowNewRule(false);
      setNewRule({ keywords: "", template: "", useAI: false, aiContext: "" });
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const updateAutoReplyRule = trpc.waSettings.updateAutoReplyRule.useMutation({
    onSuccess: () => { toast.success("تم تحديث القاعدة"); refetchRules(); setEditingRule(null); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const deleteAutoReplyRule = trpc.waSettings.deleteAutoReplyRule.useMutation({
    onSuccess: () => { toast.success("تم حذف القاعدة"); refetchRules(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // mutations الحسابات
  const addAccount = trpc.waAccounts.addAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحساب");
      refetchAccounts();
      setShowAddAccount(false);
      setAccountForm({ label: "", phoneNumber: "", role: "bulk_sender", assignedEmployee: "", notes: "", sortOrder: 0 });
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const updateAccount = trpc.waAccounts.updateAccount.useMutation({
    onSuccess: () => { toast.success("تم تحديث الحساب"); refetchAccounts(); setEditingAccount(null); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const deleteAccount = trpc.waAccounts.deleteAccount.useMutation({
    onSuccess: () => { toast.success("تم حذف الحساب"); refetchAccounts(); setDeleteAccountTarget(null); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const toggleAccountActive = trpc.waAccounts.updateAccount.useMutation({
    onSuccess: () => refetchAccounts(),
    onError: (e: any) => toast.error("خطأ", { description: e.message }),
  });

  const transferToHuman = trpc.waAccounts.transferToHuman.useMutation({
    onSuccess: () => { toast.success("تم التحويل بنجاح"); refetchAlerts(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // جلسات الحسابات
  const startAccountSession = trpc.wauto.startSession.useMutation({
    onSuccess: () => { toast.success("جاري تهيئة الحساب..."); refetchAllSessions(); },
    onError: (e) => toast.error("خطأ في بدء الجلسة", { description: e.message }),
  });

  const disconnectAccount = trpc.wauto.disconnect.useMutation({
    onSuccess: () => { toast.success("تم قطع الاتصال"); refetchAllSessions(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  const incrementCount = trpc.waSettings.incrementMessageCount.useMutation();

  // ===== حساب الحالات =====
  const sessions = (allSessionsData as any[] | undefined) ?? [];
  const connectedCount = sessions.filter((s: any) => s.status === "connected").length;
  const accountsList = accounts as any[];
  const handoffAccounts = accountsList.filter((a) => a.role === "human_handoff" || a.role === "both");

  // أول حساب متصل (للإرسال)
  const firstConnectedAccount = accountsList.find((a) => {
    const s = sessions.find((s: any) => s.accountId === a.accountId);
    return s?.status === "connected";
  });
  const isAnyConnected = !!firstConnectedAccount;

  // ===== معالجات =====
  const handleAccountSave = () => {
    const payload = {
      ...accountForm,
      assignedEmployee: accountForm.assignedEmployee || undefined,
      notes: accountForm.notes || undefined,
    };
    if (editingAccount) updateAccount.mutate({ id: editingAccount.id, ...payload });
    else addAccount.mutate(payload);
  };

  const handlePrepare = () => {
    if (!selectedTemplateId || selectedLeads.length === 0) {
      toast.error("اختر قالباً وعملاء أولاً");
      return;
    }
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

  const handleSendAll = async () => {
    if (!isAnyConnected) { toast.error("يجب ربط حساب واتساب أولاً"); return; }
    if (preparedMessages.length === 0) { toast.error("لا توجد رسائل محضّرة"); return; }
    sendingRef.current = true;
    setSendProgress({ sent: 0, total: preparedMessages.length, current: "" });
    let sent = 0;
    for (const msg of preparedMessages) {
      if (!sendingRef.current) break;
      setSendProgress({ sent, total: preparedMessages.length, current: msg.name });
      try {
        await sendOne.mutateAsync({
          phone: msg.phone,
          message: msg.message,
          accountId: firstConnectedAccount?.accountId ?? "default",
        });
        sent++;
      } catch (e: any) {
        toast.error(`فشل إرسال ${msg.name}`, { description: e.message });
      }
      const delayMs = messageDelay * 1000;
      await new Promise(r => setTimeout(r, delayMs + Math.random() * 2000));
    }
    setSendProgress(null);
    sendingRef.current = false;
    toast.success(`تم إرسال ${sent} من ${preparedMessages.length} رسالة`);
    if (sent > 0) incrementCount.mutate({ accountId: "default", count: sent });
  };

  const stopSending = () => { sendingRef.current = false; setSendProgress(null); };

  const toggleLead = (id: number) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const leadsWithPhone = (Array.isArray(leads) ? leads : []).filter((l: any) => l.verifiedPhone);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ===== Header ===== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">واتساب</h1>
              <p className="text-sm text-muted-foreground">إدارة الحسابات، القوالب، والإرسال التلقائي</p>
            </div>
          </div>

          {/* ملخص الاتصال */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${
              connectedCount > 0
                ? "text-green-400 bg-green-500/10 border-green-500/30"
                : "text-muted-foreground bg-muted/30 border-border"
            }`}>
              <span className={`w-2 h-2 rounded-full ${connectedCount > 0 ? "bg-green-500" : "bg-muted-foreground"}`} />
              {connectedCount > 0 ? `${connectedCount} متصل` : "لا يوجد اتصال"}
              {accountsList.length > 0 && (
                <span className="text-muted-foreground">/ {accountsList.length}</span>
              )}
            </div>
            {(pendingAlerts as any[]).length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3 h-3 ml-1" />
                {(pendingAlerts as any[]).length} تنبيه
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="accounts" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Smartphone className="w-4 h-4" />
              الحسابات
              {(pendingAlerts as any[]).length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {(pendingAlerts as any[]).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              القوالب
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Send className="w-4 h-4" />
              الإرسال
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Settings className="w-4 h-4" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          {/* ===== تبويب الحسابات (مع الربط المدمج) ===== */}
          <TabsContent value="accounts" className="mt-6 space-y-6">

            {/* رأس التبويب */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  حسابات واتساب
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>يمكنك ربط حتى {MAX_ACCOUNTS} أجهزة واتساب مختلفة</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {accountsList.length} / {MAX_ACCOUNTS} حساب — اضغط "ربط الحساب" في أي بطاقة لبدء الاتصال
                </p>
              </div>
              <Button
                onClick={() => {
                  if (accountsList.length >= MAX_ACCOUNTS) {
                    toast.error(`الحد الأقصى ${MAX_ACCOUNTS} حسابات`);
                    return;
                  }
                  setEditingAccount(null);
                  setAccountForm({ label: "", phoneNumber: "", role: "bulk_sender", assignedEmployee: "", notes: "", sortOrder: 0 });
                  setShowAddAccount(true);
                }}
                disabled={accountsList.length >= MAX_ACCOUNTS}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة حساب
                {accountsList.length >= MAX_ACCOUNTS && (
                  <span className="mr-1 text-xs opacity-70">(الحد الأقصى)</span>
                )}
              </Button>
            </div>

            {/* شريط التقدم */}
            {accountsList.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>الحسابات المستخدمة</span>
                    <span className="font-medium text-foreground">{accountsList.length} / {MAX_ACCOUNTS}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${(accountsList.length / MAX_ACCOUNTS) * 100}%` }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => refetchAllSessions()}
                >
                  <RefreshCw className="w-3.5 h-3.5 ml-1" />
                  تحديث
                </Button>
              </div>
            )}

            {/* بطاقات الحسابات */}
            {accountsList.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-muted-foreground">لم تضف أي حساب بعد</p>
                  <p className="text-sm text-muted-foreground/60 mt-1 mb-4">
                    أضف حساباً واضغط "ربط الحساب" لبدء الاتصال بواتساب
                  </p>
                  <Button
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountForm({ label: "", phoneNumber: "", role: "bulk_sender", assignedEmployee: "", notes: "", sortOrder: 0 });
                      setShowAddAccount(true);
                    }}
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    إضافة أول حساب
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountsList.map((account: any) => {
                  const sessionInfo = sessions.find((s: any) => s.accountId === account.accountId);
                  const sessionStatus = sessionInfo?.status ?? "disconnected";
                  const sessionQr = sessionInfo?.qr;

                  return (
                    <AccountCard
                      key={account.id}
                      account={account}
                      sessionStatus={sessionStatus}
                      sessionQr={sessionQr}
                      onConnect={() => startAccountSession.mutate({ accountId: account.accountId })}
                      onDisconnect={() => disconnectAccount.mutate({ accountId: account.accountId })}
                      onEdit={() => {
                        setEditingAccount(account);
                        setAccountForm({
                          label: account.label,
                          phoneNumber: account.phoneNumber,
                          role: account.role,
                          assignedEmployee: account.assignedEmployee || "",
                          notes: account.notes || "",
                          sortOrder: account.sortOrder,
                        });
                        setShowAddAccount(true);
                      }}
                      onDelete={() => setDeleteAccountTarget({ id: account.id, label: account.label })}
                      onToggleActive={(v) => toggleAccountActive.mutate({ id: account.id, isActive: v })}
                      isConnecting={startAccountSession.isPending}
                      isDisconnecting={disconnectAccount.isPending}
                    />
                  );
                })}

                {/* بطاقة إضافة حساب جديد (placeholder) */}
                {accountsList.length < MAX_ACCOUNTS && (
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountForm({ label: "", phoneNumber: "", role: "bulk_sender", assignedEmployee: "", notes: "", sortOrder: 0 });
                      setShowAddAccount(true);
                    }}
                    className="border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[200px]"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">إضافة حساب جديد</p>
                      <p className="text-xs opacity-60 mt-0.5">
                        {MAX_ACCOUNTS - accountsList.length} متبقي
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* تعليمات الربط */}
            <Card className="bg-muted/10 border-border/50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  كيفية ربط حساب واتساب
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { n: 1, t: "أضف الحساب", d: "اضغط 'إضافة حساب' وأدخل البيانات" },
                    { n: 2, t: "اضغط 'ربط الحساب'", d: "سيبدأ النظام تهيئة الاتصال" },
                    { n: 3, t: "امسح رمز QR", d: "واتساب ← الأجهزة المرتبطة ← ربط جهاز" },
                    { n: 4, t: "الجلسة محفوظة", d: "لن تحتاج لمسح QR مجدداً" },
                  ].map(item => (
                    <div key={item.n} className="flex gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">
                        {item.n}
                      </span>
                      <div>
                        <p className="text-xs font-medium">{item.t}</p>
                        <p className="text-xs text-muted-foreground">{item.d}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* إشعارات الاهتمام */}
            {(pendingAlerts as any[]).length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  عملاء مهتمون ({(pendingAlerts as any[]).length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(pendingAlerts as any[]).map((alert: any) => (
                    <Card key={alert.id} className="border-amber-500/30 bg-amber-500/5">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{alert.contactName || alert.phone}</p>
                            <p className="text-xs text-muted-foreground font-mono" dir="ltr">{alert.phone}</p>
                          </div>
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 border text-xs">
                            اهتمام {alert.interestScore}%
                          </Badge>
                        </div>
                        {alert.triggerMessage && (
                          <p className="text-xs bg-muted/40 rounded p-2 text-muted-foreground line-clamp-2">
                            {alert.triggerMessage}
                          </p>
                        )}
                        {handoffAccounts.length > 0 && (
                          <div className="flex gap-2">
                            {handoffAccounts.map((acc: any) => (
                              <Button
                                key={acc.accountId}
                                size="sm"
                                className="flex-1 h-8 text-xs"
                                onClick={() => transferToHuman.mutate({ alertId: alert.id, handoffAccountId: acc.accountId })}
                                disabled={transferToHuman.isPending}
                              >
                                <ExternalLink className="w-3 h-3 ml-1" />
                                {acc.assignedEmployee || acc.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ===== تبويب القوالب ===== */}
          <TabsContent value="templates" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">قوالب الرسائل</h2>
                <Button onClick={() => setShowNewTemplate(true)} size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  قالب جديد
                </Button>
              </div>

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
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{t.name}</p>
                                {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant={selectedTemplateId === t.id ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => { setSelectedTemplateId(t.id); setActiveTab("send"); }}
                              >
                                {selectedTemplateId === t.id ? <CheckCircle className="w-3 h-3 ml-1" /> : null}
                                {selectedTemplateId === t.id ? "محدد" : "اختيار"}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTemplate(t)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate.mutate({ id: t.id })}>
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
            {/* تنبيه إذا لم يكن هناك اتصال */}
            {!isAnyConnected && (
              <div className="mb-4 flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>يجب ربط حساب واتساب أولاً من تبويب "الحسابات" قبل الإرسال</span>
                <Button variant="outline" size="sm" className="mr-auto h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => setActiveTab("accounts")}>
                  اذهب للحسابات
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2"><Users className="w-4 h-4" />العملاء ({selectedLeads.length} محدد)</span>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedLeads(leadsWithPhone.map((l: any) => l.id))}>تحديد الكل</Button>
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

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />القالب المحدد
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

                {/* حساب الإرسال */}
                {isAnyConnected && (
                  <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>سيتم الإرسال عبر: <strong>{firstConnectedAccount?.label}</strong></span>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handlePrepare}
                  disabled={bulkApplyTemplate.isPending || selectedLeads.length === 0 || !selectedTemplateId}
                >
                  {bulkApplyTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  تحضير الرسائل ({selectedLeads.length})
                </Button>
              </div>

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
                        disabled={!!sendProgress || !isAnyConnected}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {isAnyConnected ? "إرسال الكل تلقائياً" : "يجب ربط حساب أولاً"}
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

          {/* ===== تبويب الإعدادات ===== */}
          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    إعدادات الإرسال
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">التأخير بين الرسائل</Label>
                      <span className="text-primary font-bold text-lg">{messageDelay} ثانية</span>
                    </div>
                    <Slider value={[messageDelay]} onValueChange={([v]) => setMessageDelay(v)} min={3} max={60} step={1} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>3 ثواني (أسرع)</span>
                      <span>60 ثانية (أآمن)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">يضاف تأخير عشوائي 0-2 ثانية لتبدو طبيعية</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">تنبيه بعد كل</Label>
                      <span className="text-primary font-bold text-lg">{notificationThreshold} رسالة</span>
                    </div>
                    <Slider value={[notificationThreshold]} onValueChange={([v]) => setNotificationThreshold(v)} min={10} max={500} step={10} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>10 رسائل</span>
                      <span>500 رسالة</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="font-medium text-sm">الرد التلقائي</p>
                      <p className="text-xs text-muted-foreground">رد تلقائي على الرسائل الواردة</p>
                    </div>
                    <Switch checked={autoReplyEnabled} onCheckedChange={setAutoReplyEnabled} />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => updateSettings.mutate({ accountId: "default", messageDelay: messageDelay * 1000, notificationThreshold, autoReplyEnabled })}
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    حفظ الإعدادات
                  </Button>

                  {waSettings && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <p className="text-2xl font-bold text-primary">{waSettings.totalMessagesSent}</p>
                        <p className="text-xs text-muted-foreground">إجمالي الرسائل</p>
                      </div>
                      <div className="text-center p-3 bg-muted/20 rounded-lg">
                        <p className="text-2xl font-bold text-green-400">{waSettings.messagesSentToday}</p>
                        <p className="text-xs text-muted-foreground">رسائل اليوم</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      قواعد الرد التلقائي
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowNewRule(true)}>
                      <Plus className="w-4 h-4 ml-1" />
                      قاعدة جديدة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showNewRule && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="pt-4 space-y-3">
                        <div>
                          <Label>كلمات التفعيل (مفصولة بفاصلة)</Label>
                          <Input value={newRule.keywords} onChange={e => setNewRule(r => ({ ...r, keywords: e.target.value }))} placeholder="سعر, كم, خدمة, price" className="mt-1" />
                        </div>
                        <div>
                          <Label>قالب الرد</Label>
                          <Textarea value={newRule.template} onChange={e => setNewRule(r => ({ ...r, template: e.target.value }))} placeholder="شكراً على تواصلك! يسعدنا الرد على استفسارك..." className="mt-1 h-20" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch checked={newRule.useAI} onCheckedChange={v => setNewRule(r => ({ ...r, useAI: v }))} />
                          <Label>استخدام الذكاء الاصطناعي لتخصيص الرد</Label>
                        </div>
                        {newRule.useAI && (
                          <div>
                            <Label>سياق الذكاء الاصطناعي</Label>
                            <Textarea value={newRule.aiContext} onChange={e => setNewRule(r => ({ ...r, aiContext: e.target.value }))} placeholder="أنت مساعد تجاري سعودي متخصص في اللحوم..." className="mt-1 h-16" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => addAutoReplyRule.mutate({ accountId: "default", triggerKeywords: newRule.keywords.split(",").map(k => k.trim()).filter(Boolean), replyTemplate: newRule.template, useAI: newRule.useAI, aiContext: newRule.aiContext || undefined })} disabled={addAutoReplyRule.isPending || !newRule.keywords || !newRule.template}>
                            {addAutoReplyRule.isPending ? <Loader2 className="w-3 h-3 animate-spin ml-1" /> : null}
                            حفظ
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowNewRule(false)}>إلغاء</Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {autoReplyRules?.length === 0 && !showNewRule && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">لا توجد قواعد بعد</p>
                    </div>
                  )}

                  {autoReplyRules?.map((rule: any) => (
                    <Card key={rule.id} className={`border ${rule.isActive ? "border-green-500/20 bg-green-500/5" : "border-border opacity-60"}`}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1 mb-2">
                              {(rule.triggerKeywords as string[]).map((kw: string) => (
                                <span key={kw} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  <Tag className="w-2.5 h-2.5" />{kw}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{rule.replyTemplate}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {rule.useAI && <span className="text-xs text-purple-400 flex items-center gap-1"><Sparkles className="w-3 h-3" />ذكاء اصطناعي</span>}
                              <span className="text-xs text-muted-foreground">تفعيل: {rule.matchCount}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch checked={rule.isActive} onCheckedChange={v => updateAutoReplyRule.mutate({ id: rule.id, isActive: v })} />
                            <Button variant="ghost" size="sm" onClick={() => deleteAutoReplyRule.mutate({ id: rule.id })} className="text-destructive hover:text-destructive h-7 w-7 p-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Dialog إضافة/تعديل حساب ===== */}
      <Dialog open={showAddAccount} onOpenChange={(v) => { setShowAddAccount(v); if (!v) setEditingAccount(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "تعديل الحساب" : "إضافة حساب واتساب"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم الحساب *</Label>
              <Input placeholder="مثال: واتساب المبيعات" value={accountForm.label} onChange={e => setAccountForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف (مع كود الدولة) *</Label>
              <Input placeholder="+966501234567" dir="ltr" value={accountForm.phoneNumber} onChange={e => setAccountForm(f => ({ ...f, phoneNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>دور الحساب</Label>
              <Select value={accountForm.role} onValueChange={(v: any) => setAccountForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk_sender">إرسال جماعي</SelectItem>
                  <SelectItem value="human_handoff">تحويل للموظف</SelectItem>
                  <SelectItem value="both">إرسال + تحويل</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[accountForm.role]?.desc}</p>
            </div>
            <div className="space-y-2">
              <Label>اسم الموظف المسؤول (اختياري)</Label>
              <Input placeholder="مثال: أحمد محمد" value={accountForm.assignedEmployee} onChange={e => setAccountForm(f => ({ ...f, assignedEmployee: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea placeholder="أي معلومات إضافية..." rows={2} value={accountForm.notes} onChange={e => setAccountForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>إلغاء</Button>
            <Button onClick={handleAccountSave} disabled={!accountForm.label || !accountForm.phoneNumber || addAccount.isPending || updateAccount.isPending}>
              {(addAccount.isPending || updateAccount.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {editingAccount ? "حفظ التعديلات" : "إضافة الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== AlertDialog تأكيد حذف الحساب ===== */}
      <AlertDialog open={!!deleteAccountTarget} onOpenChange={() => setDeleteAccountTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب "{deleteAccountTarget?.label}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteAccountTarget && deleteAccount.mutate({ id: deleteAccountTarget.id })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
