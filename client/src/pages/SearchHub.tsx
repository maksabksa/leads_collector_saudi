// @ts-nocheck
/**
 * مركز البحث الاحترافي - نسخة 2.0
 * واجهة موحدة للبحث في جميع المنصات مع نتائج فورية
 */
import { useState, useCallback, useEffect, useRef } from "react";
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
  RotateCcw, Info, Brain, TrendingUp, Sparkles, Clock,
  Navigation, Crosshair, CircleDot, ChevronDown, UserPlus,
  SearchCheck, Link2, BarChart2, Shield, Twitter, Linkedin, Mail
} from "lucide-react";
import { MapView } from "@/components/Map";
import { AddLeadModal } from "@/components/AddLeadModal";

// ===== ثوابت =====
const SAUDI_CITIES = [
  // المدن الرئيسية
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الطائف", "تبوك", "أبها", "القصيم",
  "حائل", "نجران", "جازان", "الجوف", "عرعر",
  "الأحساء", "الجبيل", "ينبع",
  // مدن إضافية
  "بريدة", "عنيزة", "الرس، القصيم", "خميس مشيط", "الباحة",
  "سكاكا", "بيش", "صبيا", "القنفذة", "الليث",
  "رابغ", "وادي الدواسر", "الدوادمي", "المجمعة", "شقراء",
  "الزلفي", "القطيف", "سيهات", "الوجه", "المويه",
  "ضبا", "الحديدة", "صامطة", "فيفاء", "أملج",
  "بدر", "خيبر", "العلا", "تيماء", "الخرج",
  "الافلاج", "الحوية", "السليل", "بيشة", "محايل عسير",
  "طريف", "العقيق", "النماص", "الطائف الهدا"
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
    id: "googleWeb",
    label: "Google Search",
    icon: SearchCheck,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/40",
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
    id: "twitter",
    label: "تويتر / X",
    icon: Twitter,
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/40",
  },
  {
    id: "linkedin",
    label: "لينكدإن",
    icon: Linkedin,
    color: "text-blue-500",
    bgColor: "bg-blue-600/10",
    borderColor: "border-blue-600/30",
    badgeColor: "bg-blue-600/20 text-blue-500 border-blue-600/40",
  },
  {
    id: "facebook",
    label: "فيسبوك",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    badgeColor: "bg-blue-400/20 text-blue-400 border-blue-400/40",
  },
] as const;

const ALL_PLATFORM_IDS = ["google", "googleWeb", "instagram", "tiktok", "snapchat", "twitter", "linkedin", "facebook"] as const;

type PlatformId = typeof PLATFORMS[number]["id"];
type ActiveTabType = PlatformId | "all";

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
                {/* عرض الرابط المختصر قابل للنقر */}
                {(result.profileUrl || result.url) && (
                  <a
                    href={result.profileUrl || result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400/70 hover:text-blue-400 mt-0.5 font-mono flex items-center gap-1 truncate max-w-[200px]"
                    dir="ltr"
                    onClick={e => e.stopPropagation()}
                  >
                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                    {(() => {
                      try {
                        const u = new URL(result.profileUrl || result.url);
                        return u.hostname.replace('www.', '') + (u.pathname.length > 1 ? u.pathname.slice(0, 30) : '');
                      } catch { return (result.profileUrl || result.url).slice(0, 40); }
                    })()}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {(result.dataSource === "tiktok_puppeteer" || result.dataSource === "snapchat_puppeteer") && (
                  <span className="flex items-center gap-0.5 text-xs text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded" title="تم الاستخراج بواسطة Puppeteer">
                    ⚡ متقدم
                  </span>
                )}
                {result.verified && (
                  <span className="text-xs text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                    ✓ موثق
                  </span>
                )}
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
                  variant="outline"
                  className="h-7 text-xs gap-1.5 px-2.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  onClick={() => window.open(result.url, "_blank")}
                  title={result.url}
                >
                  <ExternalLink className="w-3 h-3" />
                  فتح الرابط
                </Button>
              )}
              {result.username && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 px-2.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                  onClick={() => {
                    const url = result.profileUrl ||
                      (result.dataSource?.includes("tiktok") ? `https://www.tiktok.com/@${result.username}` :
                       result.dataSource?.includes("snapchat") ? `https://www.snapchat.com/add/${result.username}` :
                       result.dataSource?.includes("facebook") ? `https://www.facebook.com/${result.username}` :
                       `https://instagram.com/${result.username}`);
                    window.open(url, "_blank");
                  }}
                  title={result.profileUrl || `@${result.username}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  فتح الملف
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
  const [activeTab, setActiveTab] = useState<ActiveTabType>("google");
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [onlyWithContact, setOnlyWithContact] = useState(false); // هاتف أو بريد
  // ===== معالج الاستهداف الذكي =====
  const [showTargetWizard, setShowTargetWizard] = useState(false);
  const [targetFilters, setTargetFilters] = useState({
    targetCount: 20,
    activityType: "",
    minRating: 0,
    mustHavePhone: false,
    mustHaveWebsite: false,
    onlyOpenNow: false,
    minReviews: 0,
    priceLevel: "any" as "any" | "1" | "2" | "3" | "4",
    district: "",
    additionalKeywords: "",
  });

  // ===== البحث الجغرافي بالنطاق =====
  const [showRadiusSearch, setShowRadiusSearch] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const resultMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const searchByRadiusMut = trpc.search.searchByRadius.useMutation();
  const geocodeAddressMut = trpc.search.geocodeAddress.useMutation();

  // ===== Google Web Search State =====
  const [googleWebSearchType, setGoogleWebSearchType] = useState<"businesses" | "general">("businesses");
  const [googleWebPage, setGoogleWebPage] = useState(1);
  const [googleWebStrategy, setGoogleWebStrategy] = useState<any>(null);
  const [showGoogleStrategy, setShowGoogleStrategy] = useState(false);
  const googleWebSearchMut = trpc.googleSearch.searchWeb.useMutation();
  const googleWebDeepSearchMut = trpc.googleSearch.deepSearchSite.useMutation();

  // نتائج البحث
  const [results, setResults] = useState<Record<PlatformId, any[]>>({
    google: [], googleWeb: [], instagram: [], tiktok: [], snapchat: [], twitter: [], linkedin: [], facebook: []
  });
  // حالة التحميل
  const [loading, setLoading] = useState<Record<PlatformId, boolean>>({
    google: false, googleWeb: false, instagram: false, tiktok: false, snapchat: false, twitter: false, linkedin: false, facebook: false
  });
  // عدد النتائج المعروضة
  const [resultLimit, setResultLimit] = useState<number>(25);

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
  // ===== Popup الخريطة التفاعلي =====
  const [mapPopup, setMapPopup] = useState<{ place: any; x: number; y: number } | null>(null);
  const [mapPopupPlaceId, setMapPopupPlaceId] = useState<string | null>(null);
  const mapPopupDetailsQuery = trpc.search.getPlaceDetails.useQuery(
    mapPopupPlaceId ? { placeId: mapPopupPlaceId } : skipToken,
    { enabled: !!mapPopupPlaceId, staleTime: 5 * 60 * 1000 }
  );
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // ===== نظام تعلم السلوك =====
  const [behaviorPatterns, setBehaviorPatterns] = useState<any>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [showSmartPanel, setShowSmartPanel] = useState(false);
  const [enhancedQuery, setEnhancedQuery] = useState<string | null>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const clickDelaysRef = useRef<number[]>([]);
  const lastClickRef = useRef<number>(0);
  const scrollDepthRef = useRef<number>(0);
  // ===== API ======
  const searchPlaces = trpc.search.searchPlaces.useMutation();
  const searchInstagramMut = trpc.socialSearch.searchInstagram.useMutation();
  const searchTiktokMut = trpc.socialSearch.searchTikTok.useMutation();
  const searchSnapchatMut = trpc.socialSearch.searchSnapchat.useMutation();
  const searchTelegramMut = trpc.socialSearch.searchTelegram.useMutation();
  const brightDataConnectionQuery = trpc.brightDataSearch.checkConnection.useQuery();
  const instagramSearchMut = trpc.instagram.startSearch.useMutation();
  const searchTwitterMut = trpc.socialSearch.searchTwitter.useMutation();
  const searchLinkedInMut = trpc.socialSearch.searchLinkedIn.useMutation();
  const searchFacebookMut = trpc.socialSearch.searchFacebook.useMutation();
  const suggestHashtagsMut = trpc.socialSearch.suggestSocialHashtags.useMutation();
  const createLead = trpc.leads.create.useMutation();
  const addInstagramAsLead = trpc.instagram.addAsLead.useMutation();
  // نظام تعلم السلوك
  // جلب تفاصيل Google Maps (الهاتف والموقع) عند فتح نموذج الإضافة
  const [currentPlaceId, setCurrentPlaceId] = useState<string | null>(null);
  const placeDetailsQuery = trpc.search.getPlaceDetails.useQuery(
    currentPlaceId ? { placeId: currentPlaceId } : skipToken,
    { enabled: !!currentPlaceId, staleTime: 5 * 60 * 1000 }
  );
  const logSearchSessionMut = trpc.searchBehavior.logSearchSession.useMutation();
  const enhanceQueryMut = trpc.searchBehavior.enhanceQuery.useMutation();
  const behaviorPatternsQuery = trpc.searchBehavior.getBehaviorPatterns.useQuery(
    { platform: activeTab },
    { staleTime: 60000 }
  );
  const smartSuggestionsQuery = trpc.searchBehavior.getSmartSuggestions.useQuery(
    { platform: activeTab, currentQuery: keyword || undefined },
    { staleTime: 30000 }
  );

  // ===== جلب أسماء العملاء الموجودين لمنع التكرار =====
  const existingLeadsQuery = trpc.leads.getNames.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 دقائق
  });
  const existingNames = new Set(
    (existingLeadsQuery.data || []).map((l: any) => (l.name || "").trim().toLowerCase())
  );
  // مجموعات للمقارنة بالـ usernames من الـ URLs
  const extractUsername = (url: string) => {
    if (!url) return "";
    return url.toLowerCase()
      .replace(/.*instagram\.com\//, "")
      .replace(/.*tiktok\.com\/@?/, "")
      .replace(/.*(?:twitter|x)\.com\//, "")
      .replace(/.*snapchat\.com\/add\//, "")
      .replace(/.*snapchat\.com\//, "")
      .replace(/[/?#].*$/, "")
      .replace(/^@/, "")
      .trim();
  };
  const existingInstagramUsernames = new Set(
    (existingLeadsQuery.data || []).filter((l: any) => l.instagram).map((l: any) => extractUsername(l.instagram))
  );
  const existingTiktokUsernames = new Set(
    (existingLeadsQuery.data || []).filter((l: any) => l.tiktok).map((l: any) => extractUsername(l.tiktok))
  );
  const existingTwitterUsernames = new Set(
    (existingLeadsQuery.data || []).filter((l: any) => l.twitter).map((l: any) => extractUsername(l.twitter))
  );
  const isExistingLead = (result: any): boolean => {
    // مقارنة بالاسم
    const name = (result.name || result.fullName || "").trim().toLowerCase();
    if (name.length > 0 && existingNames.has(name)) return true;
    // مقارنة بـ Instagram username
    const igUser = (result.username || result.instagramUsername || "").trim().toLowerCase().replace(/^@/, "");
    if (igUser.length > 0 && existingInstagramUsernames.has(igUser)) return true;
    // مقارنة بـ TikTok username
    const ttUser = (result.uniqueId || result.tiktokUsername || "").trim().toLowerCase().replace(/^@/, "");
    if (ttUser.length > 0 && existingTiktokUsernames.has(ttUser)) return true;
    // مقارنة بـ Twitter username
    const twUser = (result.twitterUsername || result.screenName || "").trim().toLowerCase().replace(/^@/, "");
    if (twUser.length > 0 && existingTwitterUsernames.has(twUser)) return true;
    return false;
  };

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

  // تحديث أنماط السلوك من الـ API
  useEffect(() => {
    if (behaviorPatternsQuery.data) {
      setBehaviorPatterns(behaviorPatternsQuery.data);
    }
  }, [behaviorPatternsQuery.data]);

  // تحديث الاقتراحات الذكية
  useEffect(() => {
    if (smartSuggestionsQuery.data?.suggestions) {
      setSmartSuggestions(
        smartSuggestionsQuery.data.suggestions
          .map((s: any) => s.query)
          .filter(Boolean)
          .slice(0, 5)
      );
    }
  }, [smartSuggestionsQuery.data]);

  // تتبع عمق التمرير
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop + el.clientHeight;
      const total = el.scrollHeight;
      const depth = Math.round((scrolled / total) * 100);
      scrollDepthRef.current = Math.max(scrollDepthRef.current, depth);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // تسجيل نقرة (لتتبع أنماط النقر)
  const trackClick = () => {
    const now = Date.now();
    if (lastClickRef.current > 0) {
      clickDelaysRef.current.push(now - lastClickRef.current);
      if (clickDelaysRef.current.length > 20) clickDelaysRef.current.shift();
    }
    lastClickRef.current = now;
  };

  // تسجيل جلسة البحث بعد الانتهاء
  const logSession = useCallback(async (
    platform: string,
    query: string,
    resultsCount: number,
    addedCount: number,
    success: boolean,
    filters?: Record<string, any>
  ) => {
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    try {
      await logSearchSessionMut.mutateAsync({
        platform,
        query,
        resultsCount,
        addedToLeads: addedCount,
        sessionDuration: duration,
        scrollDepth: scrollDepthRef.current,
        searchSuccess: success,
        filters: filters || {},
        clickPattern: {
          delays: [...clickDelaysRef.current],
        },
      });
    } catch {
      // تجاهل أخطاء تسجيل السلوك
    }
  }, [logSearchSessionMut]);

  // ===== دوال الخريطة التفاعلية =====
  const updateMapCircle = useCallback((center: { lat: number; lng: number }, radiusMeters: number, map: google.maps.Map) => {
    // حذف الدائرة القديمة
    if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
    // رسم دائرة جديدة
    circleRef.current = new window.google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      fillColor: "#22c55e",
      fillOpacity: 0.12,
      strokeColor: "#22c55e",
      strokeOpacity: 0.6,
      strokeWeight: 2,
    });
    // تحديث الماركر
    if (markerRef.current) {
      markerRef.current.map = null;
    }
    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: center,
      title: `مركز البحث (${radiusMeters / 1000} كم)`,
    });
    // ضبط العرض ليشمل الدائرة
    const bounds = circleRef.current.getBounds();
    if (bounds) map.fitBounds(bounds);
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // النقر على الخريطة لتحديد المركز
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const center = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setSearchCenter(center);
      updateMapCircle(center, radiusKm * 1000, map);
    });
    // ربط دالة إضافة عميل من الـ InfoWindow
    (window as any).__addLeadFromMap = (placeId: string) => {
      const place = results.google.find((r: any) => r.place_id === placeId);
      if (place) {
        handleOpenAddDialog(place, "google");
        if (infoWindowRef.current) infoWindowRef.current.close();
      }
    };
  }, [radiusKm, updateMapCircle]);

  // تحديث الدائرة عند تغيير النطاق
  useEffect(() => {
    if (mapRef.current && searchCenter) {
      updateMapCircle(searchCenter, radiusKm * 1000, mapRef.current);
    }
  }, [radiusKm, searchCenter, updateMapCircle]);

  // عرض نتائج البحث كـ pins على الخريطة
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    // حذف الماركرات القديمة
    resultMarkersRef.current.forEach(m => { m.map = null; });
    resultMarkersRef.current = [];
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    // إضافة pin لكل نتيجة
    results.google.forEach((place: any) => {
      if (!place.geometry?.location) return;
      const pos = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };
      // إنشاء عنصر HTML مخصص للـ pin
      const pinEl = document.createElement("div");
      pinEl.style.cssText = `
        width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
        background: #22c55e; border: 2px solid #fff;
        transform: rotate(-45deg); cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
      `;
      const inner = document.createElement("div");
      inner.style.cssText = "width:10px;height:10px;border-radius:50%;background:#fff;transform:rotate(45deg);";
      pinEl.appendChild(inner);
      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: pos,
        title: place.name,
        content: pinEl,
      });
      // Popup React عند النقر على نقطة الخريطة
      marker.addListener("click", (e: any) => {
        // الانتقال لموقع النشاط وتكبيره
        map.panTo(pos);
        if (map.getZoom()! < 16) map.setZoom(16);
        // تحديد موضع النافذة بالنسبة لحاوية الخريطة
        const container = mapContainerRef.current;
        let px = 200, py = 200;
        if (container && e?.domEvent) {
          const rect = container.getBoundingClientRect();
          px = (e.domEvent as MouseEvent).clientX - rect.left;
          py = (e.domEvent as MouseEvent).clientY - rect.top;
        }
        setMapPopup({ place, x: px, y: py });
        setMapPopupPlaceId(place.place_id || null);
      });
      resultMarkersRef.current.push(marker);
    });
  }, [results.google]);

  const handleGeocodeAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    try {
      const res = await geocodeAddressMut.mutateAsync({ address: addressInput });
      const center = { lat: res.lat, lng: res.lng };
      setSearchCenter(center);
      if (mapRef.current) {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(13);
        updateMapCircle(center, radiusKm * 1000, mapRef.current);
      }
      toast.success(`تم تحديد الموقع: ${res.formattedAddress}`);
    } catch (e: any) {
      toast.error("خطأ في تحديد الموقع", { description: e.message });
    }
  }, [addressInput, radiusKm, geocodeAddressMut, updateMapCircle]);

  const handleUseCurrentCity = useCallback(async () => {
    if (!city) return;
    setAddressInput(city + ", المملكة العربية السعودية");
    try {
      const res = await geocodeAddressMut.mutateAsync({ address: city + ", Saudi Arabia" });
      const center = { lat: res.lat, lng: res.lng };
      setSearchCenter(center);
      if (mapRef.current) {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(12);
        updateMapCircle(center, radiusKm * 1000, mapRef.current);
      }
    } catch {
      // تجاهل الخطأ
    }
  }, [city, radiusKm, geocodeAddressMut, updateMapCircle]);

  const handleSearchByRadius = useCallback(async () => {
    if (!keyword.trim()) { toast.error("أدخل كلمة البحث أولاً"); return; }
    if (!searchCenter) { toast.error("حدد مركز البحث على الخريطة أولاً"); return; }
    sessionStartRef.current = Date.now();
    setLoadingPlatform("google", true);
    setResultsPlatform("google", []);
    try {
      const res = await searchByRadiusMut.mutateAsync({
        keyword,
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        radiusKm,
      });
      const googleResults = res.results || [];
      setResultsPlatform("google", googleResults);
      if (!googleResults.length) {
        toast.info("لا توجد نتائج ضمن هذا النطاق");
      } else {
        toast.success(`تم العثور على ${googleResults.length} نتيجة ضمن نطاق ${radiusKm} كم`);
      }
      await logSession("google", keyword, googleResults.length, 0, googleResults.length > 0, { radiusKm, lat: searchCenter.lat, lng: searchCenter.lng });
    } catch (e: any) {
      toast.error("خطأ في البحث الجغرافي", { description: e.message });
    } finally {
      setLoadingPlatform("google", false);
    }
  }, [keyword, searchCenter, radiusKm, searchByRadiusMut, logSession]);

  // ===== دوال البحث =====
  const setLoadingPlatform = (platform: PlatformId, val: boolean) =>
    setLoading(prev => ({ ...prev, [platform]: val }));
  const setResultsPlatform = (platform: PlatformId, data: any[]) =>
    setResults(prev => ({ ...prev, [platform]: data }));

  const searchGoogle = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    scrollDepthRef.current = 0;
    trackClick();
    setLoadingPlatform("google", true);
    setResultsPlatform("google", []);
    try {
      const res = await searchPlaces.mutateAsync({ query: keyword, city, country: "السعودية" });
      const googleResults = res.results || [];
      setResultsPlatform("google", googleResults);
      if (!googleResults.length) toast.info("لا توجد نتائج في Google Maps");
      // تسجيل الجلسة
      await logSession("google", keyword, googleResults.length, 0, googleResults.length > 0, { city });
    } catch (e: any) {
      toast.error("خطأ في Google Maps", { description: e.message });
      await logSession("google", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("google", false);
    }
  }, [keyword, city, logSession]);

  const searchInstagram = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    trackClick();
    setLoadingPlatform("instagram", true);
    setResultsPlatform("instagram", []);
    setInstagramSearchId(null);
    try {
      const res = await searchInstagramMut.mutateAsync({ keyword, city });
      const data = (res as any)?.results || res || [];
      setResultsPlatform("instagram", data);
      if (!data.length) toast.info("لا توجد نتائج في إنستجرام");
      else toast.success(`تم العثور على ${data.length} نتيجة من إنستجرام`);
      await logSession("instagram", keyword, data.length, 0, data.length > 0, { city });
    } catch (e: any) {
      toast.error("خطأ في البحث في إنستجرام", { description: e.message });
      await logSession("instagram", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("instagram", false);
    }
  }, [keyword, city, logSession, searchInstagramMut]);

  const searchTiktok = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    trackClick();
    setLoadingPlatform("tiktok", true);
    setResultsPlatform("tiktok", []);
    try {
      const res = await searchTiktokMut.mutateAsync({ keyword, city });
      const tiktokData = (res as any)?.results || res || [];
      setResultsPlatform("tiktok", tiktokData);
      if (!tiktokData.length) toast.info("لا توجد نتائج في تيك توك");
      await logSession("tiktok", keyword, tiktokData.length, 0, tiktokData.length > 0, { city });
    } catch (e: any) {
      handleBrightDataError(e, "تيك توك");
      await logSession("tiktok", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("tiktok", false);
    }
  }, [keyword, city, logSession]);

   const searchSnapchat = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    trackClick();
    setLoadingPlatform("snapchat", true);
    setResultsPlatform("snapchat", []);
    try {
      const res = await searchSnapchatMut.mutateAsync({ keyword, city });
      const snapData = (res as any)?.results || res || [];
      setResultsPlatform("snapchat", snapData);
      if (!snapData.length) toast.info("لا توجد نتائج في سناب شات");
      await logSession("snapchat", keyword, snapData.length, 0, snapData.length > 0, { city });
    } catch (e: any) {
      handleBrightDataError(e, "سناب شات");
      await logSession("snapchat", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("snapchat", false);
    }
  }, [keyword, city, logSession]);
  // telegram removed

  // ===== دالة البحث في Google Web =====
  const searchGoogleWeb = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    trackClick();
    setLoadingPlatform("googleWeb", true);
    setResultsPlatform("googleWeb", []);
    setGoogleWebPage(1);
    try {
      const res = await googleWebSearchMut.mutateAsync({
        keyword,
        city,
        searchType: googleWebSearchType,
        page: 1,
      });
      const webResults = res.results || [];
      setResultsPlatform("googleWeb", webResults);
      if (!webResults.length) {
        toast.info("لا توجد نتائج في Google Search", { description: "جرب كلمات بحث مختلفة" });
      } else {
        toast.success(`تم العثور على ${webResults.length} نتيجة من Google`, {
          description: `الاستعلام: ${res.query}`,
        });
      }
      await logSession("googleWeb", keyword, webResults.length, 0, webResults.length > 0, { city, searchType: googleWebSearchType });
    } catch (e: any) {
      toast.error("خطأ في Google Search", { description: e.message });
    } finally {
      setLoadingPlatform("googleWeb", false);
    }
  }, [keyword, city, googleWebSearchType, logSession]);


  const handleGoogleWebDeepSearch = async (url: string) => {
    if (!url) return;
    try {
      const res = await googleWebDeepSearchMut.mutateAsync({ url, keyword });
      // تحديث النتيجة في القائمة
      setResults(prev => ({
        ...prev,
        googleWeb: prev.googleWeb.map((r: any) =>
          r.url === url
            ? { ...r, availablePhones: [...(r.availablePhones || []), ...res.phones], availableWebsites: [...(r.availableWebsites || [])], deepSearched: true, deepData: res }
            : r
        ),
      }));
      if (res.phones.length > 0) {
        toast.success(`تم العثور على ${res.phones.length} رقم هاتف`, { description: url });
      } else {
        toast.info("لم يُعثر على أرقام في هذا الموقع");
      }
    } catch {
      toast.error("خطأ في البحث المتعمق");
    }
  };

  // ===== معالج أخطاء Bright Data المشترك =====
  const handleBrightDataError = (e: any, platform: string) => {
    const msg = e?.message || "";
    if (msg.includes("رصيد Bright Data غير كاف")) {
      toast.error("رصيد Bright Data غير كافٍ — يرجى شحن الحساب", {
        description: (
          <span>
            اذهب إلى{" "}
            <a href="https://brightdata.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              brightdata.com
            </a>{" "}
            واشحن حسابك لمتابعة البحث.
          </span>
        ) as any,
        duration: 8000,
      });
    } else if (msg.includes("حجبت الوصول")) {
      toast.warning(`المنصة حجبت الوصول مؤقتًا`, { description: "حاول مرة أخرى بعد دقيقة", duration: 5000 });
    } else if (msg.includes("انتهت مهلة")) {
      toast.warning("انتهت مهلة البحث", { description: "تأكد من اتصال Bright Data وحاول مرة أخرى", duration: 5000 });
    } else {
      toast.error(`خطأ في ${platform}`, { description: msg });
    }
  };

  // ===== دالة البحث في Twitter/X عبر SERP API =====
  const searchTwitter = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("twitter", true);
    setResultsPlatform("twitter", []);
    try {
      const res = await searchTwitterMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("twitter", data);
      if (!data.length) toast.info("لا توجد نتائج في تويتر");
      else toast.success(`تم العثور على ${data.length} نتيجة من تويتر`);
    } catch (e: any) {
      toast.error("خطأ في تويتر", { description: e.message });
    } finally {
      setLoadingPlatform("twitter", false);
    }
  }, [keyword, city]);

  // ===== دالة البحث في LinkedIn عبر SERP API =====
  const searchLinkedIn = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("linkedin", true);
    setResultsPlatform("linkedin", []);
    try {
      const res = await searchLinkedInMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("linkedin", data);
      if (!data.length) toast.info("لا توجد نتائج في لينكدإن");
      else toast.success(`تم العثور على ${data.length} شركة من لينكدإن`);
    } catch (e: any) {
      toast.error("خطأ في لينكدإن", { description: e.message });
    } finally {
      setLoadingPlatform("linkedin", false);
    }
  }, [keyword, city]);

  // ===== دالة البحث في Facebook عبر SERP API =====
  const searchFacebook = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("facebook", true);
    setResultsPlatform("facebook", []);
    try {
      const res = await searchFacebookMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("facebook", data);
      if (!data.length) toast.info("لا توجد نتائج في فيسبوك");
      else toast.success(`تم العثور على ${data.length} صفحة من فيسبوك`);
    } catch (e: any) {
      toast.error("خطأ في فيسبوك", { description: e.message });
    } finally {
      setLoadingPlatform("facebook", false);
    }
  }, [keyword, city]);

  const searchFunctions: Record<PlatformId, () => void> = {
    google: searchGoogle,
    googleWeb: searchGoogleWeb,
    instagram: searchInstagram,
    tiktok: searchTiktok,
    snapchat: searchSnapchat,
    twitter: searchTwitter,
    linkedin: searchLinkedIn,
    facebook: searchFacebook,
  };

  const handleSearch = () => {
    if (activeTab === "all") {
      handleSearchAll();
    } else {
      searchFunctions[activeTab]();
    }
  };

  // تحسين الاستعلام بالذكاء الاصطناعي
  const handleEnhanceQuery = async () => {
    if (!keyword.trim()) return;
    try {
      const res = await enhanceQueryMut.mutateAsync({ query: keyword, platform: activeTab });
      setEnhancedQuery(res.enhanced);
      if (res.suggestions?.length) {
        setSuggestedHashtags(res.suggestions);
      }
      toast.success("تم تحسين الاستعلام", {
        description: res.searchStrategy || "استراتيجية بحث محسّنة",
      });
    } catch {
      toast.error("خطأ في تحسين الاستعلام");
    }
  };

  const handleSearchAll = () => {
    if (!keyword.trim()) return;
    searchGoogle();
    searchGoogleWeb();
    searchTiktok();
    searchSnapchat();
    searchTwitter();
    searchLinkedIn();
    searchFacebook();
    toast.info("بدأ البحث في جميع المنصات", { description: "سيستغرق بضع ثوانَ..." });
  };

  const handleSuggestHashtags = async () => {
    if (!keyword.trim()) return;
    try {
      const platformForHashtags = (activeTab === "tiktok" || activeTab === "snapchat") ? activeTab : undefined;
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
    // لنتائج Google Maps: استدعاء التفاصيل لجلب الهاتف والموقع تلقائياً
    if (platform === "google" && result.place_id) {
      setCurrentPlaceId(result.place_id);
    } else {
      setCurrentPlaceId(null);
    }
  };

  // تحديث دالة إضافة العميل من الخريطة عند تغيير النتائج
  useEffect(() => {
    (window as any).__addLeadFromMap = (placeId: string) => {
      const place = results.google.find((r: any) => r.place_id === placeId);
      if (place) {
        handleOpenAddDialog(place, "google");
        if (infoWindowRef.current) infoWindowRef.current.close();
      }
    };
  }, [results.google]);

  // تحديث النموذج تلقائياً عند جلب تفاصيل Google Maps
  useEffect(() => {
    if (placeDetailsQuery.data && addDialog.open && addDialog.platform === "google") {
      const d = placeDetailsQuery.data as any;
      const phone = d.formatted_phone_number || d.international_phone_number || "";
      const website = d.website || "";
      if (phone || website) {
        setAddForm(f => ({
          ...f,
          phone: f.phone || phone,
          website: f.website || website,
        }));
      }
    }
  }, [placeDetailsQuery.data, addDialog.open, addDialog.platform]);

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

  const currentPlatform = PLATFORMS.find(p => p.id === activeTab);
  const currentResults = activeTab === "all" ? [] : results[activeTab as PlatformId];
  const currentLoading = activeTab === "all" ? isAnyLoading : loading[activeTab as PlatformId];

  const filteredResults = currentResults.filter((r: any) => {
    if (minFollowers && r.followersCount < parseInt(minFollowers)) return false;
    if (maxFollowers && r.followersCount > parseInt(maxFollowers)) return false;
    if (onlyWithPhone) {
      const hasPhone = (r.availablePhones && r.availablePhones.length > 0) ||
        (r.phone && r.phone.trim() !== "") ||
        (r.phones && r.phones.length > 0);
      if (!hasPhone) return false;
    }
    if (onlyWithContact) {
      const hasPhone = (r.availablePhones && r.availablePhones.length > 0) ||
        (r.phone && r.phone.trim() !== "") ||
        (r.phones && r.phones.length > 0);
      const hasEmail = r.email && r.email.trim() !== "";
      if (!hasPhone && !hasEmail) return false;
    }
    return true;
  });

  // عدد التكرارات في النتائج الحالية
  const duplicateCount = filteredResults.filter((r: any) => isExistingLead(r)).length;

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
          <div className="flex items-center gap-2">
            {brightDataConnectionQuery.data?.connected ? (
              <Badge variant="outline" className="text-xs gap-1.5 border-green-500/40 text-green-400 bg-green-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Bright Data نشط
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1.5 border-yellow-500/40 text-yellow-400 bg-yellow-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                وضع محدود
              </Badge>
            )}
            {totalResults > 0 && (
              <Badge className="text-sm px-3 py-1.5 gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {totalResults} نتيجة إجمالية
              </Badge>
            )}
          </div>
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
            <SelectTrigger className="w-40 h-10 text-sm shrink-0">
              <MapPin className="w-3.5 h-3.5 ml-1 text-muted-foreground shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="جميع المدن">
                <span className="font-semibold text-primary">جميع المدن السعودية</span>
              </SelectItem>
              <div className="h-px bg-border my-1" />
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
          {/* زر معالج الاستهداف الذكي */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 px-3 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => setShowTargetWizard(true)}
            title="معالج الاستهداف الذكي"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">استهداف ذكي</span>
          </Button>
        </div>
        {/* ===== شريط الفلاتر العامة ===== */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {/* فلتر عدد النتائج */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">عرض:</span>
            {[10, 25, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => setResultLimit(n)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                  resultLimit === n
                    ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-border" />
          {/* فلتر الأرقام */}
          <button
            onClick={() => { setOnlyWithPhone(!onlyWithPhone); if (!onlyWithPhone) setOnlyWithContact(false); }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
              onlyWithPhone
                ? "bg-green-500/15 border-green-500/40 text-green-400 font-semibold"
                : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="w-3 h-3" />
            {onlyWithPhone ? "✓ أرقام فقط" : "أرقام فقط"}
          </button>
          {/* فلتر هاتف أو بريد */}
          <button
            onClick={() => { setOnlyWithContact(!onlyWithContact); if (!onlyWithContact) setOnlyWithPhone(false); }}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
              onlyWithContact
                ? "bg-blue-500/15 border-blue-500/40 text-blue-400 font-semibold"
                : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="w-3 h-3" />
            {onlyWithContact ? "✓ قابل للتواصل" : "قابل للتواصل"}
          </button>
          {/* فلاتر المنصات المتقدمة */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
              showFilters
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            فلاتر المنصات
          </button>
          {totalResults > 0 && (
            <span className="text-xs text-muted-foreground mr-auto">
              يظهر: <span className="text-foreground font-medium">{Math.min(resultLimit, filteredResults.length)}</span> من {totalResults} نتيجة
            </span>
          )}
        </div>

        {/* شريط الفلاتر المختارة */}
        {(targetFilters.activityType || targetFilters.mustHavePhone || targetFilters.minRating > 0 || targetFilters.targetCount !== 20) && (
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">فلاتر نشطة:</span>
            {targetFilters.activityType && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary">
                <Building2 className="w-2.5 h-2.5" />
                {targetFilters.activityType}
              </Badge>
            )}
            {targetFilters.mustHavePhone && (
              <Badge variant="outline" className="text-xs gap-1 border-green-500/40 text-green-400">
                <Phone className="w-2.5 h-2.5" />
                رقم هاتف مطلوب
              </Badge>
            )}
            {targetFilters.minRating > 0 && (
              <Badge variant="outline" className="text-xs gap-1 border-yellow-500/40 text-yellow-400">
                <Star className="w-2.5 h-2.5" />
                تقييم ≥ {targetFilters.minRating}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs gap-1 border-blue-500/40 text-blue-400">
              <Users className="w-2.5 h-2.5" />
              الهدف: {targetFilters.targetCount} نتيجة
            </Badge>
            <button
              onClick={() => setTargetFilters({ targetCount: 20, activityType: "", minRating: 0, mustHavePhone: false, mustHaveWebsite: false, onlyOpenNow: false, minReviews: 0, priceLevel: "any", district: "", additionalKeywords: "" })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >× مسح</button>
          </div>
        )}
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
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">فلتر الأرقام</Label>
              <button
                onClick={() => setOnlyWithPhone(!onlyWithPhone)}
                className={`flex items-center gap-2 h-8 px-3 rounded-md text-xs font-medium border transition-all ${
                  onlyWithPhone
                    ? "bg-green-500/15 border-green-500/40 text-green-400"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="w-3 h-3" />
                {onlyWithPhone ? "✓ أرقام فقط" : "كل النتائج"}
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => { setMinFollowers(""); setMaxFollowers(""); setOnlyWithPhone(false); }}
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
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ActiveTabType)} className="flex-1 min-h-0 flex flex-col">
          {/* شريط التبويبات */}
          <div className="border-b border-border bg-card px-6 shrink-0 overflow-x-auto">
            <TabsList className="h-auto bg-transparent p-0 gap-0 w-max">
              {/* تبويب الكل */}
              <TabsTrigger
                value="all"
                className="relative px-4 py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground gap-2 transition-colors whitespace-nowrap"
              >
                {isAnyLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Layers className={`w-3.5 h-3.5 ${activeTab === "all" ? "text-primary" : ""}`} />
                )}
                الكل
                {totalResults > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-semibold min-w-[1.25rem] text-center">
                    {totalResults}
                  </span>
                )}
              </TabsTrigger>
              <div className="w-px h-6 bg-border self-center mx-1" />
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

          {/* ===== محتوى تبويب الكل ===== */}
          <TabsContent value="all" className="flex-1 min-h-0 overflow-y-auto m-0 p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {isAnyLoading && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">جاري البحث في جميع المنصات...</p>
                    <div className="flex gap-2 mt-1">
                      {PLATFORMS.map(p => loading[p.id] && (
                        <span key={p.id} className={`text-xs ${p.color} flex items-center gap-1`}>
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />{p.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {totalResults === 0 && !isAnyLoading ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">ابحث في جميع المنصات</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                    اضغط بحث للبحث في Google Maps وجميع منصات التواصل دفعة واحدة
                  </p>
                  <Button onClick={handleSearchAll} disabled={!keyword.trim()} className="gap-2">
                    <Layers className="w-4 h-4" />
                    بحث في الكل
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ملخص النتائج لكل منصة */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all hover:border-primary/40 ${
                          results[p.id].length > 0 ? `${p.bgColor} ${p.borderColor}` : "bg-muted/20 border-border opacity-50"
                        }`}
                      >
                        <p.icon className={`w-3.5 h-3.5 ${p.color}`} />
                        <span className="text-xs font-medium">{p.label}</span>
                        {results[p.id].length > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.badgeColor} font-bold mr-auto`}>
                            {results[p.id].length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* عرض جميع النتائج مدمجة */}
                  {PLATFORMS.flatMap(p =>
                    results[p.id].slice(0, Math.ceil(resultLimit / PLATFORMS.length)).map((r: any, i: number) => (
                      <ResultCard
                        key={`${p.id}-${i}`}
                        result={r}
                        platform={p}
                        onAdd={(res) => handleOpenAddDialog(res, p.id)}
                        isDuplicate={isExistingLead(r) || addedNames.has(r.name || r.fullName || r.username || "")}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* محتوى التبويبات */}
          {PLATFORMS.map(p => {
            // حساب filteredResults مستقل لكل منصة
            const platformResults = results[p.id];
            const platformFilteredResults = platformResults.filter((r: any) => {
              if (minFollowers && r.followersCount < parseInt(minFollowers)) return false;
              if (maxFollowers && r.followersCount > parseInt(maxFollowers)) return false;
              // Google Maps لا يُرجع الهاتف مباشرة (يحتاج getPlaceDetails منفصل)
              // لذلك نستثني google من فلتر الهاتف لتجنب إخفاء جميع النتائج
              if (onlyWithPhone && p.id !== "google") {
                const hasPhone = (r.availablePhones && r.availablePhones.length > 0) ||
                  (r.phone && r.phone.trim() !== "") ||
                  (r.phones && r.phones.length > 0) ||
                  (r.formatted_phone_number && r.formatted_phone_number.trim() !== "") ||
                  (r.international_phone_number && r.international_phone_number.trim() !== "") ||
                  (r.phoneNumber && r.phoneNumber.trim() !== "");
                if (!hasPhone) return false;
              }
              if (onlyWithContact && p.id !== "google") {
                const hasPhone = (r.availablePhones && r.availablePhones.length > 0) ||
                  (r.phone && r.phone.trim() !== "") ||
                  (r.phones && r.phones.length > 0) ||
                  (r.formatted_phone_number && r.formatted_phone_number.trim() !== "") ||
                  (r.international_phone_number && r.international_phone_number.trim() !== "") ||
                  (r.phoneNumber && r.phoneNumber.trim() !== "");
                const hasEmail = r.email && r.email.trim() !== "";
                if (!hasPhone && !hasEmail) return false;
              }
              return true;
            });
            return (
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
                    {(p.id === "instagram" || p.id === "tiktok" || p.id === "snapchat") && (
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

                {/* لوحة الذكاء الاصطناعي */}
                {activeTab === p.id && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnhanceQuery}
                      disabled={!keyword.trim() || enhanceQueryMut.isPending}
                      className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      {enhanceQueryMut.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      تحسين بالذكاء
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSmartPanel(!showSmartPanel)}
                      className={`h-8 text-xs gap-1.5 ${showSmartPanel ? "text-primary bg-primary/10" : ""}`}
                    >
                      <Brain className="w-3 h-3" />
                      أنماط متعلّمة
                      {(behaviorPatterns as any)?.sampleSize > 0 && (
                        <span className="bg-primary/20 text-primary text-xs px-1.5 rounded-full">
                          {behaviorPatterns.sampleSize}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
                {/* ===== لوحة Google Web Search ===== */}
                {p.id === "googleWeb" && activeTab === "googleWeb" && (
                  <div className="border border-orange-500/30 rounded-xl overflow-hidden bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-orange-500/5 border-b border-orange-500/20">
                      <div className="flex items-center gap-2">
                        <SearchCheck className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-semibold text-foreground">بحث Google الذكي</span>
                        <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                          نتائج حقيقية
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">

                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* نوع البحث */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">نوع البحث:</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setGoogleWebSearchType("businesses")}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              googleWebSearchType === "businesses"
                                ? "bg-orange-500/20 border-orange-500 text-orange-400 font-medium"
                                : "border-border text-muted-foreground hover:border-orange-500/50"
                            }`}
                          >
                            <Building2 className="w-3 h-3 inline ml-1" />
                            أنشطة تجارية
                          </button>
                          <button
                            onClick={() => setGoogleWebSearchType("general")}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              googleWebSearchType === "general"
                                ? "bg-orange-500/20 border-orange-500 text-orange-400 font-medium"
                                : "border-border text-muted-foreground hover:border-orange-500/50"
                            }`}
                          >
                            <Globe className="w-3 h-3 inline ml-1" />
                            بحث عام
                          </button>
                        </div>
                      </div>
                      {/* استراتيجية البحث */}
                      {showGoogleStrategy && googleWebStrategy && (
                        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-orange-400 flex items-center gap-1">
                              <BarChart2 className="w-3 h-3" />
                              استراتيجية البحث الذكية
                            </p>
                            <button onClick={() => setShowGoogleStrategy(false)} className="text-muted-foreground hover:text-foreground">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">{googleWebStrategy.marketInsight}</p>
                          {googleWebStrategy.enhancedQueries?.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">استعلامات محسّنة:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {googleWebStrategy.enhancedQueries.slice(0, 4).map((q: string, i: number) => (
                                  <button
                                    key={i}
                                    onClick={() => setKeyword(q)}
                                    className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-colors"
                                  >
                                    {q}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {googleWebStrategy.targetBusinessTypes?.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">أنواع الأنشطة المستهدفة:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {googleWebStrategy.targetBusinessTypes.slice(0, 5).map((t: string, i: number) => (
                                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            <TrendingUp className="w-3 h-3 inline ml-1 text-green-400" />
                            عملاء محتملون متوقعون: <span className="text-green-400 font-semibold">{googleWebStrategy.estimatedLeads}</span>
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-orange-400" />
                        يبحث في نتائج Google الحقيقية ويحلل الأنشطة التجارية بالذكاء الاصطناعي
                      </p>
                    </div>
                  </div>
                )}
                {/* ===== لوحة الخريطة التفاعلية - تظهر فقط في تبويب Google Maps ===== */}
                {p.id === "google" && (
                  <div className={`border border-green-500/30 rounded-xl overflow-hidden bg-card shadow-sm ${activeTab !== "google" ? "hidden" : ""}`}>
                    {/* شريط التحكم */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-green-500/5 border-b border-green-500/20">
                      <div className="flex items-center gap-2">
                        <Map className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-semibold text-foreground">خريطة البحث الجغرافي</span>
                        {searchCenter && (
                          <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                            <Crosshair className="w-3 h-3 ml-1" />
                            مركز محدد
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleUseCurrentCity}
                          disabled={geocodeAddressMut.isPending}
                          className="h-7 text-xs gap-1.5 text-green-400 hover:bg-green-500/10"
                        >
                          {geocodeAddressMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                          انتقل لـ {city}
                        </Button>
                      </div>
                    </div>

                    {/* شريط البحث بالعنوان */}
                    <div className="flex gap-2 px-4 py-3 border-b border-border bg-muted/20">
                      <Input
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleGeocodeAddress()}
                        placeholder="ابحث عن عنوان أو حي أو شارع... (مثال: حي الملقا، الرياض)"
                        className="flex-1 h-9 text-sm"
                        dir="rtl"
                      />
                      <Button
                        size="sm"
                        onClick={handleGeocodeAddress}
                        disabled={!addressInput.trim() || geocodeAddressMut.isPending}
                        className="h-9 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {geocodeAddressMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                        تحديد
                      </Button>
                    </div>

                    {/* الخريطة */}
                    <div className="relative" ref={mapContainerRef}>
                      <MapView
                        className="w-full h-[420px]"
                        initialCenter={{ lat: 24.7136, lng: 46.6753 }}
                        initialZoom={11}
                        onMapReady={handleMapReady}
                      />
                      {/* تعليمة النقر */}
                      {!searchCenter && (
                        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-2 rounded-lg pointer-events-none flex items-center gap-1.5">
                          <CircleDot className="w-3.5 h-3.5 text-green-400" />
                          انقر على أي نقطة لتحديد مركز البحث
                        </div>
                      )}
                      {/* عداد النتائج على الخريطة */}
                      {results.google.length > 0 && (
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-3 py-2 rounded-lg pointer-events-none">
                          • {results.google.length} نتيجة على الخريطة
                        </div>
                      )}

                      {/* ===== React Popup تفاصيل النشاط ===== */}
                      {mapPopup && (() => {
                        const place = mapPopup.place;
                        const details = mapPopupDetailsQuery.data as any;
                        const isLoading = mapPopupDetailsQuery.isFetching;
                        const phone = details?.formatted_phone_number || details?.international_phone_number || place.formatted_phone_number || '';
                        const website = details?.website || place.website || '';
                        const rating = place.rating ? place.rating.toFixed(1) : null;
                        const ratingCount = place.user_ratings_total || 0;
                        const isOpen = details?.opening_hours?.open_now ?? place.opening_hours?.open_now;
                        const hours = details?.opening_hours?.weekday_text || [];
                        const types = (place.types || []).slice(0, 3).map((t: string) => t.replace(/_/g, ' ')).join(' · ');
                        const photoUrl = place.photos?.[0]?.getUrl ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 180 }) : '';
                        // حساب موضع النافذة
                        const containerW = mapContainerRef.current?.offsetWidth || 600;
                        const containerH = mapContainerRef.current?.offsetHeight || 420;
                        const popupW = 300;
                        const popupH = 380;
                        let left = mapPopup.x + 12;
                        let top = mapPopup.y - popupH / 2;
                        if (left + popupW > containerW - 8) left = mapPopup.x - popupW - 12;
                        if (top < 8) top = 8;
                        if (top + popupH > containerH - 8) top = containerH - popupH - 8;
                        return (
                          <div
                            className="absolute z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                            style={{ left, top, width: popupW }}
                            dir="rtl"
                          >
                            {/* زر الإغلاق */}
                            <button
                              onClick={() => { setMapPopup(null); setMapPopupPlaceId(null); }}
                              className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors text-xs"
                            >×</button>

                            {/* صورة النشاط */}
                            {photoUrl ? (
                              <img src={photoUrl} alt={place.name} className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-16 bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-green-400" />
                              </div>
                            )}

                            <div className="p-3 space-y-2">
                              {/* الاسم وحالة الفتح */}
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-bold text-sm text-foreground leading-tight flex-1">{place.name}</h3>
                                {isOpen === true && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium whitespace-nowrap flex-shrink-0">● مفتوح</span>}
                                {isOpen === false && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium whitespace-nowrap flex-shrink-0">● مغلق</span>}
                              </div>

                              {/* نوع النشاط */}
                              {types && <p className="text-xs text-muted-foreground">{types}</p>}

                              {/* التقييم */}
                              {rating && (
                                <div className="flex items-center gap-1.5">
                                  <div className="flex">
                                    {[1,2,3,4,5].map(s => (
                                      <span key={s} className={`text-xs ${s <= Math.round(parseFloat(rating)) ? 'text-yellow-400' : 'text-muted-foreground/30'}`}>★</span>
                                    ))}
                                  </div>
                                  <span className="text-xs font-bold text-yellow-500">{rating}</span>
                                  <span className="text-xs text-muted-foreground">({ratingCount.toLocaleString()})</span>
                                </div>
                              )}

                              {/* العنوان */}
                              {place.formatted_address && (
                                <div className="flex items-start gap-1.5">
                                  <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground leading-relaxed">{place.formatted_address}</p>
                                </div>
                              )}

                              {/* التحميل */}
                              {isLoading && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  جاري جلب التفاصيل...
                                </div>
                              )}

                              {/* الهاتف */}
                              {phone && (
                                <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                  <Phone className="w-3 h-3" />
                                  {phone}
                                </a>
                              )}

                              {/* الموقع */}
                              {website && (
                                <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                                  <Globe className="w-3 h-3" />
                                  <span className="truncate max-w-[220px]">{website.replace(/^https?:\/\//, '')}</span>
                                </a>
                              )}

                              {/* ساعات العمل */}
                              {hours.length > 0 && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    ساعات العمل
                                  </summary>
                                  <div className="mt-1 space-y-0.5 pr-4">
                                    {hours.slice(0, 3).map((h: string, i: number) => (
                                      <p key={i} className="text-muted-foreground">{h}</p>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* أزرار الإجراء */}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    handleOpenAddDialog(place, "google");
                                    setMapPopup(null);
                                    setMapPopupPlaceId(null);
                                  }}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  إضافة كعميل
                                </button>
                                <a
                                  href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* شريط النطاق */}
                    <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-green-400" />
                          <span className="text-sm font-medium">نطاق البحث</span>
                        </div>
                        <span className="text-lg font-bold text-green-400">{radiusKm} كم</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        step={1}
                        value={radiusKm}
                        onChange={e => setRadiusKm(Number(e.target.value))}
                        className="w-full h-2 rounded-full accent-green-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 كم</span>
                        <span>10 كم</span>
                        <span>25 كم</span>
                        <span>50 كم</span>
                      </div>
                      <Button
                        onClick={handleSearchByRadius}
                        disabled={!keyword.trim() || !searchCenter || loading.google}
                        className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        {loading.google ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        بحث ضمن نطاق {radiusKm} كم
                        {!searchCenter && <span className="text-xs opacity-70">(حدد مركزاً أولاً)</span>}
                      </Button>
                      {searchCenter && (
                        <p className="text-xs text-center text-muted-foreground">
                          المركز: {searchCenter.lat.toFixed(4)}°ش ، {searchCenter.lng.toFixed(4)}°ش
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* لوحة الأنماط المتعلّمة */}
                {activeTab === p.id && showSmartPanel && behaviorPatterns && (
                  <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold">أنماط السلوك المتعلّمة</h3>
                      <Badge variant="outline" className="text-xs gap-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        ثقة {behaviorPatterns.confidence}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">متوسط مدة الجلسة</p>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          {Math.round(((behaviorPatterns as any)?.patterns?.avgSessionDuration || 0) / 60)} دقيقة
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">نسبة النجاح</p>
                        <p className="font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          {Math.round(((behaviorPatterns as any)?.patterns?.successRate || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                    {(behaviorPatterns as any)?.patterns?.topQueries?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">أكثر الكلمات نجاحاً:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(behaviorPatterns as any)?.patterns?.topQueries.slice(0, 6).map((w: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => setKeyword(w)}
                              className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {smartSuggestions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">استعلامات ناجحة سابقاً:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {smartSuggestions.map((s, i) => (
                            <button
                              key={i}
                              onClick={() => setKeyword(s)}
                              className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      بناءً على {behaviorPatterns.sampleSize} جلسة بحث سابقة
                    </p>
                  </div>
                )}
                {/* استعلام محسّن */}
                {activeTab === p.id && enhancedQuery && enhancedQuery !== keyword && (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center gap-3">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">استعلام محسّن بالذكاء:</p>
                      <p className="text-sm font-medium text-primary truncate">{enhancedQuery}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0 border-primary/30"
                      onClick={() => { setKeyword(enhancedQuery); setEnhancedQuery(null); }}
                    >
                      استخدام
                    </Button>
                    <button onClick={() => setEnhancedQuery(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* إنستجرام يعمل عبر Bright Data مباشرة - لا حاجة لأي ملاحظة */}

                {/* النتائج */}
                {platformFilteredResults.length > 0 ? (
                  <div className="space-y-3">
                    {(platformFilteredResults.length !== results[p.id].length || platformFilteredResults.length > resultLimit) && (
                      <p className="text-xs text-muted-foreground">
                        يُعرض <span className="text-foreground font-medium">{Math.min(resultLimit, platformFilteredResults.length)}</span> من {results[p.id].length} نتيجة
                        {platformFilteredResults.length < results[p.id].length && " (بعد الفلترة)"}
                      </p>
                    )}
                    {platformFilteredResults.slice(0, resultLimit).map((result: any, i: number) => (
                      p.id === "googleWeb" ? (
                        /* بطاقة Google Web Search مخصصة */
                        <Card key={result.id || i} className={`group transition-all duration-200 hover:border-orange-500/40 hover:shadow-sm ${
                          addedNames.has(result.name || "") ? "opacity-60 border-orange-500/30 bg-orange-500/5" : ""
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0 mt-0.5">
                                <SearchCheck className="w-4 h-4 text-orange-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-foreground text-sm leading-tight">{result.name}</h3>
                                    {result.displayUrl && (
                                      <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400/80 hover:text-blue-400 mt-0.5 font-mono flex items-center gap-1 truncate max-w-[220px]"
                                        dir="ltr"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <Link2 className="w-2.5 h-2.5 shrink-0" />
                                        {result.displayUrl}
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {result.isLeadCandidate && (
                                      <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">
                                        <CheckCircle2 className="w-2.5 h-2.5 ml-1" />
                                        عميل محتمل
                                      </Badge>
                                    )}
                                    {result.relevanceScore >= 7 && (
                                      <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                                        {result.relevanceScore}/10
                                      </Badge>
                                    )}
                                    {addedNames.has(result.name || "") && (
                                      <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/40 gap-1">
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        موجود
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2.5">
                                  {result.city && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      {result.city}
                                    </span>
                                  )}
                                  {result.businessType && result.businessType !== "غير محدد" && (
                                    <span className="flex items-center gap-1">
                                      <Building2 className="w-3 h-3 shrink-0" />
                                      {result.businessType}
                                    </span>
                                  )}
                                  {result.availablePhones?.length > 0 && (
                                    <span className="flex items-center gap-1 text-green-400 font-medium">
                                      <Phone className="w-3 h-3 shrink-0" />
                                      {result.availablePhones.length} رقم متاح
                                    </span>
                                  )}
                                </div>
                                {result.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
                                    {result.description}
                                  </p>
                                )}
                                {/* روابط السوشيال */}
                                {(result.socialLinks?.instagram || result.socialLinks?.twitter || result.socialLinks?.snapchat || result.socialLinks?.tiktok) && (
                                  <div className="flex items-center gap-2 mb-2.5">
                                    {result.socialLinks.instagram && (
                                      <a href={result.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-xs text-pink-400 hover:underline flex items-center gap-0.5">
                                        <Instagram className="w-3 h-3" /> إنستجرام
                                      </a>
                                    )}
                                    {result.socialLinks.tiktok && (
                                      <a href={result.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-0.5">
                                        <Video className="w-3 h-3" /> تيك توك
                                      </a>
                                    )}
                                    {result.socialLinks.snapchat && (
                                      <a href={result.socialLinks.snapchat} target="_blank" rel="noopener noreferrer" className="text-xs text-yellow-400 hover:underline flex items-center gap-0.5">
                                        <Camera className="w-3 h-3" /> سناب
                                      </a>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenAddDialog(result, p.id)}
                                    disabled={addedNames.has(result.name || "")}
                                    className="h-7 text-xs gap-1.5 px-3"
                                  >
                                    {addedNames.has(result.name || "") ? (
                                      <><CheckCheck className="w-3 h-3" /> موجود مسبقاً</>
                                    ) : (
                                      <><Plus className="w-3 h-3" /> إضافة كعميل</>
                                    )}
                                  </Button>
                                  {result.url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs gap-1.5 px-2.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                                      onClick={() => window.open(result.url, "_blank")}
                                      title={result.url}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      فتح الرابط
                                    </Button>
                                  )}
                                  {result.url && !result.deepSearched && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs gap-1.5 px-2 text-orange-400 hover:bg-orange-500/10"
                                      onClick={() => handleGoogleWebDeepSearch(result.url)}
                                      disabled={googleWebDeepSearchMut.isPending}
                                    >
                                      {googleWebDeepSearchMut.isPending ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Search className="w-3 h-3" />
                                      )}
                                      بحث متعمق
                                    </Button>
                                  )}
                                  {result.deepSearched && result.deepData?.phones?.length > 0 && (
                                    <span className="text-xs text-green-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {result.deepData.phones.length} رقم
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                      <ResultCard
                        key={result.place_id || result.id || result.username || i}
                        result={result}
                        platform={p}
                        onAdd={(r) => handleOpenAddDialog(r, p.id)}
                        isDuplicate={isExistingLead(result) || addedNames.has(result.name || result.fullName || result.username || "")}
                      />
                      )
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
            );
          })}
        </Tabs>
      </div>

      {/* ===== نافذة إضافة عميل الموحدة ===== */}
      <AddLeadModal
        open={addDialog.open}
        onClose={() => setAddDialog({ open: false, result: null, platform: "" })}
        onSuccess={(leadId) => {
          const key = addDialog.result?.name || addDialog.result?.username || addDialog.result?.companyName || "";
          if (key) setAddedNames(prev => { const next = new Set(prev); next.add(key); return next; });
        }}
        initialData={addDialog.result ? {
          companyName: addDialog.result.name || addDialog.result.fullName || addDialog.result.username || "",
          businessType: addDialog.result.businessCategory || addDialog.result.types?.[0] || "",
          city: addDialog.result.city || city,
          phone: addDialog.result.phone || addDialog.result.formatted_phone_number || "",
          website: addDialog.result.website || "",
          placeId: addDialog.result.place_id || undefined,
          rating: addDialog.result.rating || undefined,
          address: addDialog.result.formatted_address || addDialog.result.vicinity || "",
          notes: addDialog.result.bio || addDialog.result.description || "",
          platform: addDialog.platform || undefined,
          username: addDialog.result.username || undefined,
          bio: addDialog.result.bio || addDialog.result.description || "",
          followersCount: addDialog.result.followersCount || 0,
          instagramUrl: addDialog.platform === "instagram" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://instagram.com/${addDialog.result.username}` : undefined)) : undefined,
          tiktokUrl: addDialog.platform === "tiktok" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://tiktok.com/@${addDialog.result.username}` : undefined)) : undefined,
          snapchatUrl: addDialog.platform === "snapchat" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://snapchat.com/add/${addDialog.result.username}` : undefined)) : undefined,
          twitterUrl: addDialog.platform === "twitter" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://x.com/${addDialog.result.username}` : undefined)) : undefined,
          linkedinUrl: addDialog.platform === "linkedin" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://linkedin.com/company/${addDialog.result.username}` : undefined)) : undefined,
          facebookUrl: addDialog.platform === "facebook" ? (addDialog.result.profileUrl || addDialog.result.url || (addDialog.result.username ? `https://facebook.com/${addDialog.result.username}` : undefined)) : undefined,
          googleMapsUrl: addDialog.platform === "google" ? (addDialog.result.url || addDialog.result.googleMapsUrl || `https://www.google.com/maps/place/?q=place_id:${addDialog.result.place_id || ""}`) : "",
        } : undefined}
      />

      {/* ===== نافذة معالج الاستهداف الذكي ===== */}
      <Dialog open={showTargetWizard} onOpenChange={setShowTargetWizard}>
        <DialogContent className="max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              معالج الاستهداف الذكي
            </DialogTitle>
            <p className="text-sm text-muted-foreground">حدد معايير البحث للحصول على نتائج أكثر دقة واستهدافاً</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* سؤال 1: نوع النشاط */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                ما هو نوع النشاط التجاري المستهدف؟
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {["مطاعم", "صالونات", "عيادات", "محلات ملابس", "مقاهي", "فنادق", "مدارس", "صيدليات", "مكتبات", "مواقف سيارات", "بقالة", "أخرى"].map(type => (
                  <button
                    key={type}
                    onClick={() => setTargetFilters(f => ({ ...f, activityType: f.activityType === type ? "" : type }))}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      targetFilters.activityType === type
                        ? "bg-primary/15 border-primary text-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {targetFilters.activityType === "أخرى" && (
                <Input
                  placeholder="اكتب نوع النشاط..."
                  className="h-8 text-sm mt-1"
                  onChange={e => setTargetFilters(f => ({ ...f, activityType: e.target.value }))}
                />
              )}
            </div>

            {/* سؤال 2: العدد المطلوب */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                كم عميل محتمل تريد استخراجه؟
              </Label>
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 50, 100, 200].map(n => (
                  <button
                    key={n}
                    onClick={() => setTargetFilters(f => ({ ...f, targetCount: n }))}
                    className={`px-4 py-1.5 rounded-full border text-sm font-medium transition-all ${
                      targetFilters.targetCount === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={targetFilters.targetCount}
                  onChange={e => setTargetFilters(f => ({ ...f, targetCount: Number(e.target.value) }))}
                  className="h-8 w-20 text-sm"
                  placeholder="مخصص"
                />
              </div>
            </div>

            {/* سؤال 3: التقييم الأدنى */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                ما هو الحد الأدنى للتقييم على جوجل مابس؟
              </Label>
              <div className="flex gap-2">
                {[0, 3, 3.5, 4, 4.5].map(r => (
                  <button
                    key={r}
                    onClick={() => setTargetFilters(f => ({ ...f, minRating: r }))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      targetFilters.minRating === r
                        ? "bg-yellow-500/20 border-yellow-500 text-yellow-400"
                        : "border-border hover:border-yellow-500/50"
                    }`}
                  >
                    {r === 0 ? "أي تقييم" : `★ ${r}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* سؤال 4: متطلبات إضافية */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">متطلبات إضافية</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "mustHavePhone", label: "رقم هاتف مطلوب", icon: Phone, color: "green" },
                  { key: "mustHaveWebsite", label: "موقع إلكتروني مطلوب", icon: Globe, color: "blue" },
                  { key: "onlyOpenNow", label: "مفتوح الآن فقط", icon: Clock, color: "orange" },
                ].map(opt => {
                  const Icon = opt.icon;
                  const val = targetFilters[opt.key as keyof typeof targetFilters] as boolean;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setTargetFilters(f => ({ ...f, [opt.key]: !val }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        val
                          ? `bg-${opt.color}-500/15 border-${opt.color}-500 text-${opt.color}-400`
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* سؤال 5: الحي / المنطقة */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                الحي أو المنطقة (اختياري)
              </Label>
              <Input
                placeholder="مثل: العليا - الملز - النخيل..."
                value={targetFilters.district}
                onChange={e => setTargetFilters(f => ({ ...f, district: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>

            {/* سؤال 6: كلمات مفتاحية إضافية */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                كلمات مفتاحية إضافية (اختياري)
              </Label>
              <Input
                placeholder="مثل: توصيل - بالجملة - فاخر - خدمة سريعة..."
                value={targetFilters.additionalKeywords}
                onChange={e => setTargetFilters(f => ({ ...f, additionalKeywords: e.target.value }))}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setTargetFilters({ targetCount: 20, activityType: "", minRating: 0, mustHavePhone: false, mustHaveWebsite: false, onlyOpenNow: false, minReviews: 0, priceLevel: "any", district: "", additionalKeywords: "" })}
            >
              إعادة تعيين
            </Button>
            <Button
              onClick={() => {
                // تطبيق الفلاتر على كلمة البحث
                if (targetFilters.activityType && targetFilters.activityType !== "أخرى") {
                  setKeyword(targetFilters.activityType + (targetFilters.district ? ` في ${targetFilters.district}` : "") + (targetFilters.additionalKeywords ? ` ${targetFilters.additionalKeywords}` : ""));
                }
                setShowTargetWizard(false);
                // بدء البحث تلقائياً
                setTimeout(() => handleSearch(), 300);
              }}
              className="gap-2"
            >
              <Search className="w-4 h-4" />
              ابدأ البحث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
