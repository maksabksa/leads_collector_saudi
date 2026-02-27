import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Instagram, MessageSquare, Zap, Users,
  ChevronRight, Hash, Globe, Phone, Mail, Plus, CheckCircle,
  Loader2, Sparkles, Building2, ExternalLink, AlertCircle, Search,
  RefreshCw, Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

// ===== تبويب واتساب =====
function WhatsAppTab() {
  const [, setLocation] = useLocation();
  const { data: accounts } = trpc.waAccounts.listAccounts.useQuery();
  const { data: chatStats } = trpc.waSettings.getChatStats.useQuery({ accountId: "all" }, {
    refetchInterval: 30000,
  });

  const connectedCount = accounts?.filter((a: any) => a.status === "connected").length ?? 0;
  const totalCount = accounts?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<MessageCircle className="h-5 w-5 text-green-400" />}
          label="المحادثات النشطة"
          value={chatStats?.total ?? 0}
          color="green"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          label="رسائل اليوم"
          value={chatStats?.archived ?? 0}
          color="blue"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-400" />}
          label="الحسابات المتصلة"
          value={`${connectedCount}/${totalCount}`}
          color="purple"
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-yellow-400" />}
          label="رسائل غير مقروءة"
          value={chatStats?.unread ?? 0}
          color="yellow"
        />
      </div>

      {/* روابط سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuickActionCard
          icon={<MessageCircle className="h-6 w-6 text-green-400" />}
          title="المحادثات"
          description="عرض وإدارة جميع محادثات واتساب"
          badge={chatStats?.unread ? `${chatStats.unread} غير مقروء` : undefined}
          badgeVariant="destructive"
          onClick={() => setLocation("/chats")}
          color="green"
        />
        <QuickActionCard
          icon={<MessageSquare className="h-6 w-6 text-blue-400" />}
          title="إرسال جماعي"
          description="إرسال رسائل لمجموعات من العملاء"
          onClick={() => setLocation("/bulk-whatsapp")}
          color="blue"
        />
        <QuickActionCard
          icon={<Zap className="h-6 w-6 text-yellow-400" />}
          title="الردود التلقائية"
          description="إعداد قواعد الرد الآلي على الرسائل"
          onClick={() => setLocation("/whatsapp-auto")}
          color="yellow"
        />
        <QuickActionCard
          icon={<Settings className="h-6 w-6 text-purple-400" />}
          title="حسابات واتساب"
          description="إدارة الأرقام المتصلة بالنظام"
          onClick={() => setLocation("/whatsapp-accounts")}
          color="purple"
        />
      </div>

      {/* قائمة الحسابات */}
      {accounts && accounts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            الحسابات المتصلة
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map((acc: any) => (
              <div
                key={acc.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors cursor-pointer"
                onClick={() => setLocation("/chats")}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                  acc.status === "connected"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}>
                  {acc.name?.charAt(0) ?? "W"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name || acc.phone}</p>
                  <p className="text-xs text-muted-foreground">{acc.phone}</p>
                </div>
                <Badge variant={acc.status === "connected" ? "default" : "destructive"} className="text-xs shrink-0">
                  {acc.status === "connected" ? "متصل" : "غير متصل"}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!accounts || accounts.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <p className="font-semibold">لا توجد حسابات واتساب</p>
            <p className="text-sm text-muted-foreground mt-1">أضف حساباً للبدء في إرسال الرسائل</p>
          </div>
          <Button onClick={() => setLocation("/whatsapp-accounts")} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة حساب واتساب
          </Button>
        </div>
      )}
    </div>
  );
}

// ===== تبويب إنستجرام =====
function InstagramTab() {
  const [hashtag, setHashtag] = useState("");
  const [niche, setNiche] = useState("");
  const [selectedSearchId, setSelectedSearchId] = useState<number | null>(null);
  const [addLeadAccount, setAddLeadAccount] = useState<any | null>(null);
  const [leadForm, setLeadForm] = useState({ companyName: "", businessType: "", city: "", notes: "" });
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);

  const { data: searches, refetch: refetchSearches } = trpc.instagram.listSearches.useQuery();
  const { data: accounts, isLoading: accountsLoading } = trpc.instagram.getAccounts.useQuery(
    { searchId: selectedSearchId! },
    { enabled: !!selectedSearchId }
  );

  const startSearch = trpc.instagram.startSearch.useMutation({
    onSuccess: (data) => {
      toast.success(`تم البحث بنجاح — ${data.count} حساب`);
      refetchSearches();
      setSelectedSearchId(data.searchId);
      setHashtag("");
    },
    onError: (err) => {
      if (err.message.includes("INSTAGRAM_ACCESS_TOKEN")) {
        toast.error("يجب إعداد بيانات الاعتماد", {
          description: "أضف INSTAGRAM_ACCESS_TOKEN في إعدادات المشروع",
        });
      } else {
        toast.error("خطأ في البحث", { description: err.message });
      }
    },
  });

  const suggestHashtags = trpc.instagram.suggestHashtags.useMutation({
    onSuccess: (hashtags) => {
      setSuggestedHashtags(hashtags);
      toast.success(`${hashtags.length} هاشتاق مقترح`);
    },
    onError: () => toast.error("تعذر توليد الهاشتاقات"),
  });

  const addAsLead = trpc.instagram.addAsLead.useMutation({
    onSuccess: () => {
      toast.success("تمت الإضافة كعميل محتمل");
      setAddLeadAccount(null);
      setLeadForm({ companyName: "", businessType: "", city: "", notes: "" });
    },
    onError: (err) => toast.error("خطأ", { description: err.message }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* شريط البحث */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shrink-0">
            <Instagram className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">البحث بالهاشتاق</h3>
            <p className="text-xs text-muted-foreground">ابحث عن حسابات تجارية عبر الهاشتاقات</p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={hashtag}
              onChange={(e) => setHashtag(e.target.value)}
              placeholder="مثال: مطاعم_الرياض"
              className="pr-9 bg-background/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && hashtag.trim()) {
                  startSearch.mutate({ hashtag: hashtag.trim() });
                }
              }}
            />
          </div>
          <Button
            onClick={() => startSearch.mutate({ hashtag: hashtag.trim() })}
            disabled={!hashtag.trim() || startSearch.isPending}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white gap-2 shrink-0"
          >
            {startSearch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            بحث
          </Button>
        </div>

        {/* اقتراحات هاشتاق */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 flex-1">
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="مجال النشاط (مثال: مطاعم، عيادات)"
              className="bg-background/50 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => suggestHashtags.mutate({ niche })}
              disabled={!niche.trim() || suggestHashtags.isPending}
              className="gap-1 shrink-0"
            >
              {suggestHashtags.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              اقترح
            </Button>
          </div>
        </div>

        {suggestedHashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedHashtags.map((tag) => (
              <button
                key={tag}
                onClick={() => setHashtag(tag)}
                className="px-3 py-1 rounded-full text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 transition-colors"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* قائمة عمليات البحث */}
      {searches && searches.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            عمليات البحث السابقة
          </h3>
          <div className="flex flex-wrap gap-2">
            {searches.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedSearchId(s.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all",
                  selectedSearchId === s.id
                    ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                    : "bg-card/50 border-border/50 hover:bg-card"
                )}
              >
                <Hash className="h-3 w-3" />
                {s.hashtag}
                <Badge variant="secondary" className="text-xs px-1.5 py-0">{s.resultsCount}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* نتائج البحث */}
      {selectedSearchId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              النتائج
            </h3>
            {accountsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {accounts && accounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {accounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-pink-400 shrink-0">
                      {acc.username?.charAt(0)?.toUpperCase() ?? "I"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">@{acc.username}</p>
                        {acc.isVerified && <CheckCircle className="h-3 w-3 text-blue-400 shrink-0" />}
                      </div>
                      {acc.fullName && <p className="text-xs text-muted-foreground truncate">{acc.fullName}</p>}
                      <div className="flex items-center gap-3 mt-1">
                        {acc.followersCount && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {acc.followersCount.toLocaleString()}
                          </span>
                        )}
                        {acc.phone && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {acc.phone}
                          </span>
                        )}
                        {acc.website && (
                          <span className="text-xs text-blue-400 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            موقع
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-pink-500/30 hover:bg-pink-500/10 hover:text-pink-300"
                        onClick={() => {
                          setAddLeadAccount(acc);
                          setLeadForm({
                            companyName: acc.fullName || acc.username || "",
                            businessType: "",
                            city: "",
                            notes: acc.bio || "",
                          });
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        إضافة
                      </Button>
                      <a
                        href={`https://instagram.com/${acc.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 h-7 px-2 rounded-md text-xs text-muted-foreground hover:text-foreground border border-border/50 hover:bg-accent transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !accountsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد نتائج لهذا البحث</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Dialog إضافة كعميل */}
      <Dialog open={!!addLeadAccount} onOpenChange={(o) => !o && setAddLeadAccount(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-400" />
              إضافة كعميل محتمل
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>اسم النشاط التجاري *</Label>
              <Input
                value={leadForm.companyName}
                onChange={(e) => setLeadForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="اسم الحساب أو النشاط"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>نوع النشاط</Label>
                <Input
                  value={leadForm.businessType}
                  onChange={(e) => setLeadForm((f) => ({ ...f, businessType: e.target.value }))}
                  placeholder="مطعم، عيادة..."
                />
              </div>
              <div className="grid gap-1.5">
                <Label>المدينة</Label>
                <Input
                  value={leadForm.city}
                  onChange={(e) => setLeadForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="الرياض..."
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>ملاحظات</Label>
              <Input
                value={leadForm.notes}
                onChange={(e) => setLeadForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="أي معلومات إضافية..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLeadAccount(null)}>إلغاء</Button>
            <Button
              disabled={!leadForm.companyName.trim() || addAsLead.isPending}
              onClick={() => addAsLead.mutate({
                accountId: addLeadAccount.id,
                companyName: leadForm.companyName,
                businessType: leadForm.businessType,
                city: leadForm.city,
                notes: leadForm.notes,
              })}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white gap-2"
            >
              {addAsLead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              إضافة كعميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== مكونات مساعدة =====
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "green" | "blue" | "purple" | "yellow";
}) {
  const colorMap = {
    green: "bg-green-500/10 border-green-500/20",
    blue: "bg-blue-500/10 border-blue-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20",
  };
  return (
    <div className={cn("p-4 rounded-xl border flex flex-col gap-2", colorMap[color])}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickActionCard({ icon, title, description, badge, badgeVariant, onClick, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "destructive" | "secondary";
  onClick: () => void;
  color: "green" | "blue" | "purple" | "yellow";
}) {
  const colorMap = {
    green: "hover:border-green-500/40 hover:bg-green-500/5",
    blue: "hover:border-blue-500/40 hover:bg-blue-500/5",
    purple: "hover:border-purple-500/40 hover:bg-purple-500/5",
    yellow: "hover:border-yellow-500/40 hover:bg-yellow-500/5",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50 transition-all text-right w-full",
        colorMap[color]
      )}
    >
      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          {badge && <Badge variant={badgeVariant ?? "secondary"} className="text-xs">{badge}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

// ===== الصفحة الرئيسية =====
type MessageTab = "whatsapp" | "instagram";

export default function MessagesHub() {
  const [activeTab, setActiveTab] = useState<MessageTab>("whatsapp");
  const { data: chatStats } = trpc.waSettings.getChatStats.useQuery({ accountId: "all" }, {
    refetchInterval: 30000,
  });

  const tabs = [
    {
      id: "whatsapp" as MessageTab,
      label: "واتساب",
      icon: MessageCircle,
      color: "text-green-400",
      activeBg: "bg-green-500/10 border-green-500/30 text-green-300",
      badge: chatStats?.unread ?? 0,
      badgeColor: "bg-green-500",
    },
    {
      id: "instagram" as MessageTab,
      label: "إنستجرام",
      icon: Instagram,
      color: "text-pink-400",
      activeBg: "bg-pink-500/10 border-pink-500/30 text-pink-300",
      badge: 0,
      badgeColor: "bg-pink-500",
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* رأس الصفحة */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border/50">
          <div>
            <h1 className="text-xl font-bold">مركز الرسائل</h1>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة جميع قنوات التواصل من مكان واحد</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            تحديث
          </Button>
        </div>

        {/* تبويبات المنصات */}
        <div className="flex gap-2 px-6 pt-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  isActive
                    ? tab.activeBg
                    : "border-border/50 bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "" : tab.color)} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white font-bold",
                    tab.badgeColor
                  )}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* محتوى التبويب */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "whatsapp" && <WhatsAppTab />}
          {activeTab === "instagram" && <InstagramTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
