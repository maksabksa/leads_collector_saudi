/**
 * مركز البحث الاحترافي - نسخة 3.0
 * Layout ثنائي الأعمدة: نتائج البحث + ماكينة المقارنة والدمج
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Search, MapPin, Instagram, Loader2, Plus, Star, Phone, Globe,
  Building2, ExternalLink, Bot, Video, Camera,
  Users, Zap, CheckCircle2, RefreshCw, X, Map, Target,
  Layers, SlidersHorizontal, CheckCheck, AlertTriangle,
  RotateCcw, Brain, TrendingUp, Sparkles, Clock,
  Navigation, Crosshair, CircleDot, UserPlus,
  SearchCheck, Link2, BarChart2, Shield, Twitter, Linkedin, Mail,
  Merge, GitMerge, Eye, ArrowRight, ChevronRight
} from "lucide-react";
import { MapView } from "@/components/Map";
import { CrossPlatformPanel, type MergedLeadData } from "@/components/CrossPlatformPanel";
import { useSearch } from "@/contexts/SearchContext";
import { SalesFiltersPanel } from "@/components/SalesFiltersPanel";
import { SearchSettingsPanel } from "@/components/SearchSettingsPanel";

// ===== ثوابت =====
const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الطائف", "تبوك", "أبها", "القصيم",
  "حائل", "نجران", "جازان", "الجوف", "عرعر",
  "الأحساء", "الجبيل", "ينبع",
  "بريدة", "عنيزة", "خميس مشيط", "الباحة",
  "سكاكا", "القطيف", "الخرج", "الطائف الهدا"
];

const PLATFORMS = [
  { id: "google",     label: "Google Maps",   icon: Map,        color: "text-green-400",  bgColor: "bg-green-500/10",  borderColor: "border-green-500/30",  badgeColor: "bg-green-500/20 text-green-400 border-green-500/40" },
  { id: "googleWeb",  label: "Google Search", icon: SearchCheck, color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", badgeColor: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  { id: "instagram",  label: "إنستجرام",      icon: Instagram,  color: "text-pink-400",   bgColor: "bg-pink-500/10",   borderColor: "border-pink-500/30",   badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/40" },
  { id: "tiktok",     label: "تيك توك",       icon: Video,      color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  { id: "snapchat",   label: "سناب شات",      icon: Camera,     color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", badgeColor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  { id: "twitter",    label: "تويتر / X",     icon: Twitter,    color: "text-sky-400",    bgColor: "bg-sky-500/10",    borderColor: "border-sky-500/30",    badgeColor: "bg-sky-500/20 text-sky-400 border-sky-500/40" },
  { id: "linkedin",   label: "لينكدإن",       icon: Linkedin,   color: "text-blue-500",   bgColor: "bg-blue-600/10",   borderColor: "border-blue-600/30",   badgeColor: "bg-blue-600/20 text-blue-500 border-blue-600/40" },
  { id: "facebook",   label: "فيسبوك",        icon: Users,      color: "text-blue-400",   bgColor: "bg-blue-400/10",   borderColor: "border-blue-400/30",   badgeColor: "bg-blue-400/20 text-blue-400 border-blue-400/40" },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

// ===== مكون بطاقة نتيجة =====
function ResultCard({ result, onAdd, isDuplicate, platform }: {
  result: any; onAdd: (r: any) => void; isDuplicate?: boolean; platform: typeof PLATFORMS[number];
}) {
  return (
    <Card className={`group transition-all duration-200 ${isDuplicate ? "opacity-60 border-orange-500/30 bg-orange-500/5" : "hover:border-primary/40 hover:shadow-sm"}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${platform.bgColor} ${platform.borderColor} border flex items-center justify-center shrink-0 mt-0.5`}>
            <platform.icon className={`w-3.5 h-3.5 ${platform.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight truncate">
                  {result.name || result.fullName || result.username || "غير معروف"}
                </h3>
                {result.username && (result.name || result.fullName) && (
                  <p className="text-xs text-muted-foreground">@{result.username}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {result.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
                    <Star className="w-2.5 h-2.5 fill-current" />{result.rating}
                  </span>
                )}
                {isDuplicate && (
                  <Badge variant="outline" className="text-xs bg-orange-500/20 text-orange-400 border-orange-400/40 gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />موجود
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground mb-2">
              {(result.formatted_address || result.city) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[160px]">{result.formatted_address || result.city}</span>
                </span>
              )}
              {(result.phone || result.formatted_phone_number) && (
                <span className="flex items-center gap-1 text-green-400 font-medium">
                  <Phone className="w-2.5 h-2.5 shrink-0" />
                  <span dir="ltr">{result.phone || result.formatted_phone_number}</span>
                </span>
              )}
              {result.followersCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-2.5 h-2.5 shrink-0" />
                  {result.followersCount.toLocaleString()}
                </span>
              )}
            </div>
            {(result.bio || result.description) && (
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{result.bio || result.description}</p>
            )}
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={() => onAdd(result)} disabled={isDuplicate} className="h-6 text-xs gap-1 px-2.5">
                {isDuplicate ? <><CheckCheck className="w-3 h-3" />موجود</> : <><Plus className="w-3 h-3" />إضافة</>}
              </Button>
              {(result.url || result.profileUrl) && (
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 px-2" onClick={() => window.open(result.url || result.profileUrl, "_blank")}>
                  <ExternalLink className="w-2.5 h-2.5" />فتح
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== المكون الرئيسي =====
export default function SearchHub() {
  const {
    startSearch, updateResults, updateLoading, updateError,
    getFilteredResults, session, isAnyLoading: ctxAnyLoading,
    totalResults: ctxTotalResults, totalFiltered,
    targetCount, autoSave, autoMerge, selectedPlatforms,
    activeSalesFiltersCount,
  } = useSearch();

  const [keyword, setKeyword] = useState(session?.keyword || "");
  const [city, setCity] = useState(session?.city || "الرياض");
  const [activeTab, setActiveTab] = useState<PlatformId>("google");
  const [showFilters, setShowFilters] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);
  const [resultLimit, setResultLimit] = useState(25);

  // البحث الجغرافي
  const [showMap, setShowMap] = useState(true);
  const [radiusKm, setRadiusKm] = useState(5);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const resultMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const searchByRadiusMut = trpc.search.searchByRadius.useMutation();
  const geocodeAddressMut = trpc.search.geocodeAddress.useMutation();

  // نتائج البحث
  const [results, setResults] = useState<Record<PlatformId, any[]>>({
    google: [], googleWeb: [], instagram: [], tiktok: [], snapchat: [], twitter: [], linkedin: [], facebook: []
  });
  const [loading, setLoading] = useState<Record<PlatformId, boolean>>({
    google: false, googleWeb: false, instagram: false, tiktok: false, snapchat: false, twitter: false, linkedin: false, facebook: false
  });

  // إضافة عميل
  const [addDialog, setAddDialog] = useState<{ open: boolean; result: any | null; platform: PlatformId | "" }>({ open: false, result: null, platform: "" });
  const [addForm, setAddForm] = useState({ companyName: "", businessType: "", city: "", phone: "", website: "", notes: "" });
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  // Popup الخريطة
  const [mapPopup, setMapPopup] = useState<{ place: any; x: number; y: number } | null>(null);
  const [mapPopupPlaceId, setMapPopupPlaceId] = useState<string | null>(null);
  const mapPopupDetailsQuery = trpc.search.getPlaceDetails.useQuery(
    mapPopupPlaceId ? { placeId: mapPopupPlaceId } : skipToken,
    { enabled: !!mapPopupPlaceId, staleTime: 5 * 60 * 1000 }
  );

  // API
  const searchPlaces = trpc.search.searchPlaces.useMutation();
  const searchInstagramMut = trpc.socialSearch.searchInstagram.useMutation();
  const searchTiktokMut = trpc.socialSearch.searchTikTok.useMutation();
  const searchSnapchatMut = trpc.socialSearch.searchSnapchat.useMutation();
  const searchTwitterMut = trpc.socialSearch.searchTwitter.useMutation();
  const searchLinkedInMut = trpc.socialSearch.searchLinkedIn.useMutation();
  const searchFacebookMut = trpc.socialSearch.searchFacebook.useMutation();
  const googleWebSearchMut = trpc.googleSearch.searchWeb.useMutation();
  const suggestHashtagsMut = trpc.socialSearch.suggestSocialHashtags.useMutation();
  const brightDataConnectionQuery = trpc.brightDataSearch.checkConnection.useQuery();
  const createLead = trpc.leads.create.useMutation();
  const addInstagramAsLead = trpc.instagram.addAsLead.useMutation();
  const [currentPlaceId, setCurrentPlaceId] = useState<string | null>(null);
  const placeDetailsQuery = trpc.search.getPlaceDetails.useQuery(
    currentPlaceId ? { placeId: currentPlaceId } : skipToken,
    { enabled: !!currentPlaceId, staleTime: 5 * 60 * 1000 }
  );
  const enhanceQueryMut = trpc.searchBehavior.enhanceQuery.useMutation();
  const logSearchSessionMut = trpc.searchBehavior.logSearchSession.useMutation();
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([]);
  const [googleWebSearchType, setGoogleWebSearchType] = useState<"businesses" | "general">("businesses");

  // منع التكرار
  const existingLeadsQuery = trpc.leads.getNames.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const existingNames = new Set((existingLeadsQuery.data || []).map((l: any) => (l.name || "").trim().toLowerCase()));
  const isExistingLead = (result: any): boolean => {
    const name = (result.name || result.fullName || "").trim().toLowerCase();
    return name.length > 0 && existingNames.has(name);
  };

  // ===== دوال الخريطة =====
  const updateMapCircle = useCallback((center: { lat: number; lng: number }, radiusMeters: number, map: google.maps.Map) => {
    if (circleRef.current) { circleRef.current.setMap(null); circleRef.current = null; }
    circleRef.current = new window.google.maps.Circle({ map, center, radius: radiusMeters, fillColor: "#22c55e", fillOpacity: 0.12, strokeColor: "#22c55e", strokeOpacity: 0.6, strokeWeight: 2 });
    if (markerRef.current) markerRef.current.map = null;
    markerRef.current = new window.google.maps.marker.AdvancedMarkerElement({ map, position: center, title: `مركز البحث` });
    const bounds = circleRef.current.getBounds();
    if (bounds) map.fitBounds(bounds);
  }, []);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const center = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setSearchCenter(center);
      updateMapCircle(center, radiusKm * 1000, map);
    });
    (window as any).__addLeadFromMap = (placeId: string) => {
      const place = results.google.find((r: any) => r.place_id === placeId);
      if (place) { handleOpenAddDialog(place, "google"); if (infoWindowRef.current) infoWindowRef.current.close(); }
    };
  }, [radiusKm, updateMapCircle]);

  useEffect(() => {
    if (mapRef.current && searchCenter) updateMapCircle(searchCenter, radiusKm * 1000, mapRef.current);
  }, [radiusKm, searchCenter, updateMapCircle]);

  useEffect(() => {
    if (!city || !mapRef.current) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: city + ", Saudi Arabia" }, (res: any, status: any) => {
      if (status === "OK" && res?.[0]) {
        const loc = res[0].geometry.location;
        const center = { lat: loc.lat(), lng: loc.lng() };
        setSearchCenter(center);
        if (mapRef.current) { mapRef.current.setCenter(center); mapRef.current.setZoom(12); updateMapCircle(center, radiusKm * 1000, mapRef.current); }
      }
    });
  }, [city]);

  // عرض نتائج Google Maps كـ pins
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    resultMarkersRef.current.forEach(m => { m.map = null; });
    resultMarkersRef.current = [];
    results.google.forEach((place: any) => {
      if (!place.geometry?.location) return;
      const pos = { lat: place.geometry.location.lat, lng: place.geometry.location.lng };
      const pinEl = document.createElement("div");
      pinEl.style.cssText = `width:28px;height:28px;border-radius:50% 50% 50% 0;background:#22c55e;border:2px solid #fff;transform:rotate(-45deg);cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;`;
      const inner = document.createElement("div");
      inner.style.cssText = "width:8px;height:8px;border-radius:50%;background:#fff;transform:rotate(45deg);";
      pinEl.appendChild(inner);
      const marker = new window.google.maps.marker.AdvancedMarkerElement({ map, position: pos, title: place.name, content: pinEl });
      marker.addListener("click", (e: any) => {
        map.panTo(pos);
        if (map.getZoom()! < 16) map.setZoom(16);
        const container = mapContainerRef.current;
        let px = 200, py = 200;
        if (container && e?.domEvent) { const rect = container.getBoundingClientRect(); px = (e.domEvent as MouseEvent).clientX - rect.left; py = (e.domEvent as MouseEvent).clientY - rect.top; }
        setMapPopup({ place, x: px, y: py });
        setMapPopupPlaceId(place.place_id || null);
      });
      resultMarkersRef.current.push(marker);
    });
  }, [results.google]);

  useEffect(() => {
    (window as any).__addLeadFromMap = (placeId: string) => {
      const place = results.google.find((r: any) => r.place_id === placeId);
      if (place) { handleOpenAddDialog(place, "google"); if (infoWindowRef.current) infoWindowRef.current.close(); }
    };
  }, [results.google]);

  useEffect(() => {
    if (placeDetailsQuery.data && addDialog.open && addDialog.platform === "google") {
      const d = placeDetailsQuery.data as any;
      const phone = d.formatted_phone_number || d.international_phone_number || "";
      const website = d.website || "";
      if (phone || website) setAddForm(f => ({ ...f, phone: f.phone || phone, website: f.website || website }));
    }
  }, [placeDetailsQuery.data, addDialog.open, addDialog.platform]);

  // ===== دوال البحث =====
  const setLoadingPlatform = (platform: PlatformId, val: boolean) => setLoading(prev => ({ ...prev, [platform]: val }));
  const setResultsPlatform = (platform: PlatformId, data: any[]) => setResults(prev => ({ ...prev, [platform]: data }));

  const handleBrightDataError = (e: any, platform: string) => {
    const msg = e?.message || "";
    if (msg.includes("رصيد Bright Data غير كاف")) {
      toast.error("رصيد Bright Data غير كافٍ", { description: "اذهب إلى brightdata.com واشحن حسابك", duration: 8000 });
    } else if (msg.includes("حجبت الوصول")) {
      toast.warning(`المنصة حجبت الوصول مؤقتًا`, { description: "حاول مرة أخرى بعد دقيقة" });
    } else {
      toast.error(`خطأ في ${platform}`, { description: msg });
    }
  };

  const searchGoogle = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("google", true);
    setResultsPlatform("google", []);
    updateLoading("google", true);
    updateResults("google", []);
    try {
      const res = await searchPlaces.mutateAsync({ query: keyword, city, country: "السعودية" });
      const data = res.results || [];
      setResultsPlatform("google", data);
      updateResults("google", data);
      if (!data.length) toast.info("لا توجد نتائج في Google Maps");
      else toast.success(`${data.length} نتيجة من Google Maps`);
    } catch (e: any) { toast.error("خطأ في Google Maps", { description: e.message }); updateError("google", e.message); }
    finally { setLoadingPlatform("google", false); updateLoading("google", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchGoogleWeb = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("googleWeb", true); updateLoading("googleWeb", true);
    setResultsPlatform("googleWeb", []); updateResults("googleWeb", []);
    try {
      const res = await googleWebSearchMut.mutateAsync({ keyword, city, searchType: googleWebSearchType, page: 1 });
      const data = res.results || [];
      setResultsPlatform("googleWeb", data); updateResults("googleWeb", data);
      if (!data.length) toast.info("لا توجد نتائج في Google Search");
      else toast.success(`${data.length} نتيجة من Google Search`);
    } catch (e: any) { toast.error("خطأ في Google Search", { description: e.message }); updateError("googleWeb", e.message); }
    finally { setLoadingPlatform("googleWeb", false); updateLoading("googleWeb", false); }
  }, [keyword, city, googleWebSearchType, updateLoading, updateResults, updateError]);

  const searchInstagram = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("instagram", true); updateLoading("instagram", true);
    setResultsPlatform("instagram", []); updateResults("instagram", []);
    try {
      const res = await searchInstagramMut.mutateAsync({ keyword, city });
      const data = (res as any)?.results || res || [];
      setResultsPlatform("instagram", data); updateResults("instagram", data);
      if (!data.length) toast.info("لا توجد نتائج في إنستجرام");
      else toast.success(`${data.length} نتيجة من إنستجرام`);
    } catch (e: any) { handleBrightDataError(e, "إنستجرام"); updateError("instagram", e.message); }
    finally { setLoadingPlatform("instagram", false); updateLoading("instagram", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchTiktok = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("tiktok", true); updateLoading("tiktok", true);
    setResultsPlatform("tiktok", []); updateResults("tiktok", []);
    try {
      const res = await searchTiktokMut.mutateAsync({ keyword, city });
      const data = (res as any)?.results || res || [];
      setResultsPlatform("tiktok", data); updateResults("tiktok", data);
      if (!data.length) toast.info("لا توجد نتائج في تيك توك");
    } catch (e: any) { handleBrightDataError(e, "تيك توك"); updateError("tiktok", e.message); }
    finally { setLoadingPlatform("tiktok", false); updateLoading("tiktok", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchSnapchat = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("snapchat", true); updateLoading("snapchat", true);
    setResultsPlatform("snapchat", []); updateResults("snapchat", []);
    try {
      const res = await searchSnapchatMut.mutateAsync({ keyword, city });
      const data = (res as any)?.results || res || [];
      setResultsPlatform("snapchat", data); updateResults("snapchat", data);
      if (!data.length) toast.info("لا توجد نتائج في سناب شات");
    } catch (e: any) { handleBrightDataError(e, "سناب شات"); updateError("snapchat", e.message); }
    finally { setLoadingPlatform("snapchat", false); updateLoading("snapchat", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchTwitter = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("twitter", true); updateLoading("twitter", true);
    setResultsPlatform("twitter", []); updateResults("twitter", []);
    try {
      const res = await searchTwitterMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("twitter", data); updateResults("twitter", data);
      if (!data.length) toast.info("لا توجد نتائج في تويتر");
      else toast.success(`${data.length} نتيجة من تويتر`);
    } catch (e: any) { toast.error("خطأ في تويتر", { description: e.message }); updateError("twitter", e.message); }
    finally { setLoadingPlatform("twitter", false); updateLoading("twitter", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchLinkedIn = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("linkedin", true); updateLoading("linkedin", true);
    setResultsPlatform("linkedin", []); updateResults("linkedin", []);
    try {
      const res = await searchLinkedInMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("linkedin", data); updateResults("linkedin", data);
      if (!data.length) toast.info("لا توجد نتائج في لينكدإن");
      else toast.success(`${data.length} نتيجة من لينكدإن`);
    } catch (e: any) { toast.error("خطأ في لينكدإن", { description: e.message }); updateError("linkedin", e.message); }
    finally { setLoadingPlatform("linkedin", false); updateLoading("linkedin", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const searchFacebook = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoadingPlatform("facebook", true); updateLoading("facebook", true);
    setResultsPlatform("facebook", []); updateResults("facebook", []);
    try {
      const res = await searchFacebookMut.mutateAsync({ keyword, city });
      const data = res.results || [];
      setResultsPlatform("facebook", data); updateResults("facebook", data);
      if (!data.length) toast.info("لا توجد نتائج في فيسبوك");
      else toast.success(`${data.length} نتيجة من فيسبوك`);
    } catch (e: any) { toast.error("خطأ في فيسبوك", { description: e.message }); updateError("facebook", e.message); }
    finally { setLoadingPlatform("facebook", false); updateLoading("facebook", false); }
  }, [keyword, city, updateLoading, updateResults, updateError]);

  const handleSearchAll = useCallback(() => {
    if (!keyword.trim()) { toast.error("أدخل كلمة البحث أولاً"); return; }
    // بدء جلسة بحث جديدة في Context
    startSearch(keyword, city);
    // تشغيل المنصات المختارة فقط
    const platformFns: Record<string, () => void> = {
      google: searchGoogle, googleWeb: searchGoogleWeb, instagram: searchInstagram,
      tiktok: searchTiktok, snapchat: searchSnapchat, twitter: searchTwitter,
      linkedin: searchLinkedIn, facebook: searchFacebook,
    };
    const toRun = selectedPlatforms.length > 0 ? selectedPlatforms : Object.keys(platformFns);
    toRun.forEach(p => platformFns[p]?.());
    toast.info(`بدأ البحث في ${toRun.length} منصة`, { description: "يعمل في الخلفية — يمكنك التنقل بحرية" });
  }, [keyword, city, startSearch, selectedPlatforms, searchGoogle, searchGoogleWeb, searchInstagram, searchTiktok, searchSnapchat, searchTwitter, searchLinkedIn, searchFacebook]);

  const handleSearch = () => {
    const searchFns: Record<PlatformId, () => void> = {
      google: searchGoogle, googleWeb: searchGoogleWeb, instagram: searchInstagram,
      tiktok: searchTiktok, snapchat: searchSnapchat, twitter: searchTwitter,
      linkedin: searchLinkedIn, facebook: searchFacebook,
    };
    searchFns[activeTab]();
  };

  const handleOpenAddDialog = (result: any, platform: PlatformId) => {
    setAddDialog({ open: true, result, platform });
    setAddForm({ companyName: result.name || result.fullName || result.username || "", businessType: result.businessCategory || result.types?.[0] || "", city: result.city || city, phone: result.phone || result.formatted_phone_number || "", website: result.website || "", notes: result.bio || result.description || "" });
    if (platform === "google" && result.place_id) setCurrentPlaceId(result.place_id);
    else setCurrentPlaceId(null);
  };

  const handleAddLead = async () => {
    if (!addDialog.result || !addForm.companyName) return;
    try {
      if (addDialog.platform === "instagram" && addDialog.result.id) {
        await addInstagramAsLead.mutateAsync({ accountId: addDialog.result.id, companyName: addForm.companyName, businessType: addForm.businessType || "غير محدد", city: addForm.city, instagramUrl: `https://instagram.com/${addDialog.result.username}`, phone: addForm.phone || undefined, website: addForm.website || undefined, notes: addForm.notes || undefined });
      } else {
        await createLead.mutateAsync({ companyName: addForm.companyName, businessType: addForm.businessType || "غير محدد", city: addForm.city || "غير محدد", verifiedPhone: addForm.phone || undefined, website: addForm.website || undefined, notes: addForm.notes || undefined });
      }
      setAddedNames(prev => { const next = new Set(prev); next.add(addForm.companyName); return next; });
      toast.success("تمت الإضافة كعميل محتمل", { description: addForm.companyName });
      setAddDialog({ open: false, result: null, platform: "" });
    } catch (e: any) { toast.error("خطأ في الإضافة", { description: e.message }); }
  };

  const handleMergedAdd = async (data: MergedLeadData) => {
    try {
      await createLead.mutateAsync({
        companyName: data.companyName, businessType: data.businessType || "غير محدد", city: data.city || city || "غير محدد",
        verifiedPhone: data.phone || undefined, website: data.website || undefined,
        instagramUrl: data.instagramUrl || undefined, tiktokUrl: data.tiktokUrl || undefined,
        snapchatUrl: data.snapchatUrl || undefined, twitterUrl: data.twitterUrl || undefined,
        linkedinUrl: data.linkedinUrl || undefined, facebookUrl: data.facebookUrl || undefined,
        googleMapsUrl: data.googleMapsUrl || undefined,
        notes: data.sources?.length > 1 ? `تم الدمج من: ${data.sources.join(", ")}` : undefined,
      });
      setAddedNames(prev => { const next = new Set(prev); next.add(data.companyName); return next; });
      toast.success("تمت الإضافة كعميل محتمل", { description: data.sources?.length > 1 ? `${data.companyName} — مدمج من ${data.sources.length} منصات` : data.companyName });
    } catch (e: any) { toast.error("خطأ في الإضافة", { description: e.message }); }
  };

  const handleGeocodeAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    try {
      const res = await geocodeAddressMut.mutateAsync({ address: addressInput });
      const center = { lat: res.lat, lng: res.lng };
      setSearchCenter(center);
      if (mapRef.current) { mapRef.current.setCenter(center); mapRef.current.setZoom(13); updateMapCircle(center, radiusKm * 1000, mapRef.current); }
      toast.success(`تم تحديد الموقع: ${res.formattedAddress}`);
    } catch (e: any) { toast.error("خطأ في تحديد الموقع", { description: e.message }); }
  }, [addressInput, radiusKm, geocodeAddressMut, updateMapCircle]);

  // إحصائيات
  const totalResults = Object.values(results).reduce((s, r) => s + r.length, 0);
  const isAnyLoading = Object.values(loading).some(Boolean);
  const currentPlatform = PLATFORMS.find(p => p.id === activeTab)!;
  const currentResults = results[activeTab];
  // الفلترة: Context filters أولاً ثم onlyWithPhone المحلي
  const ctxFiltered = getFilteredResults(activeTab);
  const filteredResults = (ctxFiltered.length > 0 || session ? ctxFiltered : currentResults).filter((r: any) => {
    if (onlyWithPhone) {
      const hasPhone = r.phone || r.formatted_phone_number || r.phones?.length > 0;
      if (!hasPhone) return false;
    }
    return true;
  }).slice(0, resultLimit);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">

      {/* ===== رأس الصفحة ===== */}
      <div className="border-b border-border bg-card px-5 py-3.5 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Target className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">مركز البحث والاستهداف</h1>
              <p className="text-xs text-muted-foreground">بحث في 8 منصات + مقارنة + دمج ذكي</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* مؤشر البحث في الخلفية */}
            {ctxAnyLoading && (
              <Badge variant="outline" className="text-xs gap-1.5 border-blue-500/40 text-blue-400 bg-blue-500/10 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />بحث نشط
              </Badge>
            )}
            {brightDataConnectionQuery.data?.connected ? (
              <Badge variant="outline" className="text-xs gap-1.5 border-green-500/40 text-green-400 bg-green-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Bright Data نشط
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1.5 border-yellow-500/40 text-yellow-400 bg-yellow-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />وضع محدود
              </Badge>
            )}
            {totalResults > 0 && (
              <Badge className="text-xs px-2.5 py-1 gap-1.5">
                <Zap className="w-3 h-3" />
                {activeSalesFiltersCount > 0 ? `${totalFiltered} / ${ctxTotalResults}` : ctxTotalResults || totalResults} نتيجة
              </Badge>
            )}
            {/* مكونات الإعدادات */}
            <SalesFiltersPanel />
            <SearchSettingsPanel />
          </div>
        </div>

        {/* شريط البحث الرئيسي */}
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
            <SelectContent className="max-h-72">
              <SelectItem value="جميع المدن"><span className="font-semibold text-primary">جميع المدن</span></SelectItem>
              <div className="h-px bg-border my-1" />
              {SAUDI_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={!keyword.trim() || loading[activeTab]} className="h-10 gap-2 px-4 shrink-0">
            {loading[activeTab] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            بحث
          </Button>
          <Button
            variant="outline"
            onClick={handleSearchAll}
            disabled={!keyword.trim() || isAnyLoading}
            className="h-10 gap-2 px-4 shrink-0 border-primary/40 text-primary hover:bg-primary/10"
            title="بحث في كل المنصات الثماني دفعة واحدة"
          >
            {isAnyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
            بحث في الكل
          </Button>
        </div>

        {/* شريط المنصات السريع */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {PLATFORMS.map(p => {
            const count = results[p.id].length;
            const isLoading = loading[p.id];
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  activeTab === p.id
                    ? `${p.bgColor} ${p.borderColor} ${p.color}`
                    : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {isLoading ? <Loader2 className={`w-3 h-3 animate-spin ${p.color}`} /> : <p.icon className={`w-3 h-3 ${activeTab === p.id ? p.color : ""}`} />}
                {p.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === p.id ? p.badgeColor : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="mr-auto flex items-center gap-1.5">
            <button
              onClick={() => setOnlyWithPhone(!onlyWithPhone)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all ${onlyWithPhone ? "bg-green-500/15 border-green-500/40 text-green-400" : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"}`}
            >
              <Phone className="w-3 h-3" />{onlyWithPhone ? "✓ أرقام فقط" : "أرقام فقط"}
            </button>
          </div>
        </div>

        {/* هاشتاقات مقترحة */}
        {suggestedHashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground">مقترح:</span>
            {suggestedHashtags.map((h, i) => (
              <button key={i} onClick={() => { setKeyword(h.replace(/^#/, "")); setSuggestedHashtags([]); }} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                #{h.replace(/^#/, "")}
              </button>
            ))}
            <button onClick={() => setSuggestedHashtags([])} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* ===== المحتوى الرئيسي — عمودان ===== */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ===== العمود الأيسر: نتائج البحث ===== */}
        <div className="flex-1 min-w-0 flex flex-col border-l border-border overflow-hidden">
          {/* شريط أدوات المنصة الحالية */}
          <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${currentPlatform.bgColor} border-b ${currentPlatform.borderColor} shrink-0`}>
            <div className="flex items-center gap-2">
              <currentPlatform.icon className={`w-4 h-4 ${currentPlatform.color}`} />
              <span className="text-sm font-semibold text-foreground">{currentPlatform.label}</span>
              {loading[activeTab] ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />جاري البحث...
                </span>
              ) : currentResults.length > 0 ? (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${currentPlatform.badgeColor}`}>
                  {currentResults.length} نتيجة
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              {(activeTab === "instagram" || activeTab === "tiktok" || activeTab === "snapchat") && (
                <Button variant="ghost" size="sm" onClick={async () => {
                  if (!keyword.trim()) return;
                  try {
                    const res = await suggestHashtagsMut.mutateAsync({ keyword, platform: activeTab });
                    setSuggestedHashtags((res as any)?.hashtags || res || []);
                  } catch { toast.error("خطأ في اقتراح الهاشتاقات"); }
                }} disabled={!keyword.trim() || suggestHashtagsMut.isPending} className="h-7 text-xs gap-1">
                  {suggestHashtagsMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                  هاشتاقات AI
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={async () => {
                if (!keyword.trim()) return;
                try {
                  const res = await enhanceQueryMut.mutateAsync({ query: keyword, platform: activeTab });
                  if (res.suggestions?.length) setSuggestedHashtags(res.suggestions);
                  toast.success("تم تحسين الاستعلام", { description: res.enhanced || "" });
                } catch { toast.error("خطأ في تحسين الاستعلام"); }
              }} disabled={!keyword.trim() || enhanceQueryMut.isPending} className="h-7 text-xs gap-1">
                {enhanceQueryMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                تحسين AI
              </Button>
              {currentResults.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setResultsPlatform(activeTab, [])}>
                  <RotateCcw className="w-3 h-3" />مسح
                </Button>
              )}
            </div>
          </div>

          {/* الخريطة التفاعلية (Google Maps فقط) */}
          {activeTab === "google" && (
            <div className="border-b border-border shrink-0">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Map className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-medium">خريطة البحث الجغرافي</span>
                  {searchCenter && <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30 px-1.5"><Crosshair className="w-2.5 h-2.5 inline ml-0.5" />مركز محدد</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Input value={addressInput} onChange={e => setAddressInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleGeocodeAddress()} placeholder="ابحث عن عنوان أو حي..." className="h-7 w-52 text-xs" dir="rtl" />
                  <Button size="sm" onClick={handleGeocodeAddress} disabled={!addressInput.trim() || geocodeAddressMut.isPending} className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700">
                    {geocodeAddressMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}تحديد
                  </Button>
                  <button onClick={() => setShowMap(!showMap)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border">
                    {showMap ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </div>
              {showMap && (
                <div className="relative" ref={mapContainerRef}>
                  <MapView className="w-full h-[260px]" initialCenter={{ lat: 24.7136, lng: 46.6753 }} initialZoom={11} onMapReady={handleMapReady} />
                  {!searchCenter && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none flex items-center gap-1.5">
                      <CircleDot className="w-3 h-3 text-green-400" />انقر لتحديد مركز البحث
                    </div>
                  )}
                  {results.google.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none">
                      {results.google.length} نتيجة على الخريطة
                    </div>
                  )}
                  {/* Popup الخريطة */}
                  {mapPopup && (() => {
                    const place = mapPopup.place;
                    const details = mapPopupDetailsQuery.data as any;
                    const phone = details?.formatted_phone_number || place.formatted_phone_number || '';
                    const website = details?.website || place.website || '';
                    const rating = place.rating ? place.rating.toFixed(1) : null;
                    const containerW = mapContainerRef.current?.offsetWidth || 600;
                    const containerH = mapContainerRef.current?.offsetHeight || 260;
                    const popupW = 260;
                    const popupH = 300;
                    let left = mapPopup.x + 10;
                    let top = mapPopup.y - popupH / 2;
                    if (left + popupW > containerW - 8) left = mapPopup.x - popupW - 10;
                    if (top < 8) top = 8;
                    if (top + popupH > containerH - 8) top = containerH - popupH - 8;
                    return (
                      <div className="absolute z-50 bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{ left, top, width: popupW }} dir="rtl">
                        <button onClick={() => { setMapPopup(null); setMapPopupPlaceId(null); }} className="absolute top-2 left-2 z-10 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 text-xs">×</button>
                        <div className="w-full h-14 bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="p-3 space-y-1.5">
                          <h3 className="font-bold text-sm text-foreground leading-tight">{place.name}</h3>
                          {rating && <div className="flex items-center gap-1 text-xs"><span className="text-yellow-400">★</span><span className="font-bold text-yellow-500">{rating}</span><span className="text-muted-foreground">({(place.user_ratings_total || 0).toLocaleString()})</span></div>}
                          {place.formatted_address && <p className="text-xs text-muted-foreground leading-relaxed">{place.formatted_address}</p>}
                          {mapPopupDetailsQuery.isFetching && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />جاري جلب التفاصيل...</div>}
                          {phone && <a href={`tel:${phone}`} className="flex items-center gap-1 text-xs text-blue-400"><Phone className="w-3 h-3" />{phone}</a>}
                          {website && <a href={website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 truncate"><Globe className="w-3 h-3 shrink-0" />{website.replace(/^https?:\/\//, '').slice(0, 30)}</a>}
                          <Button size="sm" className="w-full h-7 text-xs gap-1 mt-1" onClick={() => { handleOpenAddDialog(place, "google"); setMapPopup(null); setMapPopupPlaceId(null); }}>
                            <Plus className="w-3 h-3" />إضافة كعميل
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* قائمة النتائج */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {loading[activeTab] ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className={`w-8 h-8 animate-spin ${currentPlatform.color}`} />
                <p className="text-sm text-muted-foreground">جاري البحث في {currentPlatform.label}...</p>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className={`w-14 h-14 rounded-2xl ${currentPlatform.bgColor} ${currentPlatform.borderColor} border flex items-center justify-center`}>
                  <currentPlatform.icon className={`w-7 h-7 ${currentPlatform.color}`} />
                </div>
                {keyword ? (
                  <>
                    <h3 className="font-semibold text-foreground">ابدأ البحث في {currentPlatform.label}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">اضغط "بحث" للعثور على الأنشطة التجارية المرتبطة بـ "{keyword}"</p>
                    <Button onClick={handleSearch} className="gap-2 mt-1">
                      <Search className="w-4 h-4" />بحث في {currentPlatform.label}
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-foreground">أدخل كلمة البحث</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">اكتب نوع النشاط التجاري في شريط البحث أعلاه</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* شريط إضافة الكل */}
                {filteredResults.length > 1 && (
                  <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border border-border mb-3">
                    <span className="text-xs text-muted-foreground">{filteredResults.length} نتيجة — {filteredResults.filter(r => !isExistingLead(r)).length} جديدة</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={async () => {
                      const newOnes = filteredResults.filter(r => !isExistingLead(r));
                      if (!newOnes.length) { toast.info("جميع النتائج موجودة مسبقاً"); return; }
                      let added = 0;
                      for (const r of newOnes.slice(0, 20)) {
                        try {
                          await createLead.mutateAsync({ companyName: r.name || r.fullName || r.username || "غير معروف", businessType: r.businessCategory || "غير محدد", city: r.city || city || "غير محدد", verifiedPhone: r.phone || r.formatted_phone_number || undefined, website: r.website || undefined });
                          added++;
                        } catch { /* تجاهل */ }
                      }
                      toast.success(`تمت إضافة ${added} عميل دفعة واحدة`);
                      existingLeadsQuery.refetch();
                    }}>
                      <UserPlus className="w-3 h-3" />إضافة الكل ({Math.min(filteredResults.filter(r => !isExistingLead(r)).length, 20)})
                    </Button>
                  </div>
                )}
                {filteredResults.map((result: any, i: number) => (
                  <ResultCard
                    key={result.place_id || result.id || result.username || i}
                    result={result}
                    onAdd={r => handleOpenAddDialog(r, activeTab)}
                    isDuplicate={isExistingLead(result)}
                    platform={currentPlatform}
                  />
                ))}
                {currentResults.length > resultLimit && (
                  <div className="text-center pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setResultLimit(l => l + 25)} className="text-xs gap-1">
                      عرض المزيد ({currentResults.length - resultLimit} متبقية)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== العمود الأيمن: ماكينة المقارنة والدمج ===== */}
        <div className="w-[420px] shrink-0 flex flex-col border-r border-border bg-card/50 overflow-hidden">
          {/* رأس اللوحة */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-gradient-to-l from-primary/5 to-transparent shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <GitMerge className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-foreground">ماكينة المقارنة والدمج</h2>
              <p className="text-xs text-muted-foreground">يجمع نفس النشاط من منصات مختلفة ويدمجها في lead واحد</p>
            </div>
            {isAnyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />}
          </div>

          {/* شريط حالة البحث في المنصات */}
          <div className="grid grid-cols-4 gap-1 p-3 border-b border-border shrink-0">
            {PLATFORMS.map(p => {
              const count = results[p.id].length;
              const isLoading = loading[p.id];
              return (
                <div key={p.id} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border text-center transition-all ${count > 0 ? `${p.bgColor} ${p.borderColor}` : "bg-muted/20 border-border"}`}>
                  {isLoading ? <Loader2 className={`w-3.5 h-3.5 animate-spin ${p.color}`} /> : <p.icon className={`w-3.5 h-3.5 ${count > 0 ? p.color : "text-muted-foreground/40"}`} />}
                  <span className={`text-[9px] font-medium leading-tight ${count > 0 ? p.color : "text-muted-foreground/40"}`}>{p.label.split(" ")[0]}</span>
                  <span className={`text-[10px] font-bold ${count > 0 ? p.color : "text-muted-foreground/30"}`}>{isLoading ? "..." : count}</span>
                </div>
              );
            })}
          </div>

          {/* CrossPlatformPanel */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {totalResults === 0 && !isAnyLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <GitMerge className="w-8 h-8 text-primary/60" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">ابدأ البحث لتفعيل الدمج</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
                    ابحث في منصة واحدة أو أكثر، وستظهر هنا المجموعات المتطابقة تلقائياً مع إمكانية دمجها في عميل واحد
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <Button onClick={handleSearchAll} disabled={!keyword.trim()} className="gap-2 w-full">
                    <Layers className="w-4 h-4" />بحث في الكل
                  </Button>
                  <p className="text-[10px] text-muted-foreground">يبحث في 8 منصات دفعة واحدة</p>
                </div>
                {/* شرح الخطوات */}
                <div className="w-full border border-border rounded-xl p-3 text-right space-y-2 mt-2">
                  <p className="text-xs font-semibold text-foreground mb-2">كيف يعمل الدمج الذكي؟</p>
                  {[
                    { step: "1", label: "ابحث في كل المنصات", icon: Search },
                    { step: "2", label: "يكتشف النظام التطابقات", icon: Eye },
                    { step: "3", label: "اضغط دمج لتوحيد البيانات", icon: Merge },
                    { step: "4", label: "يُحفظ كعميل محتمل واحد", icon: CheckCircle2 },
                  ].map(({ step, label, icon: Icon }) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{step}</span>
                      </div>
                      <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3">
                <CrossPlatformPanel
                  results={results}
                  loading={loading}
                  keyword={keyword}
                  city={city}
                  onAddLead={handleMergedAdd}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== نافذة إضافة عميل ===== */}
      <Dialog open={addDialog.open} onOpenChange={open => !open && setAddDialog({ open: false, result: null, platform: "" })}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              إضافة كعميل محتمل
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">اسم النشاط *</Label>
              <Input value={addForm.companyName} onChange={e => setAddForm(f => ({ ...f, companyName: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">نوع النشاط</Label>
                <Input value={addForm.businessType} onChange={e => setAddForm(f => ({ ...f, businessType: e.target.value }))} className="h-9 text-sm" placeholder="مطعم، صالون..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">المدينة</Label>
                <Input value={addForm.city} onChange={e => setAddForm(f => ({ ...f, city: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</Label>
              <Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-sm font-mono" dir="ltr" placeholder="+966..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">الموقع الإلكتروني</Label>
              <Input value={addForm.website} onChange={e => setAddForm(f => ({ ...f, website: e.target.value }))} className="h-9 text-sm" dir="ltr" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialog({ open: false, result: null, platform: "" })}>إلغاء</Button>
            <Button onClick={handleAddLead} disabled={!addForm.companyName || createLead.isPending || addInstagramAsLead.isPending} className="gap-2">
              {(createLead.isPending || addInstagramAsLead.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
