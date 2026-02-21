import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, MapPin, Instagram, Link2, Loader2, Plus, Star,
  Phone, Globe, Building2, Sparkles, ExternalLink, Hash,
  ChevronRight, Bot, Map, MessageCircle, Video, Camera,
  Users, TrendingUp, Zap, CheckCircle2, AlertCircle, RefreshCw
} from "lucide-react";

// ===== مدن سعودية للاقتراح =====
const SAUDI_CITIES = ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الطائف", "تبوك", "أبها", "القصيم"];

// ===== مكون بطاقة نتيجة =====
function ResultCard({ result, onAdd }: { result: any; onAdd: (r: any) => void }) {
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
    <Card className="hover:border-primary/40 transition-all">
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
              {result.isAiGenerated && (
                <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-400">
                  <Bot className="w-2.5 h-2.5 mr-1" />
                  AI
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
            {result.city && !result.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {result.city}
              </p>
            )}
            {result.phone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 shrink-0" />
                {result.phone}
              </p>
            )}
            {result.website && result.website !== "" && (
              <a href={result.website.startsWith("http") ? result.website : `https://${result.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                <Globe className="w-3 h-3 shrink-0" />
                {result.website}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            {result.profileUrl && result.profileUrl !== "" && (
              <a href={result.profileUrl.startsWith("http") ? result.profileUrl : `https://${result.profileUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 flex items-center gap-1 hover:underline mt-1">
                <ExternalLink className="w-3 h-3 shrink-0" />
                عرض الحساب
              </a>
            )}
            {result.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.bio}</p>}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {result.followers && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {result.followers}
                </p>
              )}
              {result.engagementLevel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {result.engagementLevel}
                </p>
              )}
              {result.businessType && result.businessType !== "غير محدد" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {result.businessType}
                </p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => onAdd(result)}>
            <Plus className="w-3 h-3 mr-1" />
            إضافة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== مكون بحث المنصات الاجتماعية =====
function SocialPlatformSearch({
  platform,
  icon: Icon,
  color,
  description,
  keyword, setKeyword,
  city, setCity,
  results,
  isLoading,
  onSearch,
  onAdd,
  hashtags,
  onSuggestHashtags,
  isSuggestingHashtags,
}: {
  platform: string;
  icon: any;
  color: string;
  description: string;
  keyword: string; setKeyword: (v: string) => void;
  city: string; setCity: (v: string) => void;
  results: any[];
  isLoading: boolean;
  onSearch: () => void;
  onAdd: (r: any) => void;
  hashtags: string[];
  onSuggestHashtags: () => void;
  isSuggestingHashtags: boolean;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color}`} />
            بحث {platform} عن الأنشطة التجارية
          </CardTitle>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">نوع النشاط / الكلمة المفتاحية</Label>
              <Input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="مثال: مطعم، صالون، مقاول..."
                onKeyDown={e => e.key === "Enter" && keyword && onSearch()}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">المدينة</Label>
              <Input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="الرياض"
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
              اقتراح هاشتاقات
            </Button>
            <Button
              className="flex-1"
              onClick={onSearch}
              disabled={isLoading || !keyword}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              بحث
            </Button>
          </div>

          {/* تحذير محاكاة البشر */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-xs text-amber-600 flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>يستخدم النظام تقنية محاكاة سلوك البشر في البحث مع تأخيرات عشوائية لتجنب الحظر. قد يستغرق البحث 10-30 ثانية.</span>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">جاري البحث ومحاكاة سلوك البشر...</span>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{results.length} نتيجة</p>
            {results.some(r => r.isAiGenerated) && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-400">
                <Bot className="w-3 h-3 mr-1" />
                نتائج AI (للتوجيه البحثي)
              </Badge>
            )}
          </div>
          {results.map((r, i) => <ResultCard key={i} result={{ ...r, source: platform }} onAdd={onAdd} />)}
        </div>
      )}
    </div>
  );
}

export default function SearchHub() {
  const [activeTab, setActiveTab] = useState("google");

  // ===== Google Text Search =====
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleCity, setGoogleCity] = useState("الرياض");
  const [googleResults, setGoogleResults] = useState<any[]>([]);
  const [googleNextToken, setGoogleNextToken] = useState<string | null>(null);
  const searchPlaces = trpc.search.searchPlaces.useMutation({
    onSuccess: (data) => {
      setGoogleResults(prev => [...prev, ...data.results.map((r: any) => ({
        name: r.name,
        address: r.formatted_address,
        placeId: r.place_id,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        source: "Google",
      }))]);
      setGoogleNextToken(data.nextPageToken || null);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });

  // ===== Google Maps =====
  const [mapsQuery, setMapsQuery] = useState("");
  const [mapsCity, setMapsCity] = useState("الرياض");
  const [mapsResults, setMapsResults] = useState<any[]>([]);
  const [mapsNextToken, setMapsNextToken] = useState<string | null>(null);
  const searchMaps = trpc.search.searchPlaces.useMutation({
    onSuccess: (data) => {
      setMapsResults(prev => [...prev, ...data.results.map((r: any) => ({
        name: r.name,
        address: r.formatted_address,
        placeId: r.place_id,
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        source: "Google Maps",
      }))]);
      setMapsNextToken(data.nextPageToken || null);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });

  // ===== Instagram =====
  const [igHashtag, setIgHashtag] = useState("");
  const [igBusinessType, setIgBusinessType] = useState("");
  const [igCity, setIgCity] = useState("الرياض");
  const [igSearchId, setIgSearchId] = useState<number | null>(null);
  const getIgAccounts = trpc.instagram.getAccounts.useQuery(
    { searchId: igSearchId! },
    { enabled: igSearchId !== null }
  );
  const startIgSearch = trpc.instagram.startSearch.useMutation({
    onSuccess: (data) => {
      setIgSearchId(data.searchId);
      toast.success(`تم العثور على ${(data as any).count || 0} حساب`);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });
  const suggestHashtags = trpc.aiSearch.generateStrategy.useMutation({
    onSuccess: (data) => {
      toast.success("تم توليد استراتيجية البحث");
      const match = data.strategy?.match(/#[\u0600-\u06FF\w]+/);
      if (match) setIgHashtag(match[0].replace("#", ""));
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== TikTok =====
  const [tiktokKeyword, setTiktokKeyword] = useState("");
  const [tiktokCity, setTiktokCity] = useState("الرياض");
  const [tiktokResults, setTiktokResults] = useState<any[]>([]);
  const [tiktokHashtags, setTiktokHashtags] = useState<string[]>([]);
  const searchTikTok = trpc.socialSearch.searchTikTok.useMutation({
    onSuccess: (data) => {
      setTiktokResults(data.results);
      toast.success(`تم العثور على ${data.total} نتيجة من TikTok`);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });
  const suggestTiktokHashtags = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data) => {
      setTiktokHashtags(data.hashtags);
      toast.success("تم اقتراح الهاشتاقات");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== Snapchat =====
  const [snapKeyword, setSnapKeyword] = useState("");
  const [snapCity, setSnapCity] = useState("الرياض");
  const [snapResults, setSnapResults] = useState<any[]>([]);
  const [snapHashtags, setSnapHashtags] = useState<string[]>([]);
  const searchSnapchat = trpc.socialSearch.searchSnapchat.useMutation({
    onSuccess: (data) => {
      setSnapResults(data.results);
      toast.success(`تم العثور على ${data.total} نتيجة من Snapchat`);
    },
    onError: (e) => toast.error("خطأ في البحث", { description: e.message }),
  });
  const suggestSnapHashtags = trpc.socialSearch.suggestSocialHashtags.useMutation({
    onSuccess: (data) => {
      setSnapHashtags(data.hashtags);
      toast.success("تم اقتراح الهاشتاقات");
    },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });

  // ===== Telegram =====
  const [telegramKeyword, setTelegramKeyword] = useState("");
  const [telegramCity, setTelegramCity] = useState("الرياض");
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

          {/* ===== Google Text Search ===== */}
          <TabsContent value="google" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  بحث Google عن الأنشطة التجارية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">نوع النشاط</Label>
                    <Input
                      value={googleQuery}
                      onChange={e => setGoogleQuery(e.target.value)}
                      placeholder="مثال: مطعم، صالون، مقاول، مستشفى..."
                      onKeyDown={e => e.key === "Enter" && googleQuery && searchPlaces.mutate({ query: googleQuery, city: googleCity })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={googleCity} onChange={e => setGoogleCity(e.target.value)} placeholder="الرياض" list="cities-google" />
                    <datalist id="cities-google">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { setGoogleResults([]); setGoogleNextToken(null); searchPlaces.mutate({ query: googleQuery, city: googleCity }); }}
                  disabled={searchPlaces.isPending || !googleQuery}
                >
                  {searchPlaces.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  بحث
                </Button>
              </CardContent>
            </Card>
            {googleResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{googleResults.length} نتيجة</p>
                  {googleNextToken && (
                    <Button variant="outline" size="sm" onClick={() => searchPlaces.mutate({ query: googleQuery, city: googleCity, pagetoken: googleNextToken })} disabled={searchPlaces.isPending}>
                      {searchPlaces.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                      المزيد
                    </Button>
                  )}
                </div>
                {googleResults.map((r, i) => <ResultCard key={i} result={r} onAdd={handleAddLead} />)}
              </div>
            )}
          </TabsContent>

          {/* ===== Google Maps ===== */}
          <TabsContent value="maps" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="w-4 h-4 text-green-400" />
                  بحث خرائط Google (مع التفاصيل)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs mb-1 block">نوع النشاط</Label>
                    <Input value={mapsQuery} onChange={e => setMapsQuery(e.target.value)} placeholder="مثال: مطعم، صالون، مقاول..." />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة / المنطقة</Label>
                    <Input value={mapsCity} onChange={e => setMapsCity(e.target.value)} placeholder="الرياض" list="cities-maps" />
                    <datalist id="cities-maps">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => { setMapsResults([]); setMapsNextToken(null); searchMaps.mutate({ query: mapsQuery, city: mapsCity }); }}
                  disabled={searchMaps.isPending || !mapsQuery}
                >
                  {searchMaps.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Map className="w-4 h-4 mr-2" />}
                  بحث في الخرائط
                </Button>
              </CardContent>
            </Card>
            {mapsResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{mapsResults.length} نتيجة</p>
                  {mapsNextToken && (
                    <Button variant="outline" size="sm" onClick={() => searchMaps.mutate({ query: mapsQuery, city: mapsCity, pagetoken: mapsNextToken })} disabled={searchMaps.isPending}>
                      {searchMaps.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                      المزيد
                    </Button>
                  )}
                </div>
                {mapsResults.map((r, i) => <ResultCard key={i} result={r} onAdd={handleAddLead} />)}
              </div>
            )}
          </TabsContent>

          {/* ===== Instagram ===== */}
          <TabsContent value="instagram" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  بحث إنستغرام بالهاشتاق
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs mb-1 block">نوع النشاط (للاقتراح)</Label>
                    <Input value={igBusinessType} onChange={e => setIgBusinessType(e.target.value)} placeholder="مطعم، صالون..." />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">المدينة</Label>
                    <Input value={igCity} onChange={e => setIgCity(e.target.value)} placeholder="الرياض" list="cities-ig" />
                    <datalist id="cities-ig">{SAUDI_CITIES.map(c => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full text-xs"
                      onClick={() => suggestHashtags.mutate({ platform: "instagram", businessType: igBusinessType || "عام", city: igCity })}
                      disabled={suggestHashtags.isPending}
                    >
                      {suggestHashtags.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                      اقتراح هاشتاقات بالذكاء الاصطناعي
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">الهاشتاق</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={igHashtag} onChange={e => setIgHashtag(e.target.value.replace(/^#/, ""))} placeholder="مطعم_الرياض" className="pr-9" />
                    </div>
                    <Button onClick={() => startIgSearch.mutate({ hashtag: igHashtag })} disabled={startIgSearch.isPending || !igHashtag}>
                      {startIgSearch.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      بحث
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">يتطلب INSTAGRAM_ACCESS_TOKEN في إعدادات المشروع</p>
              </CardContent>
            </Card>
            {getIgAccounts.data && getIgAccounts.data.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{getIgAccounts.data.length} حساب</p>
                {getIgAccounts.data.map((r: any, i: number) => (
                  <ResultCard key={i} result={{ name: r.username, bio: r.bio, followers: r.followersCount, website: r.website, phone: r.phone, source: "Instagram" }} onAdd={handleAddLead} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== TikTok ===== */}
          <TabsContent value="tiktok" className="mt-6">
            <SocialPlatformSearch
              platform="TikTok"
              icon={Video}
              color="text-pink-400"
              description="يبحث في TikTok عن الأنشطة التجارية والمؤثرين التجاريين مع محاكاة سلوك البشر"
              keyword={tiktokKeyword} setKeyword={setTiktokKeyword}
              city={tiktokCity} setCity={setTiktokCity}
              results={tiktokResults}
              isLoading={searchTikTok.isPending}
              onSearch={() => { setTiktokResults([]); searchTikTok.mutate({ keyword: tiktokKeyword, city: tiktokCity }); }}
              onAdd={handleAddLead}
              hashtags={tiktokHashtags}
              onSuggestHashtags={() => suggestTiktokHashtags.mutate({ keyword: tiktokKeyword, city: tiktokCity, platform: "tiktok" })}
              isSuggestingHashtags={suggestTiktokHashtags.isPending}
            />
          </TabsContent>

          {/* ===== Snapchat ===== */}
          <TabsContent value="snapchat" className="mt-6">
            <SocialPlatformSearch
              platform="Snapchat"
              icon={Camera}
              color="text-yellow-400"
              description="يبحث في Snapchat عن الأنشطة التجارية والحسابات التجارية النشطة"
              keyword={snapKeyword} setKeyword={setSnapKeyword}
              city={snapCity} setCity={setSnapCity}
              results={snapResults}
              isLoading={searchSnapchat.isPending}
              onSearch={() => { setSnapResults([]); searchSnapchat.mutate({ keyword: snapKeyword, city: snapCity }); }}
              onAdd={handleAddLead}
              hashtags={snapHashtags}
              onSuggestHashtags={() => suggestSnapHashtags.mutate({ keyword: snapKeyword, city: snapCity, platform: "snapchat" })}
              isSuggestingHashtags={suggestSnapHashtags.isPending}
            />
          </TabsContent>

          {/* ===== Telegram ===== */}
          <TabsContent value="telegram" className="mt-6">
            <SocialPlatformSearch
              platform="Telegram"
              icon={MessageCircle}
              color="text-blue-400"
              description="يبحث في Telegram وtgstat.com عن القنوات والمجموعات التجارية السعودية"
              keyword={telegramKeyword} setKeyword={setTelegramKeyword}
              city={telegramCity} setCity={setTelegramCity}
              results={telegramResults}
              isLoading={searchTelegram.isPending}
              onSearch={() => { setTelegramResults([]); searchTelegram.mutate({ keyword: telegramKeyword, city: telegramCity }); }}
              onAdd={handleAddLead}
              hashtags={telegramHashtags}
              onSuggestHashtags={() => suggestTelegramHashtags.mutate({ keyword: telegramKeyword, city: telegramCity, platform: "telegram" })}
              isSuggestingHashtags={suggestTelegramHashtags.isPending}
            />
          </TabsContent>

          {/* ===== رابط مخصص ===== */}
          <TabsContent value="custom" className="mt-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-orange-400" />
                  استخراج من رابط مخصص
                </CardTitle>
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
                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">أمثلة على الروابط المدعومة:</p>
                  <p>• صفحات دليل الأعمال (معروف، دليل السعودية)</p>
                  <p>• نتائج بحث Google Maps</p>
                  <p>• صفحات فئة في إنستغرام أو تويتر</p>
                  <p>• أي صفحة تحتوي على قوائم أنشطة تجارية</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => scrapeUrl.mutate({ url: customUrl })}
                  disabled={!customUrl || scrapeUrl.isPending}
                >
                  {scrapeUrl.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  استخراج البيانات
                </Button>
              </CardContent>
            </Card>
            {customResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{customResults.length} نتيجة</p>
                {customResults.map((r: any, i: number) => (
                  <ResultCard key={i} result={{ ...r, source: "رابط مخصص" }} onAdd={handleAddLead} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
