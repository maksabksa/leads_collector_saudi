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
  Navigation, Crosshair, CircleDot
} from "lucide-react";
import { MapView } from "@/components/Map";

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
                  onClick={() => {
                    const url = result.profileUrl ||
                      (result.dataSource?.includes("tiktok") ? `https://www.tiktok.com/@${result.username}` :
                       result.dataSource?.includes("snapchat") ? `https://www.snapchat.com/add/${result.username}` :
                       `https://instagram.com/${result.username}`);
                    window.open(url, "_blank");
                  }}
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
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);

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
  const searchTiktokMut = trpc.socialSearch.searchTikTok.useMutation();
  const searchSnapchatMut = trpc.socialSearch.searchSnapchat.useMutation();
  const searchTelegramMut = trpc.socialSearch.searchTelegram.useMutation();
  const instagramSearchMut = trpc.instagram.startSearch.useMutation();
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
      // نافذة معلومات عند النقر
      marker.addListener("click", () => {
        if (!infoWindowRef.current) {
          infoWindowRef.current = new window.google.maps.InfoWindow();
        }
        const rating = place.rating ? `★ ${place.rating} (${place.user_ratings_total || 0})` : "غير مقيّم";
        const status = place.opening_hours?.open_now === true ? '✅ مفتوح الآن' : place.opening_hours?.open_now === false ? '❌ مغلق' : '';
        infoWindowRef.current.setContent(`
          <div dir="rtl" style="font-family: 'IBM Plex Sans Arabic', Arial, sans-serif; min-width: 200px; padding: 4px;">
            <h3 style="margin:0 0 6px;font-size:14px;font-weight:700;color:#111;">${place.name}</h3>
            <p style="margin:0 0 4px;font-size:12px;color:#555;">${place.formatted_address || ''}</p>
            <p style="margin:0 0 6px;font-size:12px;color:#888;">${rating} ${status}</p>
            <button
              onclick="window.__addLeadFromMap && window.__addLeadFromMap('${place.place_id}')"
              style="background:#22c55e;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;width:100%;"
            >➕ إضافة كعميل</button>
          </div>
        `);
        infoWindowRef.current.open({ map, anchor: marker });
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
      if (e.message?.includes("Instagram Access Token") || e.message?.includes("INSTAGRAM_ACCESS_TOKEN")) {
        toast.error("إنستجرام غير مُفعَّل", {
          description: "يجب إضافة Instagram Access Token وApp ID في إعدادات AI لتفعيل البحث. لا يمكن عرض بيانات بدون مصدر حقيقي."
        });
      } else {
        toast.error("خطأ في البحث", { description: e.message });
      }
      setLoadingPlatform("instagram", false);
    }
  }, [keyword, city]);

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
      toast.error("خطأ في تيك توك", { description: e.message });
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
      toast.error("خطأ في سناب شات", { description: e.message });
      await logSession("snapchat", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("snapchat", false);
    }
  }, [keyword, city, logSession]);
  const searchTelegram = useCallback(async () => {
    if (!keyword.trim()) return;
    sessionStartRef.current = Date.now();
    trackClick();
    setLoadingPlatform("telegram", true);
    setResultsPlatform("telegram", []);
    try {
      const res = await searchTelegramMut.mutateAsync({ keyword, city });
      const telegramData = (res as any)?.results || res || [];
      setResultsPlatform("telegram", telegramData);
      if (!telegramData.length) toast.info("لا توجد نتائج في تيليجرام");
      await logSession("telegram", keyword, telegramData.length, 0, telegramData.length > 0, { city });
    } catch (e: any) {
      toast.error("خطأ في تيليجرام", { description: e.message });
      await logSession("telegram", keyword, 0, 0, false, { city });
    } finally {
      setLoadingPlatform("telegram", false);
    }
  }, [keyword, city, logSession]);

  const searchFunctions: Record<PlatformId, () => void> = {
    google: searchGoogle,
    instagram: searchInstagram,
    tiktok: searchTiktok,
    snapchat: searchSnapchat,
    telegram: searchTelegram,
  };

  const handleSearch = () => searchFunctions[activeTab]();

  // تحسين الاستعلام بالذكاء الاصطناعي
  const handleEnhanceQuery = async () => {
    if (!keyword.trim()) return;
    try {
      const res = await enhanceQueryMut.mutateAsync({ query: keyword, platform: activeTab });
      setEnhancedQuery(res.enhancedQuery);
      if (res.suggestedHashtags?.length) {
        setSuggestedHashtags(res.suggestedHashtags);
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

  const currentPlatform = PLATFORMS.find(p => p.id === activeTab)!;
  const currentResults = results[activeTab];
  const currentLoading = loading[activeTab];

  const filteredResults = currentResults.filter((r: any) => {
    if (minFollowers && r.followersCount < parseInt(minFollowers)) return false;
    if (maxFollowers && r.followersCount > parseInt(maxFollowers)) return false;
    if (onlyWithPhone) {
      const hasPhone = (r.availablePhones && r.availablePhones.length > 0) ||
        (r.phone && r.phone.trim() !== "") ||
        (r.phones && r.phones.length > 0);
      if (!hasPhone) return false;
    }
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
                      {behaviorPatterns?.sampleSize > 0 && (
                        <span className="bg-primary/20 text-primary text-xs px-1.5 rounded-full">
                          {behaviorPatterns.sampleSize}
                        </span>
                      )}
                    </Button>
                  </div>
                )}
                {/* ===== لوحة الخريطة التفاعلية - تظهر فقط في تبويب Google Maps ===== */}
                {p.id === "google" && activeTab === "google" && (
                  <div className="border border-green-500/30 rounded-xl overflow-hidden bg-card shadow-sm">
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
                    <div className="relative">
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
                          {Math.round((behaviorPatterns.patterns?.avgSessionDuration || 0) / 60)} دقيقة
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">نسبة النجاح</p>
                        <p className="font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          {Math.round((behaviorPatterns.patterns?.successRate || 0) * 100)}%
                        </p>
                      </div>
                    </div>
                    {behaviorPatterns.patterns?.topQueries?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">أكثر الكلمات نجاحاً:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {behaviorPatterns.patterns.topQueries.slice(0, 6).map((w: string, i: number) => (
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
                {/* ملاحظة إنستجرام */}
                {p.id === "instagram" && (
                  <div className="flex items-start gap-2.5 p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg text-xs text-pink-300">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>البحث في إنستجرام:</strong> يستخدم Instagram Graph API الرسمي ويحتاج{" "}
                      <code className="bg-pink-500/20 px-1 rounded text-pink-200">INSTAGRAM_ACCESS_TOKEN</code>{" "}
                      في إعدادات AI. بدونه لن تظهر أي نتائج لضمان صحة البيانات.
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
            {/* حقل رقم الهاتف - يُجلب تلقائياً من Google Places API */}
            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5">
                رقم الهاتف
                {addDialog.platform === "google" && placeDetailsQuery.isFetching && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جاري جلب البيانات من Google...
                  </span>
                )}
                {addDialog.platform === "google" && !placeDetailsQuery.isFetching && addForm.phone && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400">
                    <CheckCircle2 className="w-3 h-3" />
                    تم الجلب من Google
                  </span>
                )}
              </Label>
              {addDialog.result?.availablePhones?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="w-full text-[10px] text-green-400/70 mb-1">أرقام متاحة - اضغط للاختيار:</p>
                  {addDialog.result.availablePhones.map((p: string) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAddForm(f => ({ ...f, phone: p }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-mono ${
                        addForm.phone === p
                          ? "bg-green-500/30 border-green-500 text-green-300 font-bold"
                          : "border-green-500/30 text-green-400/80 hover:bg-green-500/20 hover:border-green-500"
                      }`}
                      dir="ltr"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                placeholder={
                  placeDetailsQuery.isFetching
                    ? "جاري الجلب من Google Maps..."
                    : addForm.phone
                    ? ""
                    : "لم يُعثر على رقم - أدخل يدوياً"
                }
                dir="ltr"
                className={addForm.phone ? "border-green-500/50 focus-visible:ring-green-500/30" : ""}
                disabled={placeDetailsQuery.isFetching}
              />
            </div>
            {/* حقل الموقع - يُجلب تلقائياً من Google Places API */}
            <div>
              <Label className="text-xs mb-1 flex items-center gap-1.5">
                الموقع الإلكتروني
                {addDialog.platform === "google" && placeDetailsQuery.isFetching && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    جاري الجلب...
                  </span>
                )}
                {addDialog.platform === "google" && !placeDetailsQuery.isFetching && addForm.website && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400">
                    <CheckCircle2 className="w-3 h-3" />
                    تم الجلب من Google
                  </span>
                )}
              </Label>
              {addDialog.result?.availableWebsites?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-1.5 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="w-full text-[10px] text-blue-400/70 mb-1">مواقع متاحة - اضغط للاختيار:</p>
                  {addDialog.result.availableWebsites.map((w: string) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setAddForm(f => ({ ...f, website: w }))}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors max-w-[200px] truncate ${
                        addForm.website === w
                          ? "bg-blue-500/30 border-blue-500 text-blue-300 font-bold"
                          : "border-blue-500/30 text-blue-400/80 hover:bg-blue-500/20 hover:border-blue-500"
                      }`}
                      dir="ltr"
                      title={w}
                    >
                      {w.replace(/^https?:\/\//, "").slice(0, 35)}
                    </button>
                  ))}
                </div>
              )}
              <Input
                value={addForm.website}
                onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))}
                placeholder={
                  placeDetailsQuery.isFetching
                    ? "جاري الجلب من Google Maps..."
                    : addForm.website
                    ? ""
                    : "لم يُعثر على موقع - أدخل يدوياً"
                }
                dir="ltr"
                className={addForm.website ? "border-blue-500/50 focus-visible:ring-blue-500/30" : ""}
                disabled={placeDetailsQuery.isFetching}
              />
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
