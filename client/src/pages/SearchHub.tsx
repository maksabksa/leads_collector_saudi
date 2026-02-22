import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, MapPin, Instagram, Link2, Loader2, Plus, Star,
  Phone, Globe, Building2, Sparkles, ExternalLink, Hash,
  ChevronRight, Bot, Map, MessageCircle, Video, Camera,
  Users, TrendingUp, Zap, CheckCircle2, AlertCircle, RefreshCw,
  Copy, Eye, ArrowRight, Info, BookOpen, Target, Lightbulb,
  MousePointer, Keyboard, Filter, X, CheckCheck, AlertTriangle
} from "lucide-react";

// ===== مدن سعودية =====
const SAUDI_CITIES = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الطائف", "تبوك", "أبها", "القصيم", "حائل", "نجران", "جازان", "الجوف", "عرعر"];

// ===== مكون بطاقة نتيجة =====
function ResultCard({ result, onAdd, isDuplicate }: { result: any; onAdd: (r: any) => void; isDuplicate?: boolean }) {
  const platformColors: Record<string, string> = {
    TikTok: "bg-black/80 text-white border-pink-500",
    Snapchat: "bg-yellow-400/20 text-yellow-600 border-yellow-400",
    Telegram: "bg-blue-500/20 text-blue-600 border-blue-400",
    Instagram: "bg-pink-500/20 text-pink-600 border-pink-400",
    Google: "bg-blue-500/20 text-blue-600 border-blue-400",
    "Google Maps": "bg-green-500/20 text-green-600 border-green-400",
  };
  const colorClass = platformColors[result.source] || "bg-muted text-muted-foreground";
  return (
    <Card className={`transition-all ${isDuplicate ? "opacity-50 border-orange-500/40 bg-orange-500/5" : "hover:border-primary/40"}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-foreground">{result.name}</span>
              {result.rating && (
                <span className="flex items-center gap-1 text-xs text-yellow-400">
                  <Star className="w-3 h-3 fill-current" />
                  {result.rating}
                  {result.userRatingsTotal && <span className="text-muted-foreground">({result.userRatingsTotal})</span>}
                </span>
              )}
              {result.source && <Badge variant="outline" className={`text-xs ${colorClass}`}>{result.source}</Badge>}
              {isDuplicate && (
                <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-400">
                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                  موجود مسبقاً
                </Badge>
              )}
            </div>
            {result.username && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <span className="text-primary">@{result.username}</span>
              </p>
            )}
            {result.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {result.address}
              </p>
            )}
            {result.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 shrink-0" />
                <span dir="ltr">{result.phone}</span>
              </p>
            )}
            {result.website && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 shrink-0" />
                <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                  {result.website.replace(/^https?:\/\//, "")}
                </a>
              </p>
            )}
            {result.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.bio}</p>
            )}
            {result.followers && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {result.followers} متابع
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {result.placeId && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(result.name + " " + (result.address || ""))}`, "_blank")}
              >
                <MapPin className="w-3 h-3 mr-1" />
                خرائط
              </Button>
            )}
            {result.profileUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => window.open(result.profileUrl, "_blank")}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                الصفحة
              </Button>
            )}
            <Button
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => onAdd(result)}
              disabled={isDuplicate}
            >
              {isDuplicate ? <CheckCheck className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              {isDuplicate ? "موجود" : "أضف"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== مكون دليل البحث اليدوي الموجَّه =====
function ManualSearchGuide({
  platform,
  icon: Icon,
  color,
  bgColor,
  keyword,
  setKeyword,
  city,
  setCity,
  country = "السعودية",
  setCountry,
  searchUrl,
  steps,
  tips,
  hashtags,
  onSuggestHashtags,
  isSuggestingHashtags,
  manualResults,
  setManualResults,
  onAdd,
  duplicateKeys,
}: {
  platform: string;
  icon: any;
  color: string;
  bgColor: string;
  keyword: string;
  setKeyword: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  country?: string;
  setCountry?: (v: string) => void;
  searchUrl: string;
  steps: { icon: any; title: string; desc: string }[];
  tips: string[];
  hashtags: string[];
  onSuggestHashtags: () => void;
  isSuggestingHashtags: boolean;
  manualResults: any[];
  setManualResults: (v: any[]) => void;
  onAdd: (r: any) => void;
  duplicateKeys: string[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", username: "", bio: "", followers: "" });

  const handleOpenPlatform = () => {
    if (!keyword) { toast.error("أدخل كلمة البحث أولاً"); return; }
    window.open(searchUrl, "_blank");
    setShowForm(true);
  };

  const handleAddManual = () => {
    if (!form.name) { toast.error("اسم النشاط مطلوب"); return; }
    const result = {
      name: form.name,
      phone: form.phone || undefined,
      username: form.username || undefined,
      bio: form.bio || undefined,
      followers: form.followers || undefined,
      source: platform,
      city: city,
    };
    onAdd(result);
    setManualResults([...manualResults, result]);
    setForm({ name: "", phone: "", username: "", bio: "", followers: "" });
    toast.success("تمت إضافة العميل");
  };

  return (
    <div className="space-y-4">
      {/* بطاقة البحث الرئيسية */}
      <Card className={`border-2 ${bgColor}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${bgColor}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            البحث في {platform}
          </CardTitle>
          <p className="text-xs text-muted-foreground">بحث يدوي موجَّه — يفتح المنصة مباشرة بكلمة البحث وتُدخل البيانات يدوياً</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">نوع النشاط / الكلمة المفتاحية</Label>
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="مثال: مطعم، صالون، مقاول..."
                onKeyDown={e => e.key === "Enter" && keyword && handleOpenPlatform()}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">البلد</Label>
              <Input
                value={country}
                onChange={e => setCountry?.(e.target.value)}
                placeholder="السعودية"
                list={`countries-${platform}`}
              />
              <datalist id={`countries-${platform}`}>
                {["السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "مصر", "الأردن", "العراق"].map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <Label className="text-xs mb-1 block">المدينة <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="الرياض، جدة، الدمام..."
                list={`cities-${platform}`}
              />
              <datalist id={`cities-${platform}`}>
                {SAUDI_CITIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* هاشتاقات مقترحة */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setKeyword(h.replace(/^#/, ""))}
                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  #{h.replace(/^#/, "")}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSuggestHashtags}
              disabled={isSuggestingHashtags || !keyword}
              className="text-xs"
            >
              {isSuggestingHashtags ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
              اقتراح هاشتاقات AI
            </Button>
            <Button
              className={`flex-1 gap-2`}
              onClick={handleOpenPlatform}
              disabled={!keyword}
            >
              <ExternalLink className="w-4 h-4" />
              افتح {platform} وابدأ البحث
            </Button>
          </div>

          {/* تنبيه البحث اليدوي */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 text-xs text-blue-400 flex items-start gap-2">
            <MousePointer className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>سيفتح {platform} في تبويب جديد بكلمة البحث جاهزة. تصفّح النتائج وأضف العملاء يدوياً من النموذج أدناه.</span>
          </div>
        </CardContent>
      </Card>

      {/* خطوات البحث التفصيلية */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            دليل البحث خطوة بخطوة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <step.icon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* نصائح الاستقطاب */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-400">
            <Lightbulb className="w-4 h-4" />
            نصائح الاستقطاب الذكي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* نموذج إدخال يدوي */}
      {showForm && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              إضافة عميل من {platform}
              <Badge variant="outline" className="text-xs mr-auto">نموذج الإدخال اليدوي</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">انسخ البيانات من {platform} وأدخلها هنا</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">اسم النشاط / الحساب <span className="text-red-400">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="مثال: مطعم الأصيل"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">رقم الهاتف / واتساب</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+966xxxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">اسم المستخدم (@username)</Label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="@username"
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">عدد المتابعين</Label>
                <Input
                  value={form.followers}
                  onChange={e => setForm(f => ({ ...f, followers: e.target.value }))}
                  placeholder="مثال: 15,000"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">وصف النشاط / البايو</Label>
              <Textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="انسخ البايو أو وصف الحساب هنا..."
                className="text-xs h-16"
              />
            </div>
            <Button className="w-full" onClick={handleAddManual} disabled={!form.name}>
              <Plus className="w-4 h-4 mr-2" />
              إضافة كعميل
            </Button>
          </CardContent>
        </Card>
      )}

      {/* النتائج المضافة */}
      {manualResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{manualResults.length} عميل تم إضافته من {platform}</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setManualResults([])}>
              <X className="w-3 h-3 mr-1" />
              مسح القائمة
            </Button>
          </div>
          {manualResults.map((r, i) => (
            <ResultCard key={i} result={r} onAdd={onAdd} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function SearchHub() {
  const [activeTab, setActiveTab] = useState("google");
  const [duplicateKeys, setDuplicateKeys] = useState<string[]>([]);

  // ===== Google Web Search =====
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleCity, setGoogleCity] = useState("");
  const [googleCountry, setGoogleCountry] = useState("السعودية");
  const [googleResults, setGoogleResults] = useState<any[]>([]);
  const [googleNextToken, setGoogleNextToken] = useState<string | null>(null);
  const searchPlaces = trpc.search.searchPlaces.useMutation({
    onSuccess: (data) => {
      const newResults = data.results.map((r: any) => ({
        name: r.name,
        address: r.formatted_address,
        placeId: r.place_id,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        source: "Google",
      }));
      setGoogleResults(prev => [...prev, ...newResults]);
      setGoogleNextToken(data.nextPageToken || null);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });

  // ===== Google Maps =====
  const [mapsQuery, setMapsQuery] = useState("");
  const [mapsCity, setMapsCity] = useState("");
  const [mapsCountry, setMapsCountry] = useState("السعودية");
  const [mapsResults, setMapsResults] = useState<any[]>([]);
  const [mapsNextToken, setMapsNextToken] = useState<string | null>(null);
  const searchMaps = trpc.search.searchPlaces.useMutation({
    onSuccess: (data) => {
      const newResults = data.results.map((r: any) => ({
        name: r.name,
        address: r.formatted_address,
        placeId: r.place_id,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        source: "Google Maps",
      }));
      setMapsResults(prev => [...prev, ...newResults]);
      setMapsNextToken(data.nextPageToken || null);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });

  // ===== Instagram =====
  const [igHashtag, setIgHashtag] = useState("");
  const [igBusinessType, setIgBusinessType] = useState("");
  const [igCity, setIgCity] = useState("");
  const [igCountry, setIgCountry] = useState("السعودية");
  const [igSearchId, setIgSearchId] = useState<number | null>(null);
  const getIgAccounts = trpc.instagram.getAccounts.useQuery(
    { searchId: igSearchId! },
    { enabled: igSearchId !== null }
  ) as any;
  const startIgSearch = trpc.instagram.startSearch.useMutation({
    onSuccess: (data) => {
      setIgSearchId(data.searchId);
      toast.success("بدأ البحث في إنستغرام");
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });
  const generateIgStrategy = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data: any) => {
      toast.success("تم اقتراح هاشتاقات للبحث");
      if (data.hashtags?.length > 0) setIgHashtag(data.hashtags[0].replace("#", ""));
    },
    onError: (e: any) => toast.error("خطأ", { description: e.message }),
  });

  // ===== TikTok - بحث يدوي موجَّه =====
  const [tiktokKeyword, setTiktokKeyword] = useState("");
  const [tiktokCity, setTiktokCity] = useState("");
  const [tiktokCountry, setTiktokCountry] = useState("السعودية");
  const [tiktokHashtags, setTiktokHashtags] = useState<string[]>([]);
  const [tiktokManualResults, setTiktokManualResults] = useState<any[]>([]);
  const suggestTiktokHashtags = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data) => {
      setTiktokHashtags(data.hashtags);
      toast.success("تم اقتراح الهاشتاقات");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== Snapchat - بحث يدوي موجَّه =====
  const [snapKeyword, setSnapKeyword] = useState("");
  const [snapCity, setSnapCity] = useState("");
  const [snapCountry, setSnapCountry] = useState("السعودية");
  const [snapHashtags, setSnapHashtags] = useState<string[]>([]);
  const [snapManualResults, setSnapManualResults] = useState<any[]>([]);
  const suggestSnapHashtags = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data) => {
      setSnapHashtags(data.hashtags);
      toast.success("تم اقتراح الهاشتاقات");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== Telegram =====
  const [telegramKeyword, setTelegramKeyword] = useState("");
  const [telegramCity, setTelegramCity] = useState("");
  const [telegramCountry, setTelegramCountry] = useState("السعودية");
  const [telegramResults, setTelegramResults] = useState<any[]>([]);
  const [telegramHashtags, setTelegramHashtags] = useState<string[]>([]);
  const searchTelegram = trpc.socialSearch.searchTelegram.useMutation({
    onSuccess: (data) => {
      setTelegramResults(data.results);
      toast.success(`تم العثور على ${data.total} نتيجة من Telegram`);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });
  const suggestTelegramHashtags = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data) => {
      setTelegramHashtags(data.hashtags);
      toast.success("تم اقتراح الهاشتاقات");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== رابط مخصص =====
  const [customUrl, setCustomUrl] = useState("");
  const [customResults, setCustomResults] = useState<any[]>([]);
  const scrapeUrl = trpc.search.scrapeUrl.useMutation({
    onSuccess: (data: any) => {
      setCustomResults(data.results || []);
      toast.success(`تم استخراج ${data.results?.length || 0} نتيجة`);
    },
    onError: (e: any) => toast.error("خطأ في الاستخراج", { description: e.message }),
  });

  // ===== فحص التكرار =====
  const allResults = useMemo(() => {
    const combined: { name: string; phone?: string }[] = [];
    [...googleResults, ...mapsResults].forEach(r => combined.push({ name: r.name, phone: r.phone }));
    [...tiktokManualResults, ...snapManualResults, ...telegramResults].forEach(r => combined.push({ name: r.name, phone: r.phone }));
    return combined;
  }, [googleResults, mapsResults, tiktokManualResults, snapManualResults, telegramResults]);

  const checkBulkDuplicates = trpc.search.checkBulkDuplicates.useQuery(
    { items: allResults.slice(0, 50) },
    { enabled: allResults.length > 0, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (checkBulkDuplicates.data?.duplicates) {
      setDuplicateKeys(checkBulkDuplicates.data.duplicates);
    }
  }, [checkBulkDuplicates.data]);

  // ===== إضافة كعميل =====
  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => toast.success("تمت إضافة العميل بنجاح"),
    onError: (e) => toast.error("خطأ في الإضافة", { description: e.message }),
  });

  const handleAddLead = (result: any) => {
    createLead.mutate({
      companyName: result.name,
      city: result.city || googleCity || mapsCity || igCity || tiktokCity || snapCity || telegramCity || "غير محدد",
      businessType: result.businessType || googleQuery || mapsQuery || igBusinessType || tiktokKeyword || snapKeyword || telegramKeyword || "غير محدد",
      website: result.website || "",
      notes: `مصدر: ${result.source || "بحث"} | ${result.address || result.bio || result.username || ""}`.trim(),
    });
  };

  // ===== TikTok Search URL =====
  const tiktokSearchUrl = useMemo(() => {
    const q = encodeURIComponent(`${tiktokKeyword} ${tiktokCity}`);
    return `https://www.tiktok.com/search?q=${q}`;
  }, [tiktokKeyword, tiktokCity]);

  // ===== Snapchat Search URL =====
  const snapSearchUrl = useMemo(() => {
    const q = encodeURIComponent(`${snapKeyword} ${snapCity}`);
    return `https://www.snapchat.com/search?q=${q}`;
  }, [snapKeyword, snapCity]);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مركز البحث</h1>
            <p className="text-muted-foreground text-sm">ابحث عن العملاء عبر Google، خرائط، إنستغرام، TikTok، Snapchat، Telegram، أو رابط مخصص</p>
          </div>
          {duplicateKeys.length > 0 && (
            <Badge variant="outline" className="mr-auto text-xs bg-orange-500/10 text-orange-400 border-orange-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {duplicateKeys.length} مكرر في النتائج
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="google" className="flex items-center gap-1 text-xs">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google</span>
            </TabsTrigger>
            <TabsTrigger value="maps" className="flex items-center gap-1 text-xs">
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خرائط</span>
            </TabsTrigger>
            <TabsTrigger value="instagram" className="flex items-center gap-1 text-xs">
              <Instagram className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">إنستغرام</span>
            </TabsTrigger>
            <TabsTrigger value="tiktok" className="flex items-center gap-1 text-xs">
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TikTok</span>
            </TabsTrigger>
            <TabsTrigger value="snapchat" className="flex items-center gap-1 text-xs">
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Snapchat</span>
            </TabsTrigger>
            <TabsTrigger value="telegram" className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Telegram</span>
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1 text-xs">
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">رابط</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== Google ===== */}
          <TabsContent value="google" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  بحث Google عن الأنشطة التجارية
                </CardTitle>
                <p className="text-xs text-muted-foreground">يبحث في Google Places API ويعيد نتائج حقيقية مع التقييمات وبيانات الاتصال</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">نوع النشاط / الكلمة المفتاحية</Label>
                    <Input
                      value={googleQuery}
                      onChange={e => setGoogleQuery(e.target.value)}
                      placeholder="مثال: مطعم، صالون، مقاول..."
                      onKeyDown={e => e.key === "Enter" && googleQuery && (setGoogleResults([]), searchPlaces.mutate({ query: googleQuery, city: googleCity }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={googleCity} onChange={e => setGoogleCity(e.target.value)} placeholder="الرياض" list="cities-google" />
                    <datalist id="cities-google">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>

                {/* دليل البحث */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> كيفية البحث الفعّال في Google</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">1.</span> استخدم كلمات محددة مثل "مطعم شعبي الرياض" أو "صالون نسائي جدة"</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">2.</span> جرب أنواع متعددة: "كيتريرنج، تورتة، حلويات" للحصول على نتائج أوسع</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">3.</span> النتائج ذات التقييم 4+ هي الأكثر نشاطاً تجارياً</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">4.</span> اضغط "المزيد" لجلب الصفحة التالية من النتائج</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => { setGoogleResults([]); searchPlaces.mutate({ query: googleQuery, city: googleCity }); }}
                    disabled={searchPlaces.isPending || !googleQuery}
                  >
                    {searchPlaces.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    بحث
                  </Button>
                  {googleNextToken && (
                    <Button variant="outline" onClick={() => searchPlaces.mutate({ query: googleQuery, city: googleCity, pagetoken: googleNextToken! })} disabled={searchPlaces.isPending}>
                      المزيد
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            {googleResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{googleResults.length} نتيجة</p>
                {googleResults.map((r, i) => (
                  <ResultCard key={i} result={r} onAdd={handleAddLead} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== خرائط ===== */}
          <TabsContent value="maps" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="w-4 h-4 text-green-400" />
                  بحث خرائط Google
                </CardTitle>
                <p className="text-xs text-muted-foreground">يبحث في Google Maps ويعيد الأنشطة التجارية مع الموقع والتقييم ورقم الهاتف</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">نوع النشاط</Label>
                    <Input
                      value={mapsQuery}
                      onChange={e => setMapsQuery(e.target.value)}
                      placeholder="مثال: مطعم، صالون، مقاول..."
                      onKeyDown={e => e.key === "Enter" && mapsQuery && (setMapsResults([]), searchMaps.mutate({ query: mapsQuery, city: mapsCity }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={mapsCity} onChange={e => setMapsCity(e.target.value)} placeholder="الرياض" list="cities-maps" />
                    <datalist id="cities-maps">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>

                {/* دليل البحث */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-green-400 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> استراتيجية البحث في الخرائط</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5"><span className="text-green-400 font-bold">1.</span> الخرائط تعطي بيانات أدق: رقم الهاتف، ساعات العمل، الموقع الجغرافي</div>
                    <div className="flex items-start gap-1.5"><span className="text-green-400 font-bold">2.</span> ابحث بالحي: "مطعم حي النزهة الرياض" للحصول على نتائج محلية</div>
                    <div className="flex items-start gap-1.5"><span className="text-green-400 font-bold">3.</span> الأنشطة ذات الصور الكثيرة أكثر نشاطاً على السوشيال</div>
                    <div className="flex items-start gap-1.5"><span className="text-green-400 font-bold">4.</span> تحقق من "تاريخ الافتتاح" في التفاصيل لمعرفة عمر النشاط</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => { setMapsResults([]); searchMaps.mutate({ query: mapsQuery, city: mapsCity }); }}
                    disabled={searchMaps.isPending || !mapsQuery}
                  >
                    {searchMaps.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Map className="w-4 h-4 mr-2" />}
                    بحث في الخرائط
                  </Button>
                  {mapsNextToken && (
                    <Button variant="outline" onClick={() => searchMaps.mutate({ query: mapsQuery, city: mapsCity, pagetoken: mapsNextToken! })} disabled={searchMaps.isPending}>
                      المزيد
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            {mapsResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{mapsResults.length} نتيجة</p>
                {mapsResults.map((r, i) => (
                  <ResultCard key={i} result={r} onAdd={handleAddLead} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== إنستغرام ===== */}
          <TabsContent value="instagram" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  بحث إنستغرام
                </CardTitle>
                <p className="text-xs text-muted-foreground">يبحث في إنستغرام عبر الهاشتاقات ويستخرج الحسابات التجارية النشطة</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">نوع النشاط</Label>
                    <Input value={igBusinessType} onChange={e => setIgBusinessType(e.target.value)} placeholder="مطعم، صالون..." />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">الهاشتاق</Label>
                    <Input value={igHashtag} onChange={e => setIgHashtag(e.target.value)} placeholder="مطاعم_الرياض" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={igCity} onChange={e => setIgCity(e.target.value)} placeholder="الرياض" list="cities-ig" />
                    <datalist id="cities-ig">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>

                {/* دليل البحث */}
                <div className="bg-pink-500/5 border border-pink-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-pink-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> دليل البحث في إنستغرام</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5"><span className="text-pink-400 font-bold">1.</span> استخدم هاشتاقات المدينة: #مطاعم_الرياض #صالونات_جدة</div>
                    <div className="flex items-start gap-1.5"><span className="text-pink-400 font-bold">2.</span> الحسابات ذات Bio يحتوي على "واتساب" أو "للتواصل" هي الأكثر استجابة</div>
                    <div className="flex items-start gap-1.5"><span className="text-pink-400 font-bold">3.</span> ابحث عن الحسابات التي نشرت خلال آخر 7 أيام (نشاط حديث)</div>
                    <div className="flex items-start gap-1.5"><span className="text-pink-400 font-bold">4.</span> الحسابات بين 1K-50K متابع هي الأكثر قابلية للتحويل</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateIgStrategy.mutate({ keyword: igBusinessType, city: igCity, platform: "all" })}
                    disabled={generateIgStrategy.isPending || !igBusinessType}
                    className="text-xs"
                  >
                    {generateIgStrategy.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                    AI يقترح هاشتاق
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => startIgSearch.mutate({ hashtag: igHashtag })}
                    disabled={startIgSearch.isPending || !igHashtag}
                  >
                    {startIgSearch.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Instagram className="w-4 h-4 mr-2" />}
                    بحث في إنستغرام
                  </Button>
                </div>
              </CardContent>
            </Card>
            {getIgAccounts.data?.accounts && getIgAccounts.data.accounts.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{getIgAccounts.data.accounts.length} حساب</p>
                {getIgAccounts.data.accounts.map((r: any, i: number) => (
                  <ResultCard key={i} result={{ ...r, source: "Instagram" }} onAdd={handleAddLead} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== TikTok - بحث يدوي موجَّه ===== */}
          <TabsContent value="tiktok" className="mt-6">
            <ManualSearchGuide
              platform="TikTok"
              icon={Video}
              color="text-pink-400"
              bgColor="border-pink-500/20 bg-pink-500/5"
              keyword={tiktokKeyword}
              setKeyword={setTiktokKeyword}
              city={tiktokCity}
              setCity={setTiktokCity}
              searchUrl={tiktokSearchUrl}
              steps={[
                {
                  icon: Keyboard,
                  title: "أدخل كلمة البحث والمدينة",
                  desc: "مثال: \"مطعم الرياض\" أو \"صالون جدة\" — كن محدداً للحصول على نتائج أفضل"
                },
                {
                  icon: ExternalLink,
                  title: "افتح TikTok مباشرة",
                  desc: "اضغط الزر الأزرق — سيفتح TikTok في تبويب جديد بكلمة البحث جاهزة تلقائياً"
                },
                {
                  icon: Filter,
                  title: "فلتر النتائج في TikTok",
                  desc: "اضغط على فلتر → اختر \"حسابات\" (Accounts) → فلتر \"الأكثر متابعين\" أو \"الأحدث\""
                },
                {
                  icon: Eye,
                  title: "تصفّح الحسابات التجارية",
                  desc: "ابحث عن: حسابات تجارية (Business Account)، Bio يحتوي رقم هاتف أو واتساب، منشورات منتظمة"
                },
                {
                  icon: Copy,
                  title: "انسخ البيانات",
                  desc: "انسخ: اسم الحساب، @username، رقم الهاتف من البايو، عدد المتابعين، وصف النشاط"
                },
                {
                  icon: Plus,
                  title: "أضف في النموذج أدناه",
                  desc: "الصق البيانات في نموذج الإضافة اليدوي — النظام سيتحقق تلقائياً من التكرار"
                }
              ]}
              tips={[
                "ابحث بالعربية والإنجليزية: \"مطعم الرياض\" و\"restaurant Riyadh\" للحصول على نتائج أوسع",
                "الحسابات التي تنشر Reels يومياً هي الأكثر نشاطاً تجارياً وأسهل في التواصل",
                "ابحث عن هاشتاق #الرياض_بزنس أو #جدة_تجارة للعثور على أصحاب الأعمال مباشرة",
                "الحسابات بين 5K-100K متابع هي الأكثر استجابة — الكبيرة جداً قد تتجاهل الرسائل",
                "تحقق من تاريخ آخر منشور — الحسابات النشطة خلال آخر 7 أيام هي الأولوية",
                "إذا كان البايو يحتوي على 'للتواصل' أو 'واتساب' فهذا مؤشر اهتمام تجاري قوي",
                "استخدم ميزة البحث الصوتي في TikTok للعثور على محتوى محلي أكثر دقة"
              ]}
              hashtags={tiktokHashtags}
              onSuggestHashtags={() => suggestTiktokHashtags.mutate({ keyword: tiktokKeyword, city: tiktokCity, platform: "tiktok" })}
              isSuggestingHashtags={suggestTiktokHashtags.isPending}
              manualResults={tiktokManualResults}
              setManualResults={setTiktokManualResults}
              onAdd={handleAddLead}
              duplicateKeys={duplicateKeys}
            />
          </TabsContent>

          {/* ===== Snapchat - بحث يدوي موجَّه ===== */}
          <TabsContent value="snapchat" className="mt-6">
            <ManualSearchGuide
              platform="Snapchat"
              icon={Camera}
              color="text-yellow-400"
              bgColor="border-yellow-500/20 bg-yellow-500/5"
              keyword={snapKeyword}
              setKeyword={setSnapKeyword}
              city={snapCity}
              setCity={setSnapCity}
              searchUrl={snapSearchUrl}
              steps={[
                {
                  icon: Keyboard,
                  title: "أدخل كلمة البحث والمدينة",
                  desc: "مثال: \"مطعم الرياض\" — Snapchat يدعم البحث بالعربية والإنجليزية"
                },
                {
                  icon: ExternalLink,
                  title: "افتح Snapchat مباشرة",
                  desc: "اضغط الزر الأصفر — سيفتح Snapchat في تبويب جديد. يمكنك أيضاً فتح التطبيق على الجوال"
                },
                {
                  icon: Search,
                  title: "ابحث في Discover",
                  desc: "في Snapchat → اضغط على شريط البحث → اكتب نوع النشاط → اختر تبويب \"Accounts\""
                },
                {
                  icon: Filter,
                  title: "فلتر الحسابات التجارية",
                  desc: "ابحث عن: Public Profiles، حسابات تجارية رسمية، حسابات مع Bitmoji تجاري"
                },
                {
                  icon: Eye,
                  title: "تصفّح Stories التجارية",
                  desc: "الحسابات التجارية تنشر Stories منتظمة — تحقق من تاريخ آخر Story وعدد المشاهدات"
                },
                {
                  icon: Copy,
                  title: "انسخ البيانات وأضفها",
                  desc: "انسخ: اسم الحساب، Snapcode، رقم الهاتف إن وجد، وصل النشاط من البايو"
                }
              ]}
              tips={[
                "Snapchat أقوى في السوق السعودي من 18-35 سنة — مثالي للمطاعم والأزياء والجمال",
                "ابحث عن حسابات تنشر Spotlight (فيديوهات قصيرة) — هذه الحسابات أكثر وصولاً",
                "الحسابات ذات Snap Score العالي (أكثر من 10K) هي الأكثر نشاطاً",
                "ابحث بالهاشتاق في Stories: #الرياض #جدة #السعودية للعثور على محتوى محلي",
                "تحقق من Public Profile — الحسابات التجارية الرسمية تظهر معلومات أكثر",
                "استخدم Snap Map لرؤية الأنشطة التجارية في منطقة جغرافية محددة",
                "الرسائل المباشرة في Snapchat لها معدل قراءة أعلى من إنستغرام بـ 40%"
              ]}
              hashtags={snapHashtags}
              onSuggestHashtags={() => suggestSnapHashtags.mutate({ keyword: snapKeyword, city: snapCity, platform: "snapchat" })}
              isSuggestingHashtags={suggestSnapHashtags.isPending}
              manualResults={snapManualResults}
              setManualResults={setSnapManualResults}
              onAdd={handleAddLead}
              duplicateKeys={duplicateKeys}
            />
          </TabsContent>

          {/* ===== Telegram ===== */}
          <TabsContent value="telegram" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  بحث Telegram
                </CardTitle>
                <p className="text-xs text-muted-foreground">يبحث في القنوات والمجموعات التجارية السعودية عبر tgstat.com وt.me</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">نوع النشاط / الكلمة المفتاحية</Label>
                    <Input
                      value={telegramKeyword}
                      onChange={e => setTelegramKeyword(e.target.value)}
                      placeholder="مثال: مطعم، صالون، مقاول..."
                      onKeyDown={e => e.key === "Enter" && telegramKeyword && (setTelegramResults([]), searchTelegram.mutate({ keyword: telegramKeyword, city: telegramCity }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={telegramCity} onChange={e => setTelegramCity(e.target.value)} placeholder="الرياض" list="cities-telegram" />
                    <datalist id="cities-telegram">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>

                {/* دليل البحث */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-400 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> دليل البحث في Telegram</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">1.</span> tgstat.com هو أفضل محرك بحث لقنوات Telegram — يعطي إحصائيات دقيقة</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">2.</span> ابحث عن القنوات التجارية: "مطاعم الرياض"، "عروض جدة"، "بيع وشراء الدمام"</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">3.</span> القنوات ذات 1K-50K مشترك هي الأكثر تفاعلاً مع العروض</div>
                    <div className="flex items-start gap-1.5"><span className="text-blue-400 font-bold">4.</span> تواصل مع صاحب القناة عبر رابط @username في وصف القناة</div>
                  </div>
                </div>

                {/* روابط مباشرة */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => window.open(`https://tgstat.com/search?q=${encodeURIComponent(telegramKeyword + " " + telegramCity)}`, "_blank")}
                    disabled={!telegramKeyword}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    بحث في tgstat.com
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => window.open(`https://t.me/s/${encodeURIComponent(telegramKeyword)}`, "_blank")}
                    disabled={!telegramKeyword}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    بحث في t.me
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => suggestTelegramHashtags.mutate({ keyword: telegramKeyword, city: telegramCity, platform: "telegram" })}
                    disabled={suggestTelegramHashtags.isPending || !telegramKeyword}
                    className="text-xs"
                  >
                    {suggestTelegramHashtags.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                    اقتراح كلمات AI
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => { setTelegramResults([]); searchTelegram.mutate({ keyword: telegramKeyword, city: telegramCity }); }}
                    disabled={searchTelegram.isPending || !telegramKeyword}
                  >
                    {searchTelegram.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageCircle className="w-4 h-4 mr-2" />}
                    بحث في Telegram
                  </Button>
                </div>

                {telegramHashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {telegramHashtags.map((h, i) => (
                      <button key={i} onClick={() => setTelegramKeyword(h.replace(/^#/, ""))}
                        className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                        #{h.replace(/^#/, "")}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            {telegramResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{telegramResults.length} نتيجة</p>
                {telegramResults.map((r: any, i: number) => (
                  <ResultCard key={i} result={{ ...r, source: "Telegram" }} onAdd={handleAddLead} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== رابط مخصص ===== */}
          <TabsContent value="custom" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-orange-400" />
                  استخراج من رابط مخصص
                </CardTitle>
                <p className="text-xs text-muted-foreground">أدخل أي رابط لصفحة تحتوي على قائمة أنشطة تجارية — AI يستخرج البيانات تلقائياً</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs mb-1 block">الرابط</Label>
                  <Input
                    value={customUrl}
                    onChange={e => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/business-directory"
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                {/* دليل الاستخدام */}
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-orange-400 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> أمثلة على الروابط المدعومة</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />صفحات دليل الأعمال: معروف.sa، دليل السعودية</div>
                    <div className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />نتائج بحث Google Maps المصدّرة</div>
                    <div className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />صفحات فئة في LinkedIn أو Twitter</div>
                    <div className="flex items-start gap-1.5"><ChevronRight className="w-3 h-3 text-orange-400 shrink-0 mt-0.5" />أي صفحة HTML تحتوي على أسماء وأرقام هواتف</div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => scrapeUrl.mutate({ url: customUrl })}
                  disabled={!customUrl || scrapeUrl.isPending}
                >
                  {scrapeUrl.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  استخراج البيانات بالذكاء الاصطناعي
                </Button>
              </CardContent>
            </Card>
            {customResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{customResults.length} نتيجة</p>
                {customResults.map((r: any, i: number) => (
                  <ResultCard key={i} result={{ ...r, source: "رابط مخصص" }} onAdd={handleAddLead} isDuplicate={duplicateKeys.includes(r.phone || r.name)} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
