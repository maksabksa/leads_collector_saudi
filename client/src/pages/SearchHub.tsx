/**
 * مركز البحث الاحترافي - نسخة 2.0
 * واجهة موحدة للبحث في جميع المنصات مع نتائج فورية
 */
import { useState, useCallback, useEffect } from "react";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, MapPin, Instagram, Loader2, Plus, Star, Phone, Globe,
  Building2, ExternalLink, Bot, MessageCircle, Video, Camera,
  Users, Zap, CheckCircle2, RefreshCw, X, Map, Target,
  Layers, SlidersHorizontal, CheckCheck, AlertTriangle,
  RotateCcw, Info
} from "lucide-react";

// ===== ثوابت =====
const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الطائف", "تبوك", "أبها", "القصيم", "حائل", "نجران",
  "جازان", "الجوف", "عرعر", "الأحساء", "الجبيل", "ينبع"
];

const PLATFORMS = [
  {
    id: "google",
    label: "Google Maps",
    icon: Map,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    badgeColor: "bg-green-500/20 text-green-400 border-green-500/40",
  },
  {
    id: "instagram",
    label: "إنستجرام",
    icon: Instagram,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/40",
  },
  {
    id: "tiktok",
    label: "تيك توك",
    icon: Video,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  },
  {
    id: "snapchat",
    label: "سناب شات",
    icon: Camera,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  },
  {
    id: "telegram",
    label: "تيليجرام",
    icon: MessageCircle,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

// ===== مكون بطاقة نتيجة =====
function ResultCard({
  result,
  onAdd,
  isDuplicate,
  platform,
}: {
  result: any;
  onAdd: (r: any) => void;
  isDuplicate?: boolean;
  platform: typeof PLATFORMS[number];
}) {
  return (
    <Card className={`group transition-all duration-200 ${
      isDuplicate
        ? "opacity-60 border-orange-500/30 bg-orange-500/5"
        : "hover:border-primary/40 hover:shadow-sm"
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* أيقونة المنصة */}
          <div className={`w-9 h-9 rounded-lg ${platform.bgColor} ${platform.borderColor} border flex items-center justify-center shrink-0 mt-0.5`}>
            <platform.icon className={`w-4 h-4 ${platform.color}`} />
          </div>

          {/* المحتوى */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight">
                  {result.name || result.fullName || result.username || "غير معروف"}
                </h3>
                {result.username && (result.name || result.fullName) && (
                  <p className="text-xs text-muted-foreground mt-0.5">@{result.username}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {result.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                    <Star className="w-3 h-3 fill-current" />
                    {result.rating}
                  </span>
                )}
                {isDuplicate && (
                  <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/40 gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    موجود
                  </Badge>
                )}
              </div>
            </div>

            {/* التفاصيل */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2.5">
              {result.formatted_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[200px]">{result.formatted_address}</span>
                </span>
              )}
              {result.city && !result.formatted_address && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {result.city}
                </span>
              )}
              {(result.phone || result.formatted_phone_number) && (
                <span className="flex items-center gap-1 text-green-400 font-medium">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span dir="ltr">{result.phone || result.formatted_phone_number}</span>
                </span>
              )}
              {result.followersCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0" />
                  {result.followersCount.toLocaleString()} متابع
                </span>
              )}
              {result.website && (
                <a
                  href={result.website.startsWith("http") ? result.website : `https://${result.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <Globe className="w-3 h-3 shrink-0" />
                  موقع
                </a>
              )}
              {result.businessCategory && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {result.businessCategory}
                </span>
              )}
              {result.user_ratings_total && (
                <span className="text-muted-foreground/60">
                  ({result.user_ratings_total} تقييم)
                </span>
              )}
            </div>

            {/* وصف مختصر */}
            {(result.bio || result.description) && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
                {result.bio || result.description}
              </p>
            )}

            {/* أزرار الإجراءات */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => onAdd(result)}
                disabled={isDuplicate}
                className="h-7 text-xs gap-1.5 px-3"
              >
                {isDuplicate ? (
                  <><CheckCheck className="w-3 h-3" /> موجود مسبقاً</>
                ) : (
                  <><Plus className="w-3 h-3" /> إضافة كعميل</>
                )}
              </Button>
              {result.url && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5 px-2"
                  onClick={() => window.open(result.url, "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                  خرائط
                </Button>
              )}
              {result.username && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5 px-2"
                  onClick={() => window.open(`https://instagram.com/${result.username}`, "_blank")}
                >
                  <ExternalLink className="w-3 h-3" />
                  الملف
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== شريط تقدم البحث =====
function SearchProgress({ isSearching, count, platform }: {
  isSearching: boolean;
  count: number;
  platform: typeof PLATFORMS[number];
}) {
  if (!isSearching && count === 0) return null;
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${platform.bgColor} ${platform.borderColor} border text-xs`}>
      {isSearching ? (
        <>
          <Loader2 className={`w-3.5 h-3.5 animate-spin ${platform.color} shrink-0`} />
          <span className="text-muted-foreground">جاري البحث في {platform.label}...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className={`w-3.5 h-3.5 ${platform.color} shrink-0`} />
          <span className="text-muted-foreground">
            تم العثور على{" "}
            <span className={`font-semibold ${platform.color}`}>{count}</span>
            {" "}نتيجة من {platform.label}
          </span>
        </>
      )}
    </div>
  );
}

// ===== الصفحة الفارغة =====
function EmptyState({ platform, keyword, onSearch }: {
  platform: typeof PLATFORMS[number];
  keyword: string;
  onSearch: () => void;
}) {
  return (
    <div className="text-center py-16">
      <div className={`w-16 h-16 rounded-2xl ${platform.bgColor} ${platform.borderColor} border flex items-center justify-center mx-auto mb-4`}>
        <platform.icon className={`w-8 h-8 ${platform.color}`} />
      </div>
      {keyword ? (
        <>
          <h3 className="font-semibold text-foreground mb-2">ابدأ البحث في {platform.label}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            اضغط بحث للعثور على الأنشطة التجارية المرتبطة بـ "{keyword}"
          </p>
          <Button onClick={onSearch} className="gap-2">
            <Search className="w-4 h-4" />
            بحث في {platform.label}
          </Button>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-foreground mb-2">أدخل كلمة البحث</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            اكتب نوع النشاط التجاري في شريط البحث أعلاه ثم اضغط بحث
          </p>
        </>
      )}
    </div>
  );
}

// ===== المكون الرئيسي =====
export default function SearchHub() {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("الرياض");
  const [activeTab, setActiveTab] = useState<PlatformId>("google");
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");

  // نتائج البحث
  const [results, setResults] = useState<Record<PlatformId, any[]>>({
    google: [], instagram: [], tiktok: [], snapchat: [], telegram: []
  });
  // حالة التحميل
  const [loading, setLoading] = useState<Record<PlatformId, boolean>>({
    google: false, instagram: false, tiktok: false, snapchat: false, telegram: false
  });

  // إضافة عميل
  const [addDialog, setAddDialog] = useState<{ open: boolean; result: any | null; platform: PlatformId | "" }>({
    open: false, result: null, platform: ""
  });
  const [addForm, setAddForm] = useState({
    companyName: "", businessType: "", city: "", phone: "", website: "", notes: ""
  });
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  // Instagram search ID
  const [instagramSearchId, setInstagramSearchId] = useState<number | null>(null);

  // ===== API =====
  const searchPlaces = trpc.search.searchPlaces.useMutation();
  const searchTiktokMut = trpc.socialSearch.searchTikTok.useMutation();
  const searchSnapchatMut = trpc.socialSearch.searchSnapchat.useMutation();
  const searchTelegramMut = trpc.socialSearch.searchTelegram.useMutation();
  const instagramSearchMut = trpc.instagram.startSearch.useMutation();
  const suggestHashtagsMut = trpc.socialSearch.suggestSocialHashtags.useMutation();
  const createLead = trpc.leads.create.useMutation();
  const addInstagramAsLead = trpc.instagram.addAsLead.useMutation();

  const instagramAccountsQuery = trpc.instagram.getAccounts.useQuery(
    instagramSearchId ? { searchId: instagramSearchId } : skipToken,
    { enabled: !!instagramSearchId }
  );

  // تحديث نتائج إنستجرام عند تغيير البيانات
  useEffect(() => {
    if (instagramAccountsQuery.data) {
      setResults(prev => ({ ...prev, instagram: instagramAccountsQuery.data || [] }));
      setLoading(prev => ({ ...prev, instagram: false }));
    }
  }, [instagramAccountsQuery.data]);

  // ===== دوال البحث =====
  const setLoadingPlatform = (platform: PlatformId, val: boolean) =>
    setLoading(prev => ({ ...prev, [platform]: val }));
  const setResultsPlatform = (platform: PlatformId, data: any[]) =>
    setResults(prev => ({ ...prev, [platform]: data }));

  const searchGoogle = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("google", true);
    setResultsPlatform("google", []);
    try {
      const res = await searchPlaces.mutateAsync({ query: keyword, city, country: "السعودية" });
      setResultsPlatform("google", res.results || []);
      if (!res.results?.length) toast.info("لا توجد نتائج في Google Maps");
    } catch (e: any) {
      toast.error("خطأ في Google Maps", { description: e.message });
    } finally {
      setLoadingPlatform("google", false);
    }
  }, [keyword, city]);

  const searchInstagram = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("instagram", true);
    setResultsPlatform("instagram", []);
    setInstagramSearchId(null);
    try {
      const hashtag = keyword.replace(/^#/, "").trim();
      const res = await instagramSearchMut.mutateAsync({ hashtag });
      if (res.searchId) {
        setInstagramSearchId(res.searchId);
        // سيتم تحديث النتائج عبر useQuery
      } else {
        setLoadingPlatform("instagram", false);
      }
    } catch (e: any) {
      if (e.message?.includes("INSTAGRAM_ACCESS_TOKEN")) {
        toast.warning("Instagram API غير مُعدّ", {
          description: "يجب إضافة INSTAGRAM_ACCESS_TOKEN في الإعدادات. جاري البحث بالذكاء الاصطناعي..."
        });
        // fallback: TikTok search engine (similar social search)
        try {
          const fallback = await searchTiktokMut.mutateAsync({ keyword, city });
          const fallbackData = (fallback as any)?.results || fallback || [];
          setResultsPlatform("instagram", (fallbackData).map((r: any) => ({ ...r, source: "Instagram (AI)" })));
        } catch {}
      } else {
        toast.error("خطأ في البحث", { description: e.message });
      }
      setLoadingPlatform("instagram", false);
    }
  }, [keyword, city]);

  const searchTiktok = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("tiktok", true);
    setResultsPlatform("tiktok", []);
    try {
      const res = await searchTiktokMut.mutateAsync({ keyword, city });
      const tiktokData = (res as any)?.results || res || [];
      setResultsPlatform("tiktok", tiktokData);
      if (!tiktokData.length) toast.info("لا توجد نتائج في تيك توك");
    } catch (e: any) {
      toast.error("خطأ في تيك توك", { description: e.message });
    } finally {
      setLoadingPlatform("tiktok", false);
    }
  }, [keyword, city]);

  const searchSnapchat = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("snapchat", true);
    setResultsPlatform("snapchat", []);
    try {
      const res = await searchSnapchatMut.mutateAsync({ keyword, city });
      const snapData = (res as any)?.results || res || [];
      setResultsPlatform("snapchat", snapData);
      if (!snapData.length) toast.info("لا توجد نتائج في سناب شات");
    } catch (e: any) {
      toast.error("خطأ في سناب شات", { description: e.message });
    } finally {
      setLoadingPlatform("snapchat", false);
    }
  }, [keyword, city]);

  const searchTelegram = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("telegram", true);
    setResultsPlatform("telegram", []);
    try {
      const res = await searchTelegramMut.mutateAsync({ keyword, city });
      const telegramData = (res as any)?.results || res || [];
      setResultsPlatform("telegram", telegramData);
      if (!telegramData.length) toast.info("لا توجد نتائج في تيليجرام");
    } catch (e: any) {
      toast.error("خطأ في تيليجرام", { description: e.message });
    } finally {
      setLoadingPlatform("telegram", false);
    }
  }, [keyword, city]);

  const searchFunctions: Record<PlatformId, () => void> = {
    google: searchGoogle,
    instagram: searchInstagram,
    tiktok: searchTiktok,
    snapchat: searchSnapchat,
    telegram: searchTelegram,
  };

  const handleSearch = () => searchFunctions[activeTab]();

  const handleSearchAll = () => {
    if (!keyword.trim()) return;
    searchGoogle();
    searchTiktok();
    searchSnapchat();
    searchTelegram();
    toast.info("بدأ البحث في جميع المنصات", { description: "سيستغرق بضع ثوانٍ..." });
  };

  const handleSuggestHashtags = async () => {
    if (!keyword.trim()) return;
    try {
      const platformForHashtags = (activeTab === "tiktok" || activeTab === "snapchat" || activeTab === "telegram") ? activeTab : undefined;
      const res = await suggestHashtagsMut.mutateAsync({ keyword, city: undefined, platform: platformForHashtags });
      setSuggestedHashtags((res as any)?.hashtags || res || []);
    } catch {
      toast.error("خطأ في اقتراح الهاشتاقات");
    }
  };

  const handleOpenAddDialog = (result: any, platform: PlatformId) => {
    setAddDialog({ open: true, result, platform });
    setAddForm({
      companyName: result.name || result.fullName || result.username || "",
      businessType: result.businessCategory || result.types?.[0] || "",
      city: result.city || city,
      phone: result.phone || result.formatted_phone_number || "",
      website: result.website || "",
      notes: result.bio || result.description || "",
    });
  };

  const handleAddLead = async () => {
    if (!addDialog.result || !addForm.companyName) return;
    const key = addForm.companyName;
    try {
      if (addDialog.platform === "instagram" && addDialog.result.id) {
        await addInstagramAsLead.mutateAsync({
          accountId: addDialog.result.id,
          companyName: addForm.companyName,
          businessType: addForm.businessType || "غير محدد",
          city: addForm.city,
          instagramUrl: `https://instagram.com/${addDialog.result.username}`,
          phone: addForm.phone || undefined,
          website: addForm.website || undefined,
          notes: addForm.notes || undefined,
        });
      } else {
        await createLead.mutateAsync({
          companyName: addForm.companyName,
          businessType: addForm.businessType || "غير محدد",
          city: addForm.city || "غير محدد",
          verifiedPhone: addForm.phone || undefined,
          website: addForm.website || undefined,
          notes: addForm.notes || undefined,
          instagramUrl: addDialog.result.username
            ? `https://instagram.com/${addDialog.result.username}`
            : undefined,
        });
      }
      setAddedNames(prev => { const next = new Set(prev); next.add(key); return next; });
      toast.success("تمت الإضافة كعميل محتمل", { description: addForm.companyName });
      setAddDialog({ open: false, result: null, platform: "" });
    } catch (e: any) {
      toast.error("خطأ في الإضافة", { description: e.message });
    }
  };

  const clearResults = (platform: PlatformId) => {
    setResultsPlatform(platform, []);
    if (platform === "instagram") setInstagramSearchId(null);
  };

  // ===== إحصائيات =====
  const totalResults = Object.values(results).reduce((s, r) => s + r.length, 0);
  const isAnyLoading = Object.values(loading).some(Boolean);

  const currentPlatform = PLATFORMS.find(p => p.id === activeTab)!;
  const currentResults = results[activeTab];
  const currentLoading = loading[activeTab];

  const filteredResults = currentResults.filter((r: any) => {
    if (minFollowers && r.followersCount < parseInt(minFollowers)) return false;
    if (maxFollowers && r.followersCount > parseInt(maxFollowers)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* ===== رأس الصفحة ===== */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              مركز البحث الذكي
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              ابحث في جميع المنصات واستقطب العملاء بنقرة واحدة
            </p>
          </div>
          {totalResults > 0 && (
            <Badge className="text-sm px-3 py-1.5 gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              {totalResults} نتيجة إجمالية
            </Badge>
          )}
        </div>

        {/* شريط البحث */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="ابحث عن: مطاعم، صالونات، محلات ملابس، عيادات..."
              className="pr-9 text-sm h-10"
              dir="rtl"
            />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-36 h-10 text-sm shrink-0">
              <MapPin className="w-3.5 h-3.5 ml-1 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SAUDI_CITIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSearch}
            disabled={!keyword.trim() || currentLoading}
            className="h-10 gap-2 px-5 shrink-0"
          >
            {currentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </Button>
          <Button
            variant="outline"
            onClick={handleSearchAll}
            disabled={!keyword.trim() || isAnyLoading}
            className="h-10 gap-2 px-4 shrink-0"
            title="بحث في كل المنصات دفعة واحدة"
          >
            {isAnyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            <span className="hidden sm:inline">الكل</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-10 w-10 shrink-0 ${showFilters ? "text-primary bg-primary/10" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
            title="فلاتر متقدمة"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* فلاتر متقدمة */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">الحد الأدنى للمتابعين</Label>
              <Input
                value={minFollowers}
                onChange={e => setMinFollowers(e.target.value)}
                placeholder="1000"
                className="h-8 w-28 text-xs"
                type="number"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block text-muted-foreground">الحد الأقصى للمتابعين</Label>
              <Input
                value={maxFollowers}
                onChange={e => setMaxFollowers(e.target.value)}
                placeholder="100000"
                className="h-8 w-28 text-xs"
                type="number"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => { setMinFollowers(""); setMaxFollowers(""); }}
            >
              <X className="w-3 h-3" />
              مسح الفلاتر
            </Button>
          </div>
        )}

        {/* هاشتاقات مقترحة */}
        {suggestedHashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">مقترح:</span>
            {suggestedHashtags.map((h, i) => (
              <button
                key={i}
                onClick={() => { setKeyword(h.replace(/^#/, "")); setSuggestedHashtags([]); }}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
              >
                #{h.replace(/^#/, "")}
              </button>
            ))}
            <button onClick={() => setSuggestedHashtags([])} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ===== التبويبات ===== */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PlatformId)} className="flex-1 min-h-0 flex flex-col">
          {/* شريط التبويبات */}
          <div className="border-b border-border bg-card px-6 shrink-0 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 w-max">
              {PLATFORMS.map(p => {
                const count = results[p.id].length;
                const isLoading = loading[p.id];
                return (
                  <TabsTrigger
                    key={p.id}
                    value={p.id}
                    className="relative px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground gap-2 transition-colors whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className={`w-3.5 h-3.5 animate-spin ${p.color}`} />
                    ) : (
                      <p.icon className={`w-3.5 h-3.5 ${activeTab === p.id ? p.color : ""}`} />
                    )}
                    {p.label}
                    {count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.badgeColor} font-semibold min-w-[1.25rem] text-center`}>
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* محتوى التبويبات */}
          {PLATFORMS.map(p => (
            <TabsContent key={p.id} value={p.id} className="flex-1 min-h-0 overflow-y-auto m-0 p-6">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* شريط الأدوات */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <SearchProgress
                    isSearching={loading[p.id]}
                    count={results[p.id].length}
                    platform={p}
                  />
                  <div className="flex items-center gap-2 mr-auto">
                    {(p.id === "instagram" || p.id === "tiktok" || p.id === "snapchat" || p.id === "telegram") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSuggestHashtags}
                        disabled={!keyword.trim() || suggestHashtagsMut.isPending}
                        className="h-8 text-xs gap-1.5"
                      >
                        {suggestHashtagsMut.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bot className="w-3 h-3" />
                        )}
                        هاشتاقات AI
                      </Button>
                    )}
                    {results[p.id].length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={() => clearResults(p.id)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        مسح
                      </Button>
                    )}
                  </div>
                </div>

                {/* ملاحظة إنستجرام */}
                {p.id === "instagram" && (
                  <div className="flex items-start gap-2.5 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-xs text-pink-300">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>البحث في إنستجرام:</strong> يستخدم Instagram Graph API الرسمي ويحتاج{" "}
                      <code className="bg-pink-500/20 px-1 rounded text-pink-200">INSTAGRAM_ACCESS_TOKEN</code>{" "}
                      في الإعدادات. بدونه يعمل بالذكاء الاصطناعي كبديل.
                    </span>
                  </div>
                )}

                {/* النتائج */}
                {filteredResults.length > 0 ? (
                  <div className="space-y-3">
                    {filteredResults.length !== results[p.id].length && (
                      <p className="text-xs text-muted-foreground">
                        يُعرض {filteredResults.length} من {results[p.id].length} نتيجة (بعد الفلترة)
                      </p>
                    )}
                    {filteredResults.map((result: any, i: number) => (
                      <ResultCard
                        key={result.place_id || result.id || result.username || i}
                        result={result}
                        platform={p}
                        onAdd={(r) => handleOpenAddDialog(r, p.id)}
                        isDuplicate={addedNames.has(result.name || result.fullName || result.username || "")}
                      />
                    ))}
                  </div>
                ) : !loading[p.id] ? (
                  <EmptyState
                    platform={p}
                    keyword={keyword}
                    onSearch={() => searchFunctions[p.id]()}
                  />
                ) : null}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* ===== نافذة إضافة عميل ===== */}
      <Dialog open={addDialog.open} onOpenChange={open => setAddDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              إضافة كعميل محتمل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">اسم النشاط التجاري <span className="text-red-400">*</span></Label>
              <Input
                value={addForm.companyName}
                onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="اسم المحل أو الشركة"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">نوع النشاط <span className="text-red-400">*</span></Label>
                <Input
                  value={addForm.businessType}
                  onChange={e => setAddForm(f => ({ ...f, businessType: e.target.value }))}
                  placeholder="مطعم، صالون..."
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">المدينة</Label>
                <Input
                  value={addForm.city}
                  onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="الرياض"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">رقم الهاتف</Label>
                <Input
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">الموقع الإلكتروني</Label>
                <Input
                  value={addForm.website}
                  onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))}
                  placeholder="www.example.com"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">ملاحظات</Label>
              <Textarea
                value={addForm.notes}
                onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="أي ملاحظات إضافية..."
                className="text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialog({ open: false, result: null, platform: "" })}>
              إلغاء
            </Button>
            <Button
              onClick={handleAddLead}
              disabled={!addForm.companyName || !addForm.businessType || createLead.isPending || addInstagramAsLead.isPending}
              className="gap-2"
            >
              {(createLead.isPending || addInstagramAsLead.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              إضافة كعميل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
