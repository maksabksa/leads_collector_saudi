import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Phone, Globe, MapPin, Star, Plus, CheckCircle2,
  Loader2, ChevronRight, Building2, AlertCircle, RefreshCw,
  ExternalLink, X
} from "lucide-react";

// Saudi cities list
const SAUDI_CITIES = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام",
  "الخبر", "الظهران", "الطائف", "تبوك", "بريدة", "القصيم",
  "أبها", "خميس مشيط", "نجران", "جازان", "حائل", "ينبع",
  "الجبيل", "الأحساء", "القطيف", "الباحة", "عرعر", "سكاكا",
  "الرس", "عنيزة", "الزلفي", "شقراء", "الدوادمي", "وادي الدواسر",
];

// Common business types for quick selection
const QUICK_SEARCHES = [
  { label: "ملاحم ولحوم", query: "ملحمة لحوم" },
  { label: "مطاعم", query: "مطعم" },
  { label: "محلات ملابس", query: "محل ملابس" },
  { label: "صالونات رجالية", query: "صالون حلاقة رجالي" },
  { label: "صالونات نسائية", query: "صالون نسائي" },
  { label: "محلات عطور", query: "محل عطور" },
  { label: "مكاتب عقارية", query: "مكتب عقاري" },
  { label: "محلات إلكترونيات", query: "محل إلكترونيات" },
  { label: "مخابز وحلويات", query: "مخبز حلويات" },
  { label: "صيدليات", query: "صيدلية" },
  { label: "محلات أثاث", query: "محل أثاث" },
  { label: "مغاسل ملابس", query: "مغسلة ملابس" },
];

type PlaceResult = {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
};

type PlaceDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: { location: { lat: number; lng: number } };
  types?: string[];
  url?: string;
};

type AddedLead = { placeId: string; leadId: number };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("الرياض");
  const [cityInput, setCityInput] = useState("الرياض");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [placeDetails, setPlaceDetails] = useState<Record<string, PlaceDetails>>({});
  const [addedLeads, setAddedLeads] = useState<AddedLead[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const searchMutation = trpc.search.searchPlaces.useMutation();
  const addLeadMutation = trpc.leads.create.useMutation();
  const utils = trpc.useUtils();

  // Get place details lazily
  const fetchDetails = useCallback(async (placeId: string) => {
    if (placeDetails[placeId]) {
      setExpandedPlace(expandedPlace === placeId ? null : placeId);
      return;
    }
    setLoadingDetails(placeId);
    try {
      const details = await utils.search.getPlaceDetails.fetch({ placeId });
      setPlaceDetails(prev => ({ ...prev, [placeId]: details }));
      setExpandedPlace(placeId);
    } catch {
      toast.error("تعذّر جلب التفاصيل");
    } finally {
      setLoadingDetails(null);
    }
  }, [placeDetails, expandedPlace, utils]);

  const handleSearch = useCallback(async (overrideQuery?: string, pagetoken?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) { toast.error("أدخل نوع النشاط أولاً"); return; }
    try {
      const res = await searchMutation.mutateAsync({ query: q, city, pagetoken });
      if (pagetoken) {
        setResults(prev => [...prev, ...res.results]);
      } else {
        setResults(res.results);
        setExpandedPlace(null);
      }
      setNextPageToken(res.nextPageToken);
      setHasSearched(true);
      if (res.results.length === 0 && !pagetoken) {
        toast.info("لم يتم العثور على نتائج. جرّب كلمة بحث مختلفة.");
      }
    } catch (err: any) {
      toast.error(err?.message || "حدث خطأ أثناء البحث");
    }
  }, [query, city, searchMutation]);

  const handleAddLead = useCallback(async (place: PlaceResult) => {
    const details = placeDetails[place.place_id];
    // Extract city/district from address
    const addressParts = place.formatted_address.split("،").map(s => s.trim());
    const district = addressParts[0] || "";

    // Parse business type from types array
    const typeMap: Record<string, string> = {
      restaurant: "مطعم", food: "مطعم", store: "متجر", clothing_store: "محل ملابس",
      pharmacy: "صيدلية", beauty_salon: "صالون تجميل", hair_care: "صالون حلاقة",
      real_estate_agency: "مكتب عقاري", electronics_store: "إلكترونيات",
      bakery: "مخبز", grocery_or_supermarket: "بقالة", supermarket: "سوبرماركت",
      car_repair: "ورشة سيارات", gym: "نادي رياضي", hospital: "مستشفى",
      school: "مدرسة", mosque: "مسجد",
    };
    const businessType = place.types?.map(t => typeMap[t]).find(Boolean) || query || "نشاط تجاري";

    try {
      const result = await addLeadMutation.mutateAsync({
        companyName: place.name,
        businessType,
        city,
        district,
        verifiedPhone: details?.formatted_phone_number || details?.international_phone_number || undefined,
        website: details?.website || undefined,
        googleMapsUrl: details?.url || `https://maps.google.com/?place_id=${place.place_id}`,
        reviewCount: place.user_ratings_total,
        notes: `مضاف من البحث في Google Maps | العنوان: ${place.formatted_address}`,
      });
      setAddedLeads(prev => [...prev, { placeId: place.place_id, leadId: result.id }]);
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      toast.success(`✅ تمت إضافة "${place.name}" كـ Lead بنجاح`);
    } catch (err: any) {
      if (err?.message?.includes("duplicate") || err?.message?.includes("موجود")) {
        toast.warning(`"${place.name}" موجود مسبقاً في القاعدة`);
      } else {
        toast.error(err?.message || "فشل إضافة العميل");
      }
    }
  }, [placeDetails, city, query, addLeadMutation, utils]);

  const isAdded = (placeId: string) => addedLeads.some(a => a.placeId === placeId);

  const filteredCities = SAUDI_CITIES.filter(c => c.includes(cityInput));

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">البحث عن العملاء</h1>
              <p className="text-sm text-muted-foreground">ابحث عن أي نشاط تجاري في السعودية وأضفه مباشرة</p>
            </div>
            {addedLeads.length > 0 && (
              <Badge className="mr-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 ml-1" />
                {addedLeads.length} تمت إضافتهم
              </Badge>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            {/* City selector */}
            <div className="relative">
              <div
                className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border/60 bg-card/50 cursor-pointer min-w-[130px] hover:border-cyan-500/50 transition-colors"
                onClick={() => setShowCityDropdown(!showCityDropdown)}
              >
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-sm font-medium">{city}</span>
                <ChevronRight className={`w-3 h-3 text-muted-foreground mr-auto transition-transform ${showCityDropdown ? "rotate-90" : ""}`} />
              </div>
              {showCityDropdown && (
                <div className="absolute top-full mt-1 right-0 w-52 bg-card border border-border/60 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-border/40">
                    <Input
                      placeholder="ابحث عن مدينة..."
                      value={cityInput}
                      onChange={e => setCityInput(e.target.value)}
                      className="h-8 text-sm bg-background/50"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {filteredCities.map(c => (
                      <button
                        key={c}
                        className={`w-full text-right px-3 py-2 text-sm hover:bg-accent/50 transition-colors ${c === city ? "text-cyan-400 bg-cyan-500/10" : "text-foreground"}`}
                        onClick={() => { setCity(c); setCityInput(c); setShowCityDropdown(false); }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Query input */}
            <div className="flex-1 relative">
              <Input
                placeholder="نوع النشاط... (مثال: ملحمة، مطعم، صالون، محل ملابس)"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="h-11 bg-card/50 border-border/60 rounded-xl pl-4 pr-10 text-sm focus:border-cyan-500/60"
                dir="rtl"
              />
              {query && (
                <button
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              onClick={() => handleSearch()}
              disabled={searchMutation.isPending}
              className="h-11 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-medium shrink-0"
            >
              {searchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="mr-2 hidden sm:inline">بحث</span>
            </Button>
          </div>

          {/* Quick search chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {QUICK_SEARCHES.map(qs => (
              <button
                key={qs.query}
                onClick={() => { setQuery(qs.query); handleSearch(qs.query); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  query === qs.query
                    ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                    : "bg-card/40 border-border/40 text-muted-foreground hover:border-cyan-500/40 hover:text-foreground"
                }`}
              >
                {qs.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Loading state */}
        {searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <p className="text-muted-foreground">جاري البحث في Google Maps...</p>
          </div>
        )}

        {/* Empty state before search */}
        {!hasSearched && !searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Building2 className="w-10 h-10 text-cyan-400/60" />
            </div>
            <h2 className="text-xl font-semibold text-foreground/80">ابدأ البحث عن عملائك</h2>
            <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
              اختر المدينة، أدخل نوع النشاط التجاري، ثم اضغط بحث.<br />
              ستظهر لك النتائج من Google Maps مع إمكانية إضافة كل عميل مباشرة.
            </p>
          </div>
        )}

        {/* Results count */}
        {hasSearched && !searchMutation.isPending && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {results.length === 0 ? "لا توجد نتائج" : `${results.length} نتيجة`}
                {results.length > 0 && ` لـ "${query}" في ${city}`}
              </span>
              {results.length > 0 && (
                <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                  {addedLeads.length} / {results.length} تمت إضافتهم
                </Badge>
              )}
            </div>
            {results.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearch()}
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                إعادة البحث
              </Button>
            )}
          </div>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((place, idx) => {
              const added = isAdded(place.place_id);
              const details = placeDetails[place.place_id];
              const isExpanded = expandedPlace === place.place_id;
              const isLoadingThis = loadingDetails === place.place_id;
              const isAddingThis = addLeadMutation.isPending;

              return (
                <div
                  key={place.place_id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    added
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/50 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60"
                  }`}
                >
                  {/* Main row */}
                  <div className="flex items-start gap-3 p-4">
                    {/* Index */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      added ? "bg-emerald-500/20 text-emerald-400" : "bg-muted/50 text-muted-foreground"
                    }`}>
                      {added ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-foreground text-base leading-tight">{place.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {place.formatted_address}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {place.rating && (
                            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-amber-300 font-medium">{place.rating}</span>
                              {place.user_ratings_total && (
                                <span className="text-xs text-muted-foreground">({place.user_ratings_total})</span>
                              )}
                            </div>
                          )}
                          {place.business_status === "CLOSED_PERMANENTLY" && (
                            <Badge variant="destructive" className="text-xs">مغلق نهائياً</Badge>
                          )}
                        </div>
                      </div>

                      {/* Details row when expanded */}
                      {isExpanded && details && (
                        <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(details.formatted_phone_number || details.international_phone_number) && (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                              <Phone className="w-4 h-4 text-green-400 shrink-0" />
                              <div>
                                <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                                <p className="text-sm font-semibold text-green-300 font-mono">
                                  {details.formatted_phone_number || details.international_phone_number}
                                </p>
                              </div>
                            </div>
                          )}
                          {details.website && (
                            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">الموقع الإلكتروني</p>
                                <a
                                  href={details.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-300 hover:underline truncate block"
                                >
                                  {details.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                </a>
                              </div>
                            </div>
                          )}
                          {!details.formatted_phone_number && !details.international_phone_number && (
                            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                              <AlertCircle className="w-4 h-4 text-orange-400" />
                              <p className="text-sm text-orange-300">لا يوجد رقم هاتف مسجّل</p>
                            </div>
                          )}
                          {details.url && (
                            <a
                              href={details.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-muted/30 border border-border/40 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">فتح في Google Maps</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Details toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchDetails(place.place_id)}
                        disabled={isLoadingThis}
                        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isExpanded ? (
                          <X className="w-3 h-3" />
                        ) : (
                          <Phone className="w-3 h-3" />
                        )}
                        <span className="mr-1 hidden sm:inline">
                          {isExpanded ? "إغلاق" : "التفاصيل"}
                        </span>
                      </Button>

                      {/* Add as Lead */}
                      {added ? (
                        <div className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">تمت الإضافة</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            // If details not loaded, fetch first then add
                            if (!details) {
                              fetchDetails(place.place_id).then(() => handleAddLead(place));
                            } else {
                              handleAddLead(place);
                            }
                          }}
                          disabled={isAddingThis}
                          className="h-8 px-3 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium"
                        >
                          {isAddingThis ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          <span className="mr-1 hidden sm:inline">أضف كـ Lead</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {nextPageToken && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleSearch(query, nextPageToken)}
                  disabled={searchMutation.isPending}
                  className="border-border/60 hover:border-cyan-500/40 rounded-xl px-8"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  ) : null}
                  تحميل المزيد من النتائج
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Zero results */}
        {hasSearched && results.length === 0 && !searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/70">لا توجد نتائج</h3>
            <p className="text-sm text-muted-foreground">
              جرّب كلمة بحث مختلفة أو مدينة أخرى
            </p>
            <Button
              variant="outline"
              onClick={() => setHasSearched(false)}
              className="border-border/60 rounded-xl"
            >
              بحث جديد
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
