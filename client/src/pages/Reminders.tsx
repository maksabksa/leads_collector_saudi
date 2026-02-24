import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Bell, Phone, MessageSquare, Calendar, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, Plus, Trash2, CheckCheck, Zap,
  Users, ArrowRight, Filter, BellOff, Star, Flag, ChevronDown,
  ExternalLink
} from "lucide-react";

// ===== أنواع التذكيرات =====
const reminderTypeLabels: Record<string, { label: string; icon: any; color: string }> = {
  follow_up: { label: "متابعة", icon: ArrowRight, color: "text-blue-400" },
  call: { label: "اتصال", icon: Phone, color: "text-green-400" },
  message: { label: "رسالة", icon: MessageSquare, color: "text-purple-400" },
  meeting: { label: "اجتماع", icon: Calendar, color: "text-yellow-400" },
  custom: { label: "مخصص", icon: Bell, color: "text-gray-400" },
};

const priorityLabels: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "منخفضة", color: "text-gray-400", bg: "bg-gray-500/10" },
  medium: { label: "متوسطة", color: "text-blue-400", bg: "bg-blue-500/10" },
  high: { label: "عالية", color: "text-orange-400", bg: "bg-orange-500/10" },
  urgent: { label: "عاجلة", color: "text-red-400", bg: "bg-red-500/10" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "text-yellow-400" },
  done: { label: "مكتمل", color: "text-green-400" },
  snoozed: { label: "مؤجل", color: "text-gray-400" },
  cancelled: { label: "ملغي", color: "text-red-400" },
};

// ===== مكون بطاقة التذكير =====
function ReminderCard({
  reminder, onDone, onDelete, onCall, onMessage
}: {
  reminder: any;
  onDone: (id: number) => void;
  onDelete: (id: number) => void;
  onCall: (phone: string, name: string) => void;
  onMessage: (phone: string, name: string) => void;
}) {
  const typeInfo = reminderTypeLabels[reminder.reminderType] ?? reminderTypeLabels.follow_up;
  const priorityInfo = priorityLabels[reminder.priority] ?? priorityLabels.medium;
  const statusInfo = statusLabels[reminder.status] ?? statusLabels.pending;
  const TypeIcon = typeInfo.icon;

  const dueDate = new Date(reminder.dueDate);
  const now = new Date();
  const isOverdue = reminder.status === "pending" && dueDate < now;
  const isToday = dueDate.toDateString() === now.toDateString();
  const diffMs = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const timeLabel = isOverdue
    ? `متأخر ${Math.abs(diffDays)} يوم`
    : isToday
    ? "اليوم"
    : diffDays === 1
    ? "غداً"
    : `خلال ${diffDays} يوم`;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-all hover:shadow-md ${
      isOverdue ? "border-red-500/30 bg-red-500/5" :
      isToday ? "border-yellow-500/30 bg-yellow-500/5" :
      "border-border bg-card"
    }`}>
      {/* الصف الأول: العنوان + الأولوية */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${priorityInfo.bg}`}>
            <TypeIcon className={`w-4 h-4 ${typeInfo.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight">{reminder.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{reminder.leadName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={`text-xs px-1.5 py-0 ${priorityInfo.bg} ${priorityInfo.color} border-0`}>
            {priorityInfo.label}
          </Badge>
          <Badge className={`text-xs px-1.5 py-0 ${statusInfo.color} bg-transparent border-0`}>
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* الصف الثاني: الوقت + المدينة */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className={`flex items-center gap-1 ${isOverdue ? "text-red-400 font-medium" : isToday ? "text-yellow-400 font-medium" : ""}`}>
          <Clock className="w-3 h-3" />
          <span>{timeLabel}</span>
          <span className="text-muted-foreground/60">·</span>
          <span>{dueDate.toLocaleDateString("ar-SA")}</span>
        </div>
        {reminder.leadCity && (
          <span className="flex items-center gap-1">
            <span>📍</span>
            {reminder.leadCity}
          </span>
        )}
        {reminder.leadBusinessType && (
          <span className="text-muted-foreground/60">{reminder.leadBusinessType}</span>
        )}
      </div>

      {/* الملاحظات */}
      {reminder.notes && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 leading-relaxed">
          {reminder.notes}
        </p>
      )}

      {/* أزرار الإجراءات */}
      {reminder.status === "pending" && (
        <div className="flex items-center gap-2 pt-1">
          {/* زر اتصل الآن */}
          {reminder.leadPhone && (
            <Button
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-8 text-xs flex-1"
              onClick={() => onCall(reminder.leadPhone, reminder.leadName)}
            >
              <Phone className="w-3.5 h-3.5" />
              اتصل الآن
            </Button>
          )}

          {/* زر رسالة واتساب */}
          {reminder.leadPhone && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-8 text-xs flex-1 border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => onMessage(reminder.leadPhone, reminder.leadName)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              واتساب
            </Button>
          )}

          {/* زر إتمام */}
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
            onClick={() => onDone(reminder.id)}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            تم
          </Button>

          {/* زر حذف */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
            onClick={() => onDelete(reminder.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== نموذج إضافة تذكير =====
function AddReminderForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [leadId, setLeadId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [priority, setPriority] = useState("medium");
  const [reminderType, setReminderType] = useState("follow_up");
  const [assignedTo, setAssignedTo] = useState("");

  const { data: leadsData } = trpc.leads.list.useQuery({});
  const createReminder = trpc.reminders.create.useMutation({
    onSuccess: () => { toast.success("تم إنشاء التذكير"); onSuccess(); onClose(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const leads = (leadsData as any)?.leads ?? [];
  const selectedLead = leads.find((l: any) => String(l.id) === leadId);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        إضافة تذكير جديد
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* اختيار العميل */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">العميل *</label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="اختر عميلاً..." />
            </SelectTrigger>
            <SelectContent>
              {leads.map((l: any) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.companyName} - {l.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* نوع التذكير */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نوع التذكير</label>
          <Select value={reminderType} onValueChange={setReminderType}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(reminderTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* العنوان */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-muted-foreground">عنوان التذكير *</label>
          <input
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="مثال: متابعة عرض الأسعار..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* تاريخ الاستحقاق */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تاريخ الاستحقاق *</label>
          <input
            type="datetime-local"
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* الأولوية */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">الأولوية</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* المُسنَد إليه */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المُسنَد إليه (اختياري)</label>
          <input
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="اسم الموظف..."
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
          />
        </div>

        {/* الملاحظات */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-muted-foreground">ملاحظات (اختياري)</label>
          <textarea
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm resize-none"
            rows={2}
            placeholder="تفاصيل إضافية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!leadId || !title.trim() || !dueDate) return toast.error("يرجى ملء الحقول المطلوبة");
            const lead = leads.find((l: any) => String(l.id) === leadId);
            createReminder.mutate({
              leadId: Number(leadId),
              leadName: lead?.companyName ?? "",
              leadPhone: lead?.verifiedPhone ?? undefined,
              leadCity: lead?.city ?? undefined,
              leadBusinessType: lead?.businessType ?? undefined,
              reminderType: reminderType as any,
              title,
              notes: notes || undefined,
              dueDate,
              priority: priority as any,
              assignedTo: assignedTo || undefined,
            });
          }}
          disabled={createReminder.isPending}
        >
          {createReminder.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : "إنشاء التذكير"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Reminders() {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [filterPriority, setFilterPriority] = useState("all");

  const { data: allReminders, refetch } = trpc.reminders.list.useQuery({ status: filterStatus !== "all" ? filterStatus : undefined });
  const { data: stats } = trpc.reminders.stats.useQuery();
  const { data: overdueList } = trpc.reminders.overdue.useQuery();
  const { data: upcomingList } = trpc.reminders.upcoming.useQuery({ daysAhead: 3 });

  const updateReminder = trpc.reminders.update.useMutation({
    onSuccess: () => { toast.success("تم تحديث التذكير"); refetch(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const deleteReminder = trpc.reminders.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف التذكير"); refetch(); },
    onError: (e) => toast.error("خطأ: " + e.message),
  });
  const autoCreate = trpc.reminders.autoCreateForUnfollowed.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء ${(data as any).created} تذكير تلقائي`);
      refetch();
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const handleDone = (id: number) => {
    updateReminder.mutate({ id, status: "done" });
  };

  const handleDelete = (id: number) => {
    deleteReminder.mutate({ id });
  };

  const handleCall = (phone: string, name: string) => {
    // فتح رابط الاتصال
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`tel:${cleanPhone}`, "_blank");
    toast.success(`جاري الاتصال بـ ${name}...`);
  };

  const handleMessage = (phone: string, name: string) => {
    // فتح واتساب
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
    toast.success(`فتح محادثة واتساب مع ${name}...`);
  };

  const reminders = (allReminders ?? []) as any[];
  const filteredReminders = filterPriority !== "all"
    ? reminders.filter((r: any) => r.priority === filterPriority)
    : reminders;

  const s = stats as any;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" />
            نظام التذكيرات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تتبع متابعة العملاء وإدارة المهام المجدولة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => autoCreate.mutate({ daysSinceLastContact: 3 })}
            disabled={autoCreate.isPending}
          >
            {autoCreate.isPending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            تذكيرات تلقائية
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            تذكير جديد
          </Button>
        </div>
      </div>

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">معلقة</p>
                <p className="text-2xl font-bold text-yellow-400">{s?.pending ?? 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">متأخرة</p>
                <p className="text-2xl font-bold text-red-400">{s?.overdue ?? 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">قادمة (3 أيام)</p>
                <p className="text-2xl font-bold text-blue-400">{s?.upcoming ?? 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">مكتملة</p>
                <p className="text-2xl font-bold text-green-400">{s?.done ?? 0}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* نموذج إضافة تذكير */}
      {showForm && (
        <AddReminderForm onClose={() => setShowForm(false)} onSuccess={() => refetch()} />
      )}

      {/* تنبيه التذكيرات المتأخرة */}
      {(overdueList as any[])?.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold text-red-400">
              {(overdueList as any[]).length} تذكير متأخر يحتاج اهتمامك الآن
            </span>
          </div>
          <div className="space-y-2">
            {(overdueList as any[]).slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">{r.leadName} — {r.title}</span>
                <div className="flex gap-2">
                  {r.leadPhone && (
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 gap-1"
                      onClick={() => handleCall(r.leadPhone, r.leadName)}>
                      <Phone className="w-3 h-3" />
                      اتصل الآن
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => handleDone(r.id)}>
                    <CheckCheck className="w-3 h-3" />
                    تم
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* التبويبات */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="all" onClick={() => setFilterStatus("all")}>الكل ({s?.total ?? 0})</TabsTrigger>
            <TabsTrigger value="pending" onClick={() => setFilterStatus("pending")}>معلقة ({s?.pending ?? 0})</TabsTrigger>
            <TabsTrigger value="done" onClick={() => setFilterStatus("done")}>مكتملة ({s?.done ?? 0})</TabsTrigger>
          </TabsList>

          {/* فلتر الأولوية */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <Filter className="w-3 h-3 ml-1" />
              <SelectValue placeholder="الأولوية" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأولويات</SelectItem>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all" className="space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد تذكيرات</p>
              <p className="text-xs mt-1">اضغط على "تذكير جديد" أو "تذكيرات تلقائية"</p>
            </div>
          ) : (
            filteredReminders.map((r: any) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDone={handleDone}
                onDelete={handleDelete}
                onCall={handleCall}
                onMessage={handleMessage}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد تذكيرات معلقة</p>
            </div>
          ) : (
            filteredReminders.map((r: any) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDone={handleDone}
                onDelete={handleDelete}
                onCall={handleCall}
                onMessage={handleMessage}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="done" className="space-y-3">
          {filteredReminders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد تذكيرات مكتملة</p>
            </div>
          ) : (
            filteredReminders.map((r: any) => (
              <ReminderCard
                key={r.id}
                reminder={r}
                onDone={handleDone}
                onDelete={handleDelete}
                onCall={handleCall}
                onMessage={handleMessage}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
