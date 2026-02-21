import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Smartphone,
  Plus,
  Pencil,
  Trash2,
  Users,
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  Zap,
  UserCheck,
  Layers,
  RefreshCw,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ===== أنواع الأدوار =====
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

// ===== مكون بطاقة الحساب =====
type AccountType = {
  id: number;
  accountId: string;
  label: string;
  phoneNumber: string;
  role: string;
  assignedEmployee: string | null;
  isActive: boolean;
  notes: string | null;
  sortOrder: number;
};

function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: {
  account: AccountType;
  onEdit: (account: AccountType) => void;
  onDelete: (id: number, label: string) => void;
  onToggle: (id: number, active: boolean) => void;
}) {
  const roleInfo = ROLE_LABELS[account.role] || ROLE_LABELS.bulk_sender;
  const RoleIcon = roleInfo.icon;

  return (
    <div
      className={`bg-card border rounded-xl p-5 space-y-3 transition-all ${
        account.isActive ? "border-border" : "border-border/40 opacity-60"
      }`}
    >
      {/* رأس البطاقة */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              account.isActive ? "bg-primary/10" : "bg-muted"
            }`}
          >
            <Smartphone
              className={`w-5 h-5 ${account.isActive ? "text-primary" : "text-muted-foreground"}`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{account.label}</p>
            <p className="text-sm text-muted-foreground font-mono" dir="ltr">
              {account.phoneNumber}
            </p>
          </div>
        </div>
        <Switch
          checked={account.isActive}
          onCheckedChange={(v) => onToggle(account.id, v)}
        />
      </div>

      {/* الدور ونوع الحساب */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={`${roleInfo.color} border text-xs flex items-center gap-1`}>
          <RoleIcon className="w-3 h-3" />
          {roleInfo.label}
        </Badge>
        {(account as any).accountType && (
          <Badge variant="outline" className={`text-xs ${
            (account as any).accountType === 'collection' ? 'border-blue-400 text-blue-400' :
            (account as any).accountType === 'sales' ? 'border-green-400 text-green-400' :
            (account as any).accountType === 'analysis' ? 'border-purple-400 text-purple-400' :
            'border-orange-400 text-orange-400'
          }`}>
            {(account as any).accountType === 'collection' ? 'تجميع' :
             (account as any).accountType === 'sales' ? 'سيلز' :
             (account as any).accountType === 'analysis' ? 'تحليل' : 'متابعة'}
          </Badge>
        )}
        {account.assignedEmployee && (
          <Badge variant="outline" className="text-xs">
            <UserCheck className="w-3 h-3 ml-1" />
            {account.assignedEmployee}
          </Badge>
        )}
      </div>

      {/* الوصف */}
      <p className="text-xs text-muted-foreground">{roleInfo.desc}</p>

      {/* ملاحظات */}
      {account.notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded p-2">{account.notes}</p>
      )}

      {/* أزرار */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onEdit(account)}
        >
          <Pencil className="w-3 h-3 ml-1" />
          تعديل
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(account.id, account.label)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ===== مكون بطاقة إشعار الاهتمام =====
function AlertCard({
  alert,
  handoffAccounts,
  onTransfer,
  onDismiss,
}: {
  alert: {
    id: number;
    phone: string;
    contactName: string | null;
    triggerMessage: string | null;
    interestScore: number;
    detectedKeywords: string[] | null;
    status: string;
    handoffPhone: string | null;
    transferredAt: Date | null;
    createdAt: Date;
  };
  handoffAccounts: { accountId: string; label: string; phoneNumber: string; assignedEmployee: string | null }[];
  onTransfer: (alertId: number, accountId: string) => void;
  onDismiss: (alertId: number) => void;
}) {
  const [selectedAccount, setSelectedAccount] = useState("");

  const scoreColor =
    alert.interestScore >= 70
      ? "text-red-400"
      : alert.interestScore >= 40
      ? "text-yellow-400"
      : "text-green-400";

  const scoreBg =
    alert.interestScore >= 70
      ? "bg-red-500/10 border-red-500/20"
      : alert.interestScore >= 40
      ? "bg-yellow-500/10 border-yellow-500/20"
      : "bg-green-500/10 border-green-500/20";

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${scoreBg}`}>
      {/* رأس الإشعار */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
            {(alert.contactName || alert.phone).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{alert.contactName || alert.phone}</p>
            <p className="text-xs text-muted-foreground font-mono" dir="ltr">
              {alert.phone}
            </p>
          </div>
        </div>
        <div className={`text-lg font-bold ${scoreColor} flex-shrink-0`}>
          {alert.interestScore}%
        </div>
      </div>

      {/* الرسالة المحفزة */}
      {alert.triggerMessage && (
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-xs text-muted-foreground mb-1">الرسالة:</p>
          <p className="text-sm">"{alert.triggerMessage}"</p>
        </div>
      )}

      {/* الكلمات المفتاحية */}
      {alert.detectedKeywords && alert.detectedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {alert.detectedKeywords.slice(0, 5).map((kw) => (
            <Badge key={kw} variant="outline" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>
      )}

      {/* التاريخ */}
      <p className="text-xs text-muted-foreground">
        {new Date(alert.createdAt).toLocaleString("ar-SA")}
      </p>

      {/* أزرار التحويل */}
      {alert.status === "pending" && (
        <div className="space-y-2 pt-1">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="اختر موظف للتحويل..." />
            </SelectTrigger>
            <SelectContent>
              {handoffAccounts.map((acc) => (
                <SelectItem key={acc.accountId} value={acc.accountId}>
                  {acc.label} {acc.assignedEmployee ? `(${acc.assignedEmployee})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700"
              disabled={!selectedAccount}
              onClick={() => onTransfer(alert.id, selectedAccount)}
            >
              <ArrowRightLeft className="w-3 h-3 ml-1" />
              تحويل للموظف
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-muted-foreground/30"
              onClick={() => onDismiss(alert.id)}
            >
              <XCircle className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* حالة التحويل */}
      {alert.status === "transferred" && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>تم التحويل إلى {alert.handoffPhone}</span>
        </div>
      )}

      {alert.status === "dismissed" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <XCircle className="w-4 h-4" />
          <span>تم الرفض</span>
        </div>
      )}
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function WhatsAppAccounts() {
  const [activeTab, setActiveTab] = useState<"accounts" | "alerts">("accounts");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);

  // Form state
  const ACCOUNT_TYPE_OPTIONS = [
    { value: "collection", label: "تجميع", desc: "تجميع البيانات والعملاء" },
    { value: "sales", label: "سيلز", desc: "إرسال عروض ومتابعة المبيعات" },
    { value: "analysis", label: "تحليل", desc: "تحليل العملاء والسوق" },
    { value: "followup", label: "متابعة", desc: "متابعة العملاء الحاليين" },
  ];

  const [form, setForm] = useState({
    label: "",
    phoneNumber: "",
    role: "bulk_sender" as "bulk_sender" | "human_handoff" | "both",
    assignedEmployee: "",
    notes: "",
    sortOrder: 0,
    accountType: "collection" as "collection" | "sales" | "analysis" | "followup",
  });

  // ===== Queries =====
  const { data: accounts = [], refetch: refetchAccounts } = trpc.waAccounts.listAccounts.useQuery();
  const { data: pendingAlerts = [], refetch: refetchAlerts } = trpc.waAccounts.listAlerts.useQuery({ status: "pending" });
  const { data: allAlerts = [], refetch: refetchAllAlerts } = trpc.waAccounts.listAlerts.useQuery({ status: "all", limit: 100 });
  const { data: alertStats } = trpc.waAccounts.getAlertStats.useQuery();
  const handoffAccounts = (accounts as any[]).filter(
    (a) => a.role === "human_handoff" || a.role === "both"
  );

  // ===== Mutations =====
  const addAccount = trpc.waAccounts.addAccount.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة الحساب بنجاح");
      setShowAddDialog(false);
      resetForm();
      refetchAccounts();
    },
    onError: (e) => toast.error("فشل الإضافة", { description: e.message }),
  });

  const updateAccount = trpc.waAccounts.updateAccount.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الحساب");
      setEditingAccount(null);
      refetchAccounts();
    },
    onError: (e) => toast.error("فشل التحديث", { description: e.message }),
  });

  const deleteAccount = trpc.waAccounts.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحساب");
      setDeleteTarget(null);
      refetchAccounts();
    },
    onError: (e) => toast.error("فشل الحذف", { description: e.message }),
  });

  const transferToHuman = trpc.waAccounts.transferToHuman.useMutation({
    onSuccess: (data) => {
      toast.success(`تم التحويل لـ ${data.employeeName || data.employeePhone}`, {
        action: {
          label: "فتح واتساب",
          onClick: () => window.open(data.waLink, "_blank"),
        },
        duration: 8000,
      });
      refetchAlerts();
      refetchAllAlerts();
    },
    onError: (e) => toast.error("فشل التحويل", { description: e.message }),
  });

  const dismissAlert = trpc.waAccounts.dismissAlert.useMutation({
    onSuccess: () => {
      refetchAlerts();
      refetchAllAlerts();
    },
  });

  const resetForm = () =>
    setForm({ label: "", phoneNumber: "", role: "bulk_sender", assignedEmployee: "", notes: "", sortOrder: 0, accountType: "collection" });

  const handleEdit = (account: typeof editingAccount) => {
    setEditingAccount(account);
    setForm({
      label: account!.label,
      phoneNumber: account!.phoneNumber,
      role: account!.role as "bulk_sender" | "human_handoff" | "both",
      assignedEmployee: account!.assignedEmployee || "",
      notes: account!.notes || "",
      sortOrder: account!.sortOrder,
      accountType: ((account as any).accountType || "collection") as "collection" | "sales" | "analysis" | "followup",
    });
  };

  const handleSave = () => {
    if (editingAccount) {
      updateAccount.mutate({
        id: editingAccount.id,
        ...form,
        assignedEmployee: form.assignedEmployee || undefined,
        notes: form.notes || undefined,
      });
    } else {
      addAccount.mutate({
        ...form,
        assignedEmployee: form.assignedEmployee || undefined,
        notes: form.notes || undefined,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="w-7 h-7 text-primary" />
            إدارة حسابات واتساب
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            أضف حسابات متعددة وحدد دور كل حساب — إرسال جماعي أو تحويل للموظف
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          إضافة حساب
        </Button>
      </div>

      {/* تبويبات */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "accounts"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          الحسابات ({(accounts as any[]).length})
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
            activeTab === "alerts"
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="w-4 h-4" />
          إشعارات الاهتمام
          {(alertStats?.pending ?? 0) > 0 && (
            <Badge className="bg-red-500 text-white text-xs h-5 px-1.5">
              {alertStats?.pending}
            </Badge>
          )}
        </button>
      </div>

      {/* ===== تبويب الحسابات ===== */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(ROLE_LABELS).map(([role, info]) => {
              const RoleIcon = info.icon;
              const count = (accounts as any[]).filter((a) => a.role === role).length;
              return (
                <div key={role} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <RoleIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{info.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* قائمة الحسابات */}
          {(accounts as any[]).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد حسابات واتساب</p>
              <p className="text-sm mt-1">أضف حسابك الأول لبدء الإرسال</p>
              <Button className="mt-4" onClick={() => { resetForm(); setShowAddDialog(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة حساب
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(accounts as any[]).map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={handleEdit}
                  onDelete={(id, label) => setDeleteTarget({ id, label })}
                  onToggle={(id, active) =>
                    updateAccount.mutate({ id, isActive: active })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== تبويب الإشعارات ===== */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* إحصائيات */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">{alertStats?.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">في الانتظار</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-400">{alertStats?.transferred ?? 0}</p>
                <p className="text-xs text-muted-foreground">تم التحويل</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{alertStats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">إجمالي الإشعارات</p>
              </div>
            </div>
          </div>

          {/* تحذير إذا لا يوجد حساب تحويل */}
          {handoffAccounts.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>
                لا يوجد حساب واتساب مخصص للتحويل. أضف حساباً بدور "تحويل للموظف" لتفعيل ميزة التحويل.
              </p>
            </div>
          )}

          {/* الإشعارات المعلقة */}
          {(pendingAlerts as any[]).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-red-400" />
                  إشعارات تحتاج مراجعة ({(pendingAlerts as any[]).length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => refetchAlerts()}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(pendingAlerts as any[]).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    handoffAccounts={handoffAccounts}
                    onTransfer={(alertId, accountId) =>
                      transferToHuman.mutate({ alertId, handoffAccountId: accountId })
                    }
                    onDismiss={(alertId) => dismissAlert.mutate({ alertId })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* السجل الكامل */}
          {(allAlerts as any[]).filter((a) => a.status !== "pending").length > 0 && (
            <div>
              <h3 className="font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                السجل السابق
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(allAlerts as any[])
                  .filter((a) => a.status !== "pending")
                  .slice(0, 10)
                  .map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      handoffAccounts={handoffAccounts}
                      onTransfer={() => {}}
                      onDismiss={() => {}}
                    />
                  ))}
              </div>
            </div>
          )}

          {(allAlerts as any[]).length === 0 && (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">لا توجد إشعارات اهتمام بعد</p>
              <p className="text-sm mt-1">
                ستظهر هنا تلقائياً عندما يُبدي عميل اهتماماً بالشراء
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== Dialog إضافة/تعديل حساب ===== */}
      <Dialog
        open={showAddDialog || !!editingAccount}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingAccount(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "تعديل الحساب" : "إضافة حساب واتساب"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* الاسم */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                اسم الحساب <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="مثال: واتساب 1 - إرسال جماعي"
              />
            </div>

            {/* رقم الهاتف */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                رقم واتساب <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.phoneNumber}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="966501234567+"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                أدخل الرقم مع رمز الدولة بدون مسافات
              </p>
            </div>

            {/* الدور */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">دور الحساب</label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, role: v as typeof form.role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulk_sender">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-400" />
                      إرسال جماعي فقط
                    </div>
                  </SelectItem>
                  <SelectItem value="human_handoff">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-400" />
                      تحويل للموظف فقط
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      إرسال جماعي + تحويل
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {ROLE_LABELS[form.role]?.desc}
              </p>
            </div>

            {/* اسم الموظف (للتحويل فقط) */}
            {(form.role === "human_handoff" || form.role === "both") && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  اسم الموظف المسؤول
                </label>
                <Input
                  value={form.assignedEmployee}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, assignedEmployee: e.target.value }))
                  }
                  placeholder="مثال: أحمد المبيعات"
                />
              </div>
            )}

            {/* ملاحظات */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                ملاحظات <span className="text-muted-foreground font-normal">(اختياري)</span>
              </label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
                rows={2}
                className="resize-none"
              />
            </div>

            {/* نوع الحساب */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">نوع الحساب</label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, accountType: opt.value as any }))}
                    className={`p-3 rounded-lg border text-right transition-all ${
                      form.accountType === opt.value
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary/50"
                    }`}>
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {/* الترتيب */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">الترتيب في القائمة</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))
                }
                min={0}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingAccount(null);
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !form.label ||
                !form.phoneNumber ||
                addAccount.isPending ||
                updateAccount.isPending
              }
            >
              {addAccount.isPending || updateAccount.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : null}
              {editingAccount ? "حفظ التعديلات" : "إضافة الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog تأكيد الحذف ===== */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الحساب</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف حساب "{deleteTarget?.label}"؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteAccount.mutate({ id: deleteTarget.id })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
