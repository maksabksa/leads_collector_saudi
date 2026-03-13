/**
 * AddLeadModal - واجهة إضافة عميل موحدة ومتطورة
 * تشمل جميع حقول العميل + السوشيال ميديا + استرجاع ذكي تلقائي
 */
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import {
  Loader2, CheckCircle2, Search, Instagram, Globe, Phone, MapPin,
  Building2, Star, ExternalLink, ChevronDown, Clock, Sparkles,
  Twitter, Linkedin, Facebook, User, Hash, RefreshCw, X
} from "lucide-react";

// أيقونة TikTok
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.26 8.26 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z"/>
  </svg>
);

// أيقونة Snapchat
const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
    <path d="M12.166.5C8.917.5 6.09 2.5 6.09 6.5v.5c-.5.2-1.5.3-2 .5-.3.1-.5.3-.5.6s.2.5.5.6c.5.2 1.5.5 2 .8.2 1 .8 2 1.5 2.7-.5.3-1.2.5-2 .5-.5 0-1 .3-1 .8s.5.8 1 .8c1.5 0 3-.5 4.5-1.5.5.2 1 .3 1.5.3s1-.1 1.5-.3c1.5 1 3 1.5 4.5 1.5.5 0 1-.3 1-.8s-.5-.8-1-.8c-.8 0-1.5-.2-2-.5.7-.7 1.3-1.7 1.5-2.7.5-.3 1.5-.6 2-.8.3-.1.5-.3.5-.6s-.2-.5-.5-.6c-.5-.2-1.5-.3-2-.5V6.5C17.91 2.5 15.41.5 12.166.5z"/>
  </svg>
);

interface AddLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (leadId: number) => void;
  // بيانات مبدئية من نتيجة البحث
  initialData?: {
    companyName?: string;
    businessType?: string;
    city?: string;
    phone?: string;
    website?: string;
    googleMapsUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
    snapchatUrl?: string;
    twitterUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    notes?: string;
    reviewCount?: number;
    // بيانات Google Maps
    placeId?: string;
    rating?: number;
    address?: string;
    availablePhones?: string[];
    availableWebsites?: string[];
    // بيانات سوشيال
    username?: string;
    platform?: string;
    bio?: string;
    followersCount?: number;
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "text-pink-400",
  tiktok: "text-cyan-400",
  snapchat: "text-yellow-400",
  twitter: "text-sky-400",
  linkedin: "text-blue-400",
  facebook: "text-blue-500",
};

const STAGES = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "interested", label: "مهتم" },
  { value: "price_offer", label: "عرض سعر" },
  { value: "meeting", label: "اجتماع" },
  { value: "won", label: "تم الإغلاق" },
  { value: "lost", label: "خسارة" },
];

const PRIORITIES = [
  { value: "high", label: "عالية", color: "text-red-400" },
  { value: "medium", label: "متوسطة", color: "text-yellow-400" },
  { value: "low", label: "منخفضة", color: "text-green-400" },
];

export function AddLeadModal({ open, onClose, onSuccess, initialData }: AddLeadModalProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [isSearchingAccounts, setIsSearchingAccounts] = useState(false);
  const [socialSearchResults, setSocialSearchResults] = useState<Record<string, any[]>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});
  const [searchErrors, setSearchErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // بيانات أساسية
    companyName: "",
    businessType: "",
    city: "",
    country: "SA",
    district: "",
    crNumber: "",
    // تواصل
    verifiedPhone: "",
    hasWhatsapp: "unknown" as "yes" | "no" | "unknown",
    website: "",
    googleMapsUrl: "",
    // سوشيال ميديا
    instagramUrl: "",
    tiktokUrl: "",
    snapchatUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    facebookUrl: "",
    // تصنيف
    stage: "new" as string,
    priority: "medium" as string,
    notes: "",
    socialSince: "",
  });

  // جلب تفاصيل Google Maps
  const [currentPlaceId, setCurrentPlaceId] = useState<string | null>(null);
  const placeDetailsQuery = trpc.search.getPlaceDetails.useQuery(
    currentPlaceId ? { placeId: currentPlaceId } : skipToken,
    { enabled: !!currentPlaceId, staleTime: 5 * 60 * 1000 }
  );

  const createLead = trpc.leads.create.useMutation();
  const smartFindMut = trpc.brightDataSearch.smartFindSocialAccounts.useMutation();

  // تعبئة النموذج من البيانات المبدئية
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setForm(f => ({
        ...f,
        companyName: initialData.companyName || "",
        businessType: initialData.businessType || "",
        city: initialData.city || "",
        verifiedPhone: initialData.phone || "",
        website: initialData.website || "",
        googleMapsUrl: initialData.googleMapsUrl || "",
        instagramUrl: initialData.instagramUrl || (initialData.platform === "instagram" && initialData.username ? `https://instagram.com/${initialData.username}` : ""),
        tiktokUrl: initialData.tiktokUrl || (initialData.platform === "tiktok" && initialData.username ? `https://tiktok.com/@${initialData.username}` : ""),
        snapchatUrl: initialData.snapchatUrl || (initialData.platform === "snapchat" && initialData.username ? `https://snapchat.com/add/${initialData.username}` : ""),
        twitterUrl: initialData.twitterUrl || (initialData.platform === "twitter" && initialData.username ? `https://x.com/${initialData.username}` : ""),
        linkedinUrl: initialData.linkedinUrl || "",
        facebookUrl: initialData.facebookUrl || "",
        notes: initialData.notes || initialData.bio || "",
      }));
      // جلب تفاصيل Google Maps إذا كان placeId متاحاً
      if (initialData.placeId) {
        setCurrentPlaceId(initialData.placeId);
      }
    }
    setSocialSearchResults({});
    setAiSuggestions({});
    setSearchErrors({});
    setActiveTab("basic");
  }, [open, initialData]);

  // تحديث الهاتف والموقع من Google Places تلقائياً
  useEffect(() => {
    if (placeDetailsQuery.data && open) {
      const d = placeDetailsQuery.data as any;
      const phone = d.formatted_phone_number || d.international_phone_number || "";
      const website = d.website || "";
      setForm(f => ({
        ...f,
        verifiedPhone: f.verifiedPhone || phone,
        website: f.website || website,
      }));
    }
  }, [placeDetailsQuery.data, open]);

  const setField = useCallback((field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  }, []);

  // بحث ذكي تلقائي عن حسابات السوشيال ميديا
  const handleSmartSearch = async () => {
    if (!form.companyName.trim()) {
      toast.error("أدخل اسم النشاط أولاً");
      return;
    }
    setIsSearchingAccounts(true);
    setSocialSearchResults({});
    setAiSuggestions({});
    setSearchErrors({});
    try {
      const result = await smartFindMut.mutateAsync({
        companyName: form.companyName,
        city: form.city,
        businessType: form.businessType,
      });
      setSocialSearchResults(result.results);
      setAiSuggestions(result.aiSuggestions || {});
      setSearchErrors(result.errors || {});
      if (result.totalFound > 0) {
        toast.success(`تم العثور على ${result.totalFound} حساب`, {
          description: "اضغط على الحساب لإضافته تلقائياً",
        });
        setActiveTab("social");
        // تطبيق اقتراحات AI تلقائياً
        if (result.aiSuggestions) {
          const suggestions = result.aiSuggestions;
          setForm(f => ({
            ...f,
            instagramUrl: f.instagramUrl || (suggestions.instagram ? `https://instagram.com/${suggestions.instagram}` : ""),
            tiktokUrl: f.tiktokUrl || (suggestions.tiktok ? `https://tiktok.com/@${suggestions.tiktok}` : ""),
            snapchatUrl: f.snapchatUrl || (suggestions.snapchat ? `https://snapchat.com/add/${suggestions.snapchat}` : ""),
            twitterUrl: f.twitterUrl || (suggestions.twitter ? `https://x.com/${suggestions.twitter}` : ""),
            linkedinUrl: f.linkedinUrl || (suggestions.linkedin ? `https://linkedin.com/company/${suggestions.linkedin}` : ""),
          }));
        }
      } else {
        toast.info("لم يتم العثور على حسابات", {
          description: "يمكنك إدخال الروابط يدوياً",
        });
        setActiveTab("social");
      }
    } catch (e: any) {
      toast.error("خطأ في البحث", { description: e.message });
    } finally {
      setIsSearchingAccounts(false);
    }
  };

  // تطبيق حساب من نتائج البحث
  const applyAccount = (platform: string, account: any) => {
    const username = account.username || account.displayName || account.name || "";
    const url = account.profileUrl || account.url || "";
    let fullUrl = url;
    if (!fullUrl && username) {
      switch (platform) {
        case "instagram": fullUrl = `https://instagram.com/${username}`; break;
        case "tiktok": fullUrl = `https://tiktok.com/@${username}`; break;
        case "snapchat": fullUrl = `https://snapchat.com/add/${username}`; break;
        case "twitter": fullUrl = `https://x.com/${username}`; break;
        case "linkedin": fullUrl = `https://linkedin.com/company/${username}`; break;
      }
    }
    const fieldMap: Record<string, string> = {
      instagram: "instagramUrl",
      tiktok: "tiktokUrl",
      snapchat: "snapchatUrl",
      twitter: "twitterUrl",
      linkedin: "linkedinUrl",
    };
    if (fieldMap[platform]) {
      setField(fieldMap[platform], fullUrl);
      toast.success(`تم تطبيق حساب ${platform}`, { description: username });
    }
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) {
      toast.error("اسم النشاط مطلوب");
      return;
    }
    if (!form.businessType.trim()) {
      toast.error("نوع النشاط مطلوب");
      return;
    }
    if (!form.city.trim()) {
      toast.error("المدينة مطلوبة");
      return;
    }
    try {
      const result = await createLead.mutateAsync({
        companyName: form.companyName.trim(),
        businessType: form.businessType.trim(),
        city: form.city.trim(),
        country: form.country || undefined,
        district: form.district || undefined,
        crNumber: form.crNumber || undefined,
        verifiedPhone: form.verifiedPhone || undefined,
        hasWhatsapp: form.hasWhatsapp as any,
        website: form.website || undefined,
        googleMapsUrl: form.googleMapsUrl || undefined,
        instagramUrl: form.instagramUrl || undefined,
        tiktokUrl: form.tiktokUrl || undefined,
        snapchatUrl: form.snapchatUrl || undefined,
        twitterUrl: form.twitterUrl || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        facebookUrl: form.facebookUrl || undefined,
        notes: form.notes || undefined,
        socialSince: form.socialSince || undefined,
        stage: form.stage as any,
        priority: form.priority as any,
      });
      toast.success("تمت إضافة العميل بنجاح", { description: form.companyName });
      onSuccess?.(result.id);
      onClose();
    } catch (e: any) {
      toast.error("خطأ في الإضافة", { description: e.message });
    }
  };

  const socialPlatforms = [
    { key: "instagramUrl", platform: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" />, placeholder: "https://instagram.com/username", color: "text-pink-400", prefix: "https://instagram.com/" },
    { key: "tiktokUrl", platform: "tiktok", label: "TikTok", icon: <TikTokIcon />, placeholder: "https://tiktok.com/@username", color: "text-cyan-400", prefix: "https://tiktok.com/@" },
    { key: "snapchatUrl", platform: "snapchat", label: "Snapchat", icon: <SnapchatIcon />, placeholder: "https://snapchat.com/add/username", color: "text-yellow-400", prefix: "https://snapchat.com/add/" },
    { key: "twitterUrl", platform: "twitter", label: "Twitter / X", icon: <Twitter className="w-4 h-4" />, placeholder: "https://x.com/username", color: "text-sky-400", prefix: "https://x.com/" },
    { key: "linkedinUrl", platform: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-4 h-4" />, placeholder: "https://linkedin.com/company/name", color: "text-blue-400", prefix: "https://linkedin.com/company/" },
    { key: "facebookUrl", platform: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" />, placeholder: "https://facebook.com/pagename", color: "text-blue-500", prefix: "https://facebook.com/" },
  ];

  const hasSocialData = socialPlatforms.some(p => !!(form as any)[p.key]);
  const totalSocialFound = Object.values(socialSearchResults).flat().length;

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            إضافة عميل جديد
            {hasSocialData && (
              <Badge variant="secondary" className="text-xs">
                {socialPlatforms.filter(p => !!(form as any)[p.key]).length} منصة مرتبطة
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="grid grid-cols-3 w-full mb-4 shrink-0">
              <TabsTrigger value="basic" className="text-xs">
                <Building2 className="w-3.5 h-3.5 ml-1" />
                البيانات الأساسية
              </TabsTrigger>
              <TabsTrigger value="social" className="text-xs relative">
                <Instagram className="w-3.5 h-3.5 ml-1" />
                السوشيال ميديا
                {hasSocialData && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="crm" className="text-xs">
                <Star className="w-3.5 h-3.5 ml-1" />
                التصنيف والملاحظات
              </TabsTrigger>
            </TabsList>

            {/* ===== تبويب البيانات الأساسية ===== */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              {/* معلومات Google Maps إذا كانت متاحة */}
              {initialData?.placeId && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>مصدر البيانات: Google Maps</span>
                    {placeDetailsQuery.isFetching && (
                      <span className="flex items-center gap-1 text-blue-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        جاري جلب التفاصيل...
                      </span>
                    )}
                  </div>
                  {initialData.rating && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= Math.round(initialData.rating!) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-yellow-400 font-bold">{initialData.rating}</span>
                    </div>
                  )}
                  {initialData.address && (
                    <p className="text-xs text-muted-foreground">{initialData.address}</p>
                  )}
                </div>
              )}

              {/* اسم النشاط */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">اسم النشاط التجاري *</Label>
                  <div className="relative">
                    <Input
                      value={form.companyName}
                      onChange={e => setField("companyName", e.target.value)}
                      placeholder="اسم النشاط..."
                      className="pl-10"
                    />
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">نوع النشاط *</Label>
                  <Input
                    value={form.businessType}
                    onChange={e => setField("businessType", e.target.value)}
                    placeholder="مطعم، صالون، متجر..."
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">رقم السجل التجاري</Label>
                  <div className="relative">
                    <Input
                      value={form.crNumber}
                      onChange={e => setField("crNumber", e.target.value)}
                      placeholder="10xxxxxxxxx"
                      dir="ltr"
                      className="pl-8"
                    />
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* المدينة والمنطقة */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">المدينة *</Label>
                  <Input
                    value={form.city}
                    onChange={e => setField("city", e.target.value)}
                    placeholder="الرياض"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">الحي / المنطقة</Label>
                  <Input
                    value={form.district}
                    onChange={e => setField("district", e.target.value)}
                    placeholder="حي النزهة..."
                  />
                </div>
              </div>

              {/* رقم الهاتف */}
              <div>
                <Label className="text-xs mb-1 flex items-center gap-1.5">
                  رقم الهاتف
                  {placeDetailsQuery.isFetching && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جاري الجلب من Google...
                    </span>
                  )}
                  {!placeDetailsQuery.isFetching && form.verifiedPhone && initialData?.placeId && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <CheckCircle2 className="w-3 h-3" />
                      تم الجلب من Google
                    </span>
                  )}
                </Label>
                {initialData?.availablePhones && initialData.availablePhones.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="w-full text-[10px] text-green-400/70 mb-1">أرقام متاحة - اضغط للاختيار:</p>
                    {initialData.availablePhones.map((p: string) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setField("verifiedPhone", p)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-mono ${
                          form.verifiedPhone === p
                            ? "bg-green-500/30 border-green-500 text-green-300 font-bold"
                            : "border-green-500/30 text-green-400/80 hover:bg-green-500/20"
                        }`}
                        dir="ltr"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={form.verifiedPhone}
                    onChange={e => setField("verifiedPhone", e.target.value)}
                    placeholder="+966 5x xxx xxxx"
                    dir="ltr"
                    className={`flex-1 ${form.verifiedPhone ? "border-green-500/50" : ""}`}
                    disabled={placeDetailsQuery.isFetching}
                  />
                  <Select value={form.hasWhatsapp} onValueChange={v => setField("hasWhatsapp", v)}>
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">واتساب ؟</SelectItem>
                      <SelectItem value="yes">✅ لديه واتساب</SelectItem>
                      <SelectItem value="no">❌ لا يوجد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* الموقع الإلكتروني */}
              <div>
                <Label className="text-xs mb-1 flex items-center gap-1.5">
                  الموقع الإلكتروني
                  {!placeDetailsQuery.isFetching && form.website && initialData?.placeId && (
                    <span className="flex items-center gap-1 text-[10px] text-blue-400">
                      <CheckCircle2 className="w-3 h-3" />
                      تم الجلب من Google
                    </span>
                  )}
                </Label>
                {initialData?.availableWebsites && initialData.availableWebsites.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    {initialData.availableWebsites.map((w: string) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setField("website", w)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors max-w-[200px] truncate ${
                          form.website === w
                            ? "bg-blue-500/30 border-blue-500 text-blue-300 font-bold"
                            : "border-blue-500/30 text-blue-400/80 hover:bg-blue-500/20"
                        }`}
                        dir="ltr"
                        title={w}
                      >
                        {w.replace(/^https?:\/\//, "").slice(0, 35)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Input
                    value={form.website}
                    onChange={e => setField("website", e.target.value)}
                    placeholder="https://example.com"
                    dir="ltr"
                    className={`pl-8 ${form.website ? "border-blue-500/50" : ""}`}
                  />
                  <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* رابط Google Maps */}
              {(form.googleMapsUrl || initialData?.googleMapsUrl) && (
                <div>
                  <Label className="text-xs mb-1 block">رابط Google Maps</Label>
                  <div className="relative">
                    <Input
                      value={form.googleMapsUrl}
                      onChange={e => setField("googleMapsUrl", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      dir="ltr"
                      className="pl-8 text-xs"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-400" />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ===== تبويب السوشيال ميديا ===== */}
            <TabsContent value="social" className="space-y-4 mt-0">
              {/* زر البحث الذكي */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium">بحث ذكي تلقائي</p>
                    <p className="text-xs text-muted-foreground">يبحث في جميع المنصات ويقترح الحسابات الصحيحة</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSmartSearch}
                    disabled={isSearchingAccounts || !form.companyName.trim()}
                    className="gap-2"
                  >
                    {isSearchingAccounts ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />جاري البحث...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" />بحث ذكي</>
                    )}
                  </Button>
                </div>
                {totalSocialFound > 0 && (
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    تم العثور على {totalSocialFound} حساب في {Object.keys(socialSearchResults).filter(k => socialSearchResults[k].length > 0).length} منصة
                  </div>
                )}
              </div>

              {/* نتائج البحث الذكي */}
              {totalSocialFound > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">نتائج البحث - اضغط لتطبيق الحساب:</p>
                  {Object.entries(socialSearchResults).map(([platform, accounts]) => {
                    if (!accounts.length) return null;
                    const platformInfo = socialPlatforms.find(p => p.platform === platform);
                    const suggestedUsername = aiSuggestions[platform];
                    return (
                      <div key={platform} className="rounded-lg border border-border/50 overflow-hidden">
                        <div className={`flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-xs font-medium ${platformInfo?.color || ""}`}>
                          {platformInfo?.icon}
                          {platformInfo?.label || platform}
                          {suggestedUsername && (
                            <Badge variant="outline" className="text-[10px] mr-auto border-primary/50 text-primary">
                              <Sparkles className="w-2.5 h-2.5 ml-1" />
                              AI: @{suggestedUsername}
                            </Badge>
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          {accounts.map((account: any, idx: number) => {
                            const username = account.username || account.displayName || account.name || "";
                            const isAiSuggested = suggestedUsername && (username === suggestedUsername || username.includes(suggestedUsername));
                            const currentUrl = (form as any)[platformInfo?.key || ""];
                            const accountUrl = account.profileUrl || account.url || "";
                            const isApplied = currentUrl && (currentUrl.includes(username) || currentUrl === accountUrl);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => applyAccount(platform, account)}
                                className={`w-full text-right flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-xs ${
                                  isApplied
                                    ? "bg-green-500/20 border border-green-500/40 text-green-300"
                                    : isAiSuggested
                                    ? "bg-primary/10 border border-primary/30 hover:bg-primary/20"
                                    : "hover:bg-muted/50 border border-transparent"
                                }`}
                              >
                                {isApplied ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                ) : isAiSuggested ? (
                                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                ) : (
                                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{username}</p>
                                  {account.bio && (
                                    <p className="text-[10px] text-muted-foreground truncate">{account.bio}</p>
                                  )}
                                </div>
                                {isApplied && <span className="text-[10px] text-green-400 shrink-0">مطبّق</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* حقول السوشيال ميديا */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">روابط الحسابات:</p>
                {socialPlatforms.map(({ key, platform, label, icon, color, placeholder }) => (
                  <div key={key}>
                    <Label className={`text-xs mb-1 flex items-center gap-1.5 ${color}`}>
                      {icon}
                      {label}
                      {(form as any)[key] && (
                        <span className="flex items-center gap-1 text-[10px] text-green-400 mr-auto">
                          <CheckCircle2 className="w-3 h-3" />
                          مرتبط
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={(form as any)[key]}
                        onChange={e => setField(key, e.target.value)}
                        placeholder={placeholder}
                        dir="ltr"
                        className={`flex-1 text-xs ${(form as any)[key] ? `border-${color.replace("text-", "")}/50` : ""}`}
                      />
                      {(form as any)[key] && (
                        <div className="flex gap-1">
                          <a
                            href={(form as any)[key]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors"
                            title="فتح الرابط"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setField(key, "")}
                            className="p-2 rounded-md border border-border/50 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                            title="مسح"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* نتائج البحث لهذه المنصة */}
                    {socialSearchResults[platform]?.length > 0 && !(form as any)[key] && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {socialSearchResults[platform].slice(0, 3).map((acc: any, idx: number) => {
                          const username = acc.username || acc.displayName || "";
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => applyAccount(platform, acc)}
                              className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 hover:bg-muted/50 transition-colors text-muted-foreground"
                            >
                              @{username}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {/* تاريخ الظهور على السوشيال */}
                <div>
                  <Label className="text-xs mb-1 block text-muted-foreground">تاريخ الظهور على السوشيال</Label>
                  <Input
                    value={form.socialSince}
                    onChange={e => setField("socialSince", e.target.value)}
                    placeholder="مثال: 2020، أو منذ 3 سنوات"
                    className="text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ===== تبويب التصنيف والملاحظات ===== */}
            <TabsContent value="crm" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">مرحلة العميل</Label>
                  <Select value={form.stage} onValueChange={v => setField("stage", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">الأولوية</Label>
                  <Select value={form.priority} onValueChange={v => setField("priority", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          <span className={p.color}>{p.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1 block">ملاحظات</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setField("notes", e.target.value)}
                  placeholder="أي ملاحظات إضافية عن العميل..."
                  className="text-sm resize-none"
                  rows={4}
                />
              </div>

              {/* ملخص البيانات المدخلة */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">ملخص البيانات:</p>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {form.companyName && <div className="flex items-center gap-1"><Building2 className="w-3 h-3 text-primary" /><span className="truncate">{form.companyName}</span></div>}
                  {form.verifiedPhone && <div className="flex items-center gap-1"><Phone className="w-3 h-3 text-green-400" /><span dir="ltr">{form.verifiedPhone}</span></div>}
                  {form.website && <div className="flex items-center gap-1"><Globe className="w-3 h-3 text-blue-400" /><span className="truncate">{form.website.replace(/^https?:\/\//, "")}</span></div>}
                  {form.city && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-400" /><span>{form.city}</span></div>}
                  {socialPlatforms.filter(p => !!(form as any)[p.key]).map(p => (
                    <div key={p.key} className={`flex items-center gap-1 ${p.color}`}>
                      {p.icon}
                      <span className="truncate">{(form as any)[p.key].replace(/^https?:\/\/[^/]+\//, "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50 shrink-0">
          <Button variant="outline" onClick={onClose} size="sm">
            إلغاء
          </Button>
          <div className="flex gap-2">
            {activeTab !== "social" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("social")}
                className="gap-1.5 text-xs"
              >
                <Instagram className="w-3.5 h-3.5" />
                إضافة سوشيال
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!form.companyName || !form.businessType || !form.city || createLead.isPending}
              size="sm"
              className="gap-2"
            >
              {createLead.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />جاري الحفظ...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />حفظ العميل</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
