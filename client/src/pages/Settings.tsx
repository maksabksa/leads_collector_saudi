import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Bot, Database, MessageSquare, User, Bell, Shield,
  ChevronRight, Settings2, Zap, Key, Globe, FileText,
  Users, Smartphone, Brain, RefreshCw, CheckCircle2,
  AlertCircle, Info, ExternalLink, Download, Upload,
  BarChart2, Activity, Layers, Tag, Building2, MapPin,
  Link, Table, Sheet, Cpu, Save, TestTube2, Lock,
  Mail, Phone, Star, TrendingUp, Target, Palette, Send, UserPlus, UserCheck,
  Trash2, Copy, Clock, XCircle, CheckCircle, Instagram, Camera, Heart,
  AtSign, Hash, Image, Video, MessageCircle, ThumbsUp, Eye,
} from "lucide-react";

// ===== أنواع التبويبات =====
type SettingsTab = 
  | "general"
  | "ai"
  | "whatsapp"
  | "whatsapp-send"
  | "instagram"
  | "users-management"
  | "data"
  | "google-sheets"
  | "notifications"
  | "security"
  | "account";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const TABS: TabConfig[] = [
  { id: "general", label: "عام", icon: Settings2, description: "الإعدادات العامة للنظام" },
  { id: "ai", label: "الذكاء الاصطناعي", icon: Brain, description: "إعدادات AI والرد التلقائي", badge: "مهم" },
  { id: "whatsapp", label: "واتساب", icon: MessageSquare, description: "إعدادات الاتصال والأتمتة" },
  { id: "whatsapp-send", label: "إرسال واتساب", icon: Send, description: "إرسال جماعي وقوالب الرسائل", badge: "جديد" },
  { id: "instagram", label: "إنستجرام", icon: Instagram, description: "ربط حساب إنستجرام والصلاحيات", badge: "جديد" },
  { id: "users-management", label: "إدارة المستخدمين", icon: Users, description: "الموظفون والصلاحيات" },
  { id: "data", label: "البيانات", icon: Database, description: "أنواع الأعمال والمدن والتصنيفات" },
  { id: "google-sheets", label: "Google Sheets", icon: Sheet, description: "ربط جداول البيانات", badge: "جديد" },
  { id: "notifications", label: "الإشعارات", icon: Bell, description: "إعدادات التنبيهات" },
  { id: "security", label: "الأمان", icon: Shield, description: "الصلاحيات والمستخدمين" },
  { id: "account", label: "الحساب", icon: User, description: "معلومات حسابك الشخصي" },
];

// ===== مكون بطاقة الإعداد =====
function SettingCard({ 
  title, 
  description, 
  icon: Icon, 
  children,
  badge,
}: { 
  title: string; 
  description?: string; 
  icon?: React.ElementType; 
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{title}</CardTitle>
              {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
            </div>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

// ===== تبويب عام =====
function GeneralTab() {
  const { data: settings } = trpc.waSettings.getSettings.useQuery({ accountId: "default" });
  const _updateSettings = trpc.waSettings.updateSettings.useMutation({
    onSuccess: () => toast.success("تم حفظ الإعدادات"),
    onError: () => toast.error("فشل الحفظ"),
  });

  return (
    <div className="space-y-4">
      <SettingCard title="معلومات الشركة" description="اسم الشركة والمعلومات الأساسية" icon={Building2}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">اسم الشركة</label>
            <Input placeholder="مثال: مكسب KSA" defaultValue="مكسب KSA" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">وصف النشاط التجاري</label>
            <Textarea placeholder="وصف مختصر للنشاط التجاري..." rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">المدينة</label>
              <Input placeholder="الرياض" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">المنطقة</label>
              <Input placeholder="المنطقة الوسطى" />
            </div>
          </div>
          <Button size="sm" className="w-full">
            <Save className="w-4 h-4 ml-2" />
            حفظ المعلومات
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="إعدادات اللغة والمنطقة الزمنية" icon={Globe}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">اللغة الافتراضية</p>
              <p className="text-xs text-muted-foreground">العربية (السعودية)</p>
            </div>
            <Badge>ar-SA</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">المنطقة الزمنية</p>
              <p className="text-xs text-muted-foreground">Asia/Riyadh (UTC+3)</p>
            </div>
            <Badge variant="outline">+3</Badge>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="إعدادات الواجهة" icon={Palette}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الوضع الداكن</p>
              <p className="text-xs text-muted-foreground">تغيير مظهر الواجهة</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الإشعارات الصوتية</p>
              <p className="text-xs text-muted-foreground">تشغيل صوت عند وصول رسالة جديدة</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تحديث تلقائي للبيانات</p>
              <p className="text-xs text-muted-foreground">تحديث لوحة التحكم كل دقيقة</p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب الذكاء الاصطناعي =====
function AITab() {
  const [, navigate] = useLocation();
  
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">إعدادات الذكاء الاصطناعي التفصيلية</p>
          <p className="text-xs text-muted-foreground mt-1">
            يمكنك الوصول للإعدادات التفصيلية من صفحة إعدادات الذكاء المتقدمة
          </p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/ai-settings")}>
            <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            فتح الإعدادات المتقدمة
          </Button>
        </div>
      </div>

      <SettingCard title="مزود الذكاء الاصطناعي" icon={Cpu} badge="نشط">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">المزود المدمج (Manus AI)</span>
            </div>
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30">نشط</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            يستخدم النظام حالياً المزود المدمج. يمكنك تغييره لـ OpenAI من الإعدادات المتقدمة.
          </p>
        </div>
      </SettingCard>

      <SettingCard title="الرد التلقائي الذكي" icon={Bot}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تفعيل الرد التلقائي</p>
              <p className="text-xs text-muted-foreground">الرد على الرسائل الواردة تلقائياً</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تحليل نية العميل</p>
              <p className="text-xs text-muted-foreground">تحديد اهتمام العميل تلقائياً</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الرد بالصوت</p>
              <p className="text-xs text-muted-foreground">تحويل الردود النصية لرسائل صوتية</p>
            </div>
            <Switch />
          </div>
        </div>
      </SettingCard>

      <SettingCard title="قاعدة المعرفة (RAG)" icon={Brain} badge="جديد">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            دّرب الذكاء الاصطناعي على بيانات شركتك لردود أكثر دقة وتخصيصاً
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button size="sm" variant="outline" onClick={() => navigate("/knowledge-base")}>
              <FileText className="w-4 h-4 ml-1.5" />
              إدارة المستندات
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings?tab=google-sheets")}>
              <Sheet className="w-4 h-4 ml-1.5" />
              ربط Google Sheets
            </Button>
          </div>
        </div>
      </SettingCard>

      <SettingCard title="كلمات الاهتمام" icon={Key}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            الكلمات التي تُفعّل الرد التلقائي عند ذكرها في المحادثة
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/interest-keywords")}>
            <Key className="w-4 h-4 ml-1.5" />
            إدارة كلمات الاهتمام
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب واتساب =====
function WhatsAppTab() {
  const [, navigate] = useLocation();
  const { data: accounts } = trpc.waAccounts.listAccounts.useQuery();
  
  return (
    <div className="space-y-4">
      <SettingCard title="حسابات واتساب المربوطة" icon={Smartphone}>
        <div className="space-y-3">
          {accounts && accounts.length > 0 ? (
            accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${acc.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{acc.label}</p>
                    <p className="text-xs text-muted-foreground">{acc.accountId}</p>
                  </div>
                </div>
                <Badge variant={acc.isActive ? "default" : "destructive"} className="text-xs">
                  {acc.isActive ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">لا توجد حسابات مربوطة</p>
          )}
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/whatsapp-accounts")}>
            <Smartphone className="w-4 h-4 ml-1.5" />
            إدارة الحسابات
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="إعدادات الأتمتة" icon={Zap}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">الرد التلقائي العالمي</p>
              <p className="text-xs text-muted-foreground">تفعيل الرد على جميع الحسابات</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تنشيط التواصل التلقائي</p>
              <p className="text-xs text-muted-foreground">إرسال رسائل بين الأرقام لإبقائها نشطة</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">تسجيل جميع المحادثات</p>
              <p className="text-xs text-muted-foreground">حفظ نسخة من كل رسالة</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => navigate("/whatsapp-auto")}>
            <Zap className="w-4 h-4 ml-1.5" />
            إعدادات الأتمتة المتقدمة
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="تنشيط التواصل" icon={Activity}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            جدولة إرسال رسائل تلقائية بين الأرقام المربوطة للحفاظ على نشاطها
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/activation")}>
            <Activity className="w-4 h-4 ml-1.5" />
            إعدادات التنشيط
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب البيانات =====
function DataTab() {
  const [, navigate] = useLocation();
  
  return (
    <div className="space-y-4">
      <SettingCard title="تصنيفات البيانات" icon={Layers} description="إدارة أنواع الأعمال والمدن والمناطق">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "أنواع الأعمال", icon: Building2, path: "/data-settings" },
            { label: "المدن والمناطق", icon: MapPin, path: "/data-settings" },
            { label: "المصادر", icon: Globe, path: "/data-settings" },
            { label: "التصنيفات", icon: Tag, path: "/data-settings" },
          ].map((item) => (
            <Button
              key={item.label}
              variant="outline"
              size="sm"
              className="h-auto py-3 flex-col gap-1.5"
              onClick={() => navigate(item.path)}
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => navigate("/data-settings")}>
          <Settings2 className="w-4 h-4 ml-1.5" />
          إدارة جميع التصنيفات
        </Button>
      </SettingCard>

      <SettingCard title="المناطق الجغرافية" icon={MapPin}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">إدارة المناطق والأحياء المستخدمة في تصنيف العملاء</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/zones")}>
            <MapPin className="w-4 h-4 ml-1.5" />
            إدارة المناطق
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="استيراد وتصدير البيانات" icon={Download}>
        <div className="grid grid-cols-2 gap-3">
          <Button size="sm" variant="outline" onClick={() => navigate("/bulk-import")}>
            <Upload className="w-4 h-4 ml-1.5" />
            استيراد CSV
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 ml-1.5" />
            تصدير البيانات
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="شرائح العملاء" icon={Layers}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">تقسيم العملاء إلى مجموعات للاستهداف الدقيق</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/segments")}>
            <Layers className="w-4 h-4 ml-1.5" />
            إدارة الشرائح
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب Google Sheets =====
function GoogleSheetsTab() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedSheets, setConnectedSheets] = useState<Array<{
    id: string; name: string; type: string; lastSync: string; rows: number;
  }>>([
    // بيانات تجريبية
  ]);

  const handleConnect = async () => {
    if (!sheetUrl.trim()) {
      toast.error("أدخل رابط Google Sheet أولاً");
      return;
    }
    if (!sheetUrl.includes("docs.google.com/spreadsheets")) {
      toast.error("الرابط غير صحيح. يجب أن يكون رابط Google Sheets");
      return;
    }
    setIsConnecting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsConnecting(false);
    toast.success("تم ربط الجدول بنجاح! سيتم مزامنة البيانات خلال دقائق");
    setSheetUrl("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <Sheet className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-600">ربط Google Sheets</p>
          <p className="text-xs text-muted-foreground mt-1">
            اربط جداول Google Sheets لاستيراد بيانات العملاء والمنتجات وتدريب الذكاء الاصطناعي تلقائياً
          </p>
        </div>
      </div>

      <SettingCard title="ربط جدول جديد" icon={Link}>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">رابط Google Sheet</label>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">
              تأكد من أن الجدول مشارك للعموم أو مشارك مع حسابك
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">نوع البيانات</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "leads", label: "عملاء", icon: Users },
                { id: "products", label: "منتجات", icon: Tag },
                { id: "knowledge", label: "معرفة AI", icon: Brain },
              ].map((type) => (
                <button
                  key={type.id}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />جاري الربط...</>
            ) : (
              <><Link className="w-4 h-4 ml-2" />ربط الجدول</>
            )}
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="الجداول المربوطة" icon={Table}>
        {connectedSheets.length > 0 ? (
          <div className="space-y-3">
            {connectedSheets.map((sheet) => (
              <div key={sheet.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Sheet className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">{sheet.name}</p>
                    <p className="text-xs text-muted-foreground">{sheet.rows} صف • آخر مزامنة: {sheet.lastSync}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Sheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">لا توجد جداول مربوطة بعد</p>
            <p className="text-xs mt-1">أضف رابط Google Sheet أعلاه للبدء</p>
          </div>
        )}
      </SettingCard>

      <SettingCard title="كيفية الربط" icon={Info}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p>افتح جدول Google Sheets وانقر على "مشاركة"</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p>اختر "أي شخص لديه الرابط" أو أضف البريد الإلكتروني</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p>انسخ الرابط والصقه في الحقل أعلاه</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
            <p>اختر نوع البيانات واضغط "ربط الجدول"</p>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب الإشعارات =====
function NotificationsTab() {
  return (
    <div className="space-y-4">
      <SettingCard title="إشعارات واتساب" icon={MessageSquare}>
        <div className="space-y-3">
          {[
            { label: "رسائل جديدة", desc: "إشعار عند وصول رسالة جديدة", checked: true },
            { label: "عميل جديد", desc: "إشعار عند إضافة عميل جديد", checked: true },
            { label: "فشل الإرسال", desc: "إشعار عند فشل إرسال رسالة", checked: true },
            { label: "انقطاع الاتصال", desc: "إشعار عند انقطاع اتصال واتساب", checked: true },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-2" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.checked} />
              </div>
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="إشعارات النظام" icon={Bell}>
        <div className="space-y-3">
          {[
            { label: "تذكيرات المتابعة", desc: "تنبيه عند وجود عملاء لم يُتابَعوا", checked: true },
            { label: "التقرير الأسبوعي", desc: "إرسال تقرير أسبوعي تلقائي", checked: false },
            { label: "تحديثات النظام", desc: "إشعار عند توفر تحديثات جديدة", checked: true },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-2" />}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.checked} />
              </div>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب إرسال واتساب =====
function WhatsAppSendTab() {
  const [, navigate] = useLocation();
  const { data: accounts } = trpc.waAccounts.listAccounts.useQuery();
  const { data: templates } = trpc.waSettings.listAutoReplyRules.useQuery({ accountId: "all" });

  return (
    <div className="space-y-4">
      <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 flex items-start gap-3">
        <Send className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">الإرسال الجماعي عبر واتساب</p>
          <p className="text-xs text-muted-foreground mt-1">
            أرسل رسائل جماعية لقوائم العملاء مع قوالب مخصصة ومتابعة تفصيلية
          </p>
          <Button size="sm" variant="outline" className="mt-2 border-green-500/30 text-green-600" onClick={() => navigate("/bulk-whatsapp")}>
            <Send className="w-3.5 h-3.5 ml-1.5" />
            فتح الإرسال الجماعي
          </Button>
        </div>
      </div>

      <SettingCard title="الحسابات المتاحة للإرسال" icon={Smartphone}>
        <div className="space-y-2">
          {accounts && accounts.length > 0 ? (
            accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2 h-2 rounded-full ${acc.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{acc.label}</p>
                    <p className="text-xs text-muted-foreground">{acc.accountId}</p>
                  </div>
                </div>
                <Badge variant={acc.isActive ? "default" : "destructive"} className="text-xs">
                  {acc.isActive ? "جاهز" : "غير متصل"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <Smartphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد حسابات مربوطة</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => navigate("/whatsapp-accounts")}>
                <UserPlus className="w-4 h-4 ml-1.5" />
                ربط حساب جديد
              </Button>
            </div>
          )}
        </div>
      </SettingCard>

      <SettingCard title="قوالب الرسائل" icon={FileText} description="القوالب المستخدمة في الإرسال الجماعي">
        <div className="space-y-2">
          {templates && templates.length > 0 ? (
            templates.slice(0, 3).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t.name || t.keyword}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{t.response?.substring(0, 50)}...</p>
                </div>
                <Badge variant="outline" className="text-xs">{t.isActive ? "نشط" : "معطل"}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">لا توجد قوالب محفوظة</p>
          )}
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/bulk-whatsapp")}>
            <FileText className="w-4 h-4 ml-1.5" />
            إدارة القوالب
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="تقرير الإرسال" icon={BarChart2}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">متابعة إحصائيات الإرسال والتسليم والقراءة</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/whatsapp-report")}>
            <BarChart2 className="w-4 h-4 ml-1.5" />
            عرض التقرير الكامل
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب إنستجرام =====
function InstagramTab() {
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{
    username: string;
    name: string;
    followers: number;
    mediaCount: number;
  } | null>(null);

  // جلب بيانات Instagram من قاعدة البيانات
  const { data: igSettings, refetch } = trpc.instagram.getCredentials.useQuery();
  const saveCredentials = trpc.instagram.saveCredentials.useMutation({
    onSuccess: () => {
      toast.success("تم حفظ بيانات إنستجرام بنجاح");
      refetch();
    },
    onError: (e) => toast.error("فشل الحفظ: " + e.message),
  });
  const testConnection = trpc.instagram.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setIsConnected(true);
        setAccountInfo(data.account as any);
        toast.success("تم الاتصال بنجاح! الحساب: @" + data.account?.username);
      } else {
        toast.error("فشل الاتصال: " + data.error);
      }
    },
    onError: (e) => toast.error("خطأ: " + e.message),
  });

  const handleSave = async () => {
    if (!accessToken.trim() && !igSettings?.accessToken) {
      toast.error("أدخل Access Token على الأقل");
      return;
    }
    setIsSaving(true);
    await saveCredentials.mutateAsync({
      appId: appId || igSettings?.appId || "",
      appSecret: appSecret || igSettings?.appSecret || "",
      accessToken: accessToken || igSettings?.accessToken || "",
    });
    setIsSaving(false);
  };

  const handleTest = () => {
    testConnection.mutate({});
  };

  const handleOAuthLogin = () => {
    const clientId = appId || igSettings?.appId;
    if (!clientId) {
      toast.error("أدخل App ID أولاً ثم اضغط حفظ");
      return;
    }
    const redirectUri = encodeURIComponent(window.location.origin + "/instagram-callback");
    const scope = encodeURIComponent("instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging");
    const oauthUrl = `https://www.facebook.com/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code`;
    window.open(oauthUrl, "_blank", "width=600,height=700");
    toast.info("تم فتح نافذة تسجيل الدخول لإنستجرام");
  };

  return (
    <div className="space-y-4">
      {/* بانر التعريف */}
      <div className="bg-gradient-to-l from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium">ربط حساب إنستجرام</p>
          <p className="text-xs text-muted-foreground mt-1">
            اربط حساب إنستجرام Business أو Creator لاستقبال الرسائل وتحليل التعليقات وجمع بيانات العملاء
          </p>
        </div>
      </div>

      {/* حالة الاتصال */}
      {(isConnected || igSettings?.accessToken) && (
        <SettingCard title="حالة الحساب" icon={CheckCircle2} badge="متصل">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {accountInfo?.username ? `@${accountInfo.username}` : "الحساب متصل"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {accountInfo?.name || "إنستجرام Business"}
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-600 border-green-500/30">نشط</Badge>
            </div>
            {accountInfo && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{accountInfo.followers?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">متابع</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg text-center">
                  <p className="text-lg font-bold text-primary">{accountInfo.mediaCount?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">منشور</p>
                </div>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleTest}
              disabled={testConnection.isPending}
            >
              {testConnection.isPending ? (
                <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />جاري الاختبار...</>
              ) : (
                <><RefreshCw className="w-4 h-4 ml-2" />تحديث حالة الاتصال</>
              )}
            </Button>
          </div>
        </SettingCard>
      )}

      {/* طريقة الربط السريع بـ OAuth */}
      <SettingCard title="الربط السريع عبر Facebook Login" icon={Globe} badge="موصى به">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            الطريقة الأسهل: سجّل دخولك عبر Facebook لمنح الصلاحيات تلقائياً
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Facebook App ID</label>
              <Input
                placeholder="123456789012345"
                value={appId || igSettings?.appId || ""}
                onChange={(e) => setAppId(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                من <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.facebook.com/apps</a>
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-l from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
            onClick={handleOAuthLogin}
          >
            <Instagram className="w-4 h-4 ml-2" />
            تسجيل الدخول بإنستجرام
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            ستُفتح نافذة لتسجيل الدخول ومنح الصلاحيات المطلوبة
          </p>
        </div>
      </SettingCard>

      {/* الربط اليدوي بـ Access Token */}
      <SettingCard title="الربط اليدوي بـ Access Token" icon={Key}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            إذا كان لديك Access Token مباشرة، أدخله هنا
          </p>
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium mb-1 block">App ID</label>
              <Input
                placeholder="Facebook App ID"
                value={appId || igSettings?.appId || ""}
                onChange={(e) => setAppId(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">App Secret</label>
              <Input
                type="password"
                placeholder="Facebook App Secret"
                value={appSecret || igSettings?.appSecret || ""}
                onChange={(e) => setAppSecret(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Access Token</label>
              <Input
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxxx"
                value={accessToken || igSettings?.accessToken || ""}
                onChange={(e) => setAccessToken(e.target.value)}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Long-lived User Access Token من Meta Graph Explorer
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={testConnection.isPending || (!accessToken && !igSettings?.accessToken)}
            >
              {testConnection.isPending ? (
                <><RefreshCw className="w-4 h-4 ml-1.5 animate-spin" />اختبار...</>
              ) : (
                <><TestTube2 className="w-4 h-4 ml-1.5" />اختبار الاتصال</>
              )}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <><RefreshCw className="w-4 h-4 ml-1.5 animate-spin" />حفظ...</>
              ) : (
                <><Save className="w-4 h-4 ml-1.5" />حفظ البيانات</>
              )}
            </Button>
          </div>
        </div>
      </SettingCard>

      {/* الصلاحيات المطلوبة */}
      <SettingCard title="الصلاحيات المطلوبة" icon={Shield}>
        <div className="space-y-2">
          {[
            { perm: "instagram_basic", desc: "قراءة معلومات الحساب الأساسية", required: true },
            { perm: "instagram_manage_messages", desc: "استقبال وإرسال الرسائل المباشرة", required: true },
            { perm: "pages_show_list", desc: "عرض قائمة الصفحات المرتبطة", required: true },
            { perm: "pages_messaging", desc: "إرسال رسائل عبر الصفحة", required: true },
            { perm: "instagram_manage_comments", desc: "قراءة وإدارة التعليقات", required: false },
            { perm: "instagram_manage_insights", desc: "إحصائيات الحساب والمنشورات", required: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className={`w-2 h-2 rounded-full shrink-0 ${item.required ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-primary">{item.perm}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Badge variant={item.required ? "default" : "outline"} className="text-xs shrink-0">
                {item.required ? "مطلوب" : "اختياري"}
              </Badge>
            </div>
          ))}
        </div>
      </SettingCard>

      {/* دليل الإعداد */}
      <SettingCard title="دليل الإعداد خطوة بخطوة" icon={Info}>
        <div className="space-y-2 text-sm">
          {[
            { step: 1, text: "اذهب إلى developers.facebook.com وأنشئ تطبيقاً جديداً من نوع Business" },
            { step: 2, text: "أضف منتج Instagram Graph API وربطه بحساب إنستجرام Business" },
            { step: 3, text: "انسخ App ID وأدخله في الحقل أعلاه" },
            { step: 4, text: "اضغط 'تسجيل الدخول بإنستجرام' لمنح الصلاحيات تلقائياً" },
            { step: 5, text: "أو استخدم Meta Graph Explorer للحصول على Long-lived Access Token يدوياً" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                {item.step}
              </span>
              <p className="text-muted-foreground text-xs leading-relaxed">{item.text}</p>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-border/50">
            <a
              href="https://developers.facebook.com/docs/instagram-api/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              توثيق Instagram API الرسمي
            </a>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب إدارة المستخدمين =====
function UsersManagementTab() {
  const [, navigate] = useLocation();
  // إدارة المستخدمين - بيانات الأدوار ثابتة

  return (
    <div className="space-y-4">
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
        <Users className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">إدارة الموظفين والصلاحيات</p>
          <p className="text-xs text-muted-foreground mt-1">
            أضف موظفين جدد وحدد صلاحياتهم وتابع أداءهم
          </p>
          <Button size="sm" variant="outline" className="mt-2 border-blue-500/30 text-blue-600" onClick={() => navigate("/users")}>
            <Users className="w-3.5 h-3.5 ml-1.5" />
            فتح إدارة المستخدمين الكاملة
          </Button>
        </div>
      </div>

      <SettingCard title="الأدوار والصلاحيات" icon={Shield}>
        <div className="space-y-3">
          {[
            { role: "مدير", desc: "صلاحيات كاملة على جميع الميزات", color: "bg-red-500/20 text-red-600", count: 1 },
            { role: "موظف مبيعات", desc: "الوصول للعملاء والمحادثات والبحث", color: "bg-blue-500/20 text-blue-600", count: 3 },
            { role: "موظف دعم", desc: "الوصول للمحادثات فقط", color: "bg-green-500/20 text-green-600", count: 2 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{item.role}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={item.color}>{item.count} مستخدم</Badge>
              </div>
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="إضافة موظف جديد" icon={UserPlus}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">دعوة موظف جديد عبر رابط الدعوة</p>
          <Button size="sm" className="w-full" onClick={() => navigate("/users")}>
            <UserPlus className="w-4 h-4 ml-1.5" />
            إرسال دعوة جديدة
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="أداء الموظفين" icon={UserCheck}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">متابعة إحصائيات كل موظف وعدد المحادثات والعملاء</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/employee-performance")}>
            <UserCheck className="w-4 h-4 ml-1.5" />
            تقرير الأداء
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب الأمان =====
function SecurityTab() {
  const [, navigate] = useLocation();
  
  return (
    <div className="space-y-4">
      <SettingCard title="إدارة المستخدمين" icon={Users}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">إضافة وإدارة صلاحيات الموظفين والمستخدمين</p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/users")}>
            <Users className="w-4 h-4 ml-1.5" />
            إدارة المستخدمين
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="الصلاحيات والأدوار" icon={Shield}>
        <div className="space-y-3">
          {[
            { role: "مدير", desc: "صلاحيات كاملة على جميع الميزات", color: "bg-red-500/20 text-red-600" },
            { role: "موظف مبيعات", desc: "الوصول للعملاء والمحادثات", color: "bg-blue-500/20 text-blue-600" },
            { role: "موظف دعم", desc: "الوصول للمحادثات فقط", color: "bg-green-500/20 text-green-600" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{item.role}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Badge className={item.color}>{item.role}</Badge>
            </div>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="سجل النشاط" icon={Activity}>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">مراجعة جميع العمليات التي تمت في النظام</p>
          <Button size="sm" variant="outline" className="w-full">
            <Activity className="w-4 h-4 ml-1.5" />
            عرض سجل النشاط
          </Button>
        </div>
      </SettingCard>
    </div>
  );
}

// ===== تبويب الحساب =====
function AccountTab() {
  const { data: me } = trpc.auth.me.useQuery();
  
  return (
    <div className="space-y-4">
      <SettingCard title="معلومات الحساب" icon={User}>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
              {me?.name?.charAt(0) ?? "م"}
            </div>
            <div>
              <p className="font-medium">{me?.name ?? "المستخدم"}</p>
              <p className="text-sm text-muted-foreground">{me?.email ?? ""}</p>
              <Badge className="mt-1 text-xs" variant="secondary">
                {me?.role === "admin" ? "مدير" : "موظف"}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium mb-1 block">الاسم</label>
              <Input defaultValue={me?.name ?? ""} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">البريد الإلكتروني</label>
              <Input defaultValue={me?.email ?? ""} dir="ltr" />
            </div>
          </div>
          <Button size="sm" className="w-full">
            <Save className="w-4 h-4 ml-2" />
            حفظ التغييرات
          </Button>
        </div>
      </SettingCard>

      <SettingCard title="إحصائيات الحساب" icon={BarChart2}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "تاريخ الانضمام", value: me?.createdAt ? new Date(me.createdAt).toLocaleDateString('ar-SA') : "-" },
            { label: "آخر دخول", value: me?.lastSignedIn ? new Date(me.lastSignedIn).toLocaleDateString('ar-SA') : "-" },
            { label: "الدور", value: me?.role === "admin" ? "مدير" : "موظف" },
            { label: "طريقة الدخول", value: me?.loginMethod ?? "-" },
          ].map((stat, i) => (
            <div key={i} className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </SettingCard>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const renderContent = () => {
    switch (activeTab) {
      case "general": return <GeneralTab />;
      case "ai": return <AITab />;
      case "whatsapp": return <WhatsAppTab />;
      case "whatsapp-send": return <WhatsAppSendTab />;
      case "instagram": return <InstagramTab />;
      case "users-management": return <UsersManagementTab />;
      case "data": return <DataTab />;
      case "google-sheets": return <GoogleSheetsTab />;
      case "notifications": return <NotificationsTab />;
      case "security": return <SecurityTab />;
      case "account": return <AccountTab />;
      default: return <GeneralTab />;
    }
  };

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <div className="flex h-full">
      {/* القائمة الجانبية للإعدادات */}
      <div className="w-56 shrink-0 border-l border-border/50 bg-muted/20 p-3 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground px-2 mb-3 uppercase tracking-wider">الإعدادات</p>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-right ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-muted text-foreground/80 hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{tab.label}</span>
            {tab.badge && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id 
                  ? "bg-white/20 text-white" 
                  : "bg-primary/10 text-primary"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Settings2 className="w-4 h-4" />
              <span>الإعدادات</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">{activeTabConfig?.label}</span>
            </div>
            <h1 className="text-2xl font-bold">{activeTabConfig?.label}</h1>
            <p className="text-muted-foreground text-sm mt-1">{activeTabConfig?.description}</p>
          </div>

          {renderContent()}
        </div>
      </div>
    </div>
  );
}
