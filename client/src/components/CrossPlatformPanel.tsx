/**
 * CrossPlatformPanel
 * يُظهر نتائج البحث من كل المنصات مقارنةً ويتيح الدمج في lead واحدة
 *
 * المراحل:
 * 1. Platform Coverage Summary — ما الذي وُجد وما الذي لم يُوجد
 * 2. Candidate Groups — تجميع النتائج المتشابهة من منصات مختلفة
 * 3. Merge Dialog — اختيار البيانات المراد دمجها
 */
import { useState, useMemo } from "react";
import {
  Map, Instagram, Video, Camera, Twitter, Linkedin, Users, SearchCheck,
  CheckCircle2, XCircle, Layers, Plus, Merge, ChevronDown, ChevronUp,
  Phone, Globe, MapPin, ExternalLink, Star, AlertTriangle, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ===== Types =====
export interface MergedLeadData {
  companyName: string;
  businessType?: string;
  city?: string;
  phone?: string;
  website?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  snapchatUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  googleMapsUrl?: string;
  sources: string[];
}

interface PlatformResult {
  name?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  formatted_phone_number?: string;
  website?: string;
  city?: string;
  formatted_address?: string;
  followersCount?: number;
  rating?: number;
  profileUrl?: string;
  url?: string;
  businessCategory?: string;
  bio?: string;
  description?: string;
  place_id?: string;
  id?: string;
}

interface Props {
  results: Record<string, PlatformResult[]>;
  loading: Record<string, boolean>;
  keyword: string;
  city?: string;
  onAddLead: (data: MergedLeadData) => void;
}

// ===== Platform definitions =====
const PLATFORM_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string; badge: string }> = {
  google:     { label: "Google Maps",   icon: Map,        color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30",  badge: "bg-green-500/20 text-green-400 border-green-500/40" },
  googleWeb:  { label: "Google Search", icon: SearchCheck, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", badge: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  instagram:  { label: "إنستجرام",      icon: Instagram,  color: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/30",   badge: "bg-pink-500/20 text-pink-400 border-pink-500/40" },
  tiktok:     { label: "تيك توك",       icon: Video,      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", badge: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  snapchat:   { label: "سناب شات",      icon: Camera,     color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  twitter:    { label: "تويتر / X",     icon: Twitter,    color: "text-sky-400",    bg: "bg-sky-500/10",    border: "border-sky-500/30",    badge: "bg-sky-500/20 text-sky-400 border-sky-500/40" },
  linkedin:   { label: "لينكدإن",       icon: Linkedin,   color: "text-blue-500",   bg: "bg-blue-600/10",   border: "border-blue-600/30",   badge: "bg-blue-600/20 text-blue-500 border-blue-600/40" },
  facebook:   { label: "فيسبوك",        icon: Users,      color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30",   badge: "bg-blue-400/20 text-blue-400 border-blue-400/40" },
};

const PLATFORM_IDS = Object.keys(PLATFORM_META);

// ===== Helper: normalize name for comparison =====
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u0621-\u064A]/g, c => c) // keep Arabic
    .replace(/[^a-z\u0621-\u064A0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ===== Helper: similarity score between two names =====
function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Word overlap
  const wa = new Set(na.split(" ").filter(w => w.length > 2));
  const wb = new Set(nb.split(" ").filter(w => w.length > 2));
  const intersection = Array.from(wa).filter(w => wb.has(w)).length;
  const union = new Set([...Array.from(wa), ...Array.from(wb)]).size;
  return union > 0 ? intersection / union : 0;
}

// ===== Helper: get display name from result =====
function getResultName(r: PlatformResult): string {
  return r.name || r.fullName || r.username || "";
}

// ===== Helper: get URL from result for a platform =====
function getResultUrl(r: PlatformResult, platformId: string): string | undefined {
  if (r.profileUrl) return r.profileUrl;
  if (r.url) return r.url;
  if (r.username) {
    if (platformId === "instagram") return `https://instagram.com/${r.username}`;
    if (platformId === "tiktok") return `https://tiktok.com/@${r.username}`;
    if (platformId === "snapchat") return `https://snapchat.com/add/${r.username}`;
    if (platformId === "twitter") return `https://twitter.com/${r.username}`;
    if (platformId === "linkedin") return `https://linkedin.com/company/${r.username}`;
    if (platformId === "facebook") return `https://facebook.com/${r.username}`;
  }
  return undefined;
}

// ===== Helper: get phone from result =====
function getResultPhone(r: PlatformResult): string | undefined {
  return r.phone || r.formatted_phone_number || undefined;
}

// ===== Candidate Group =====
interface CandidateGroup {
  id: string;
  name: string;
  platforms: Array<{
    platformId: string;
    result: PlatformResult;
    url?: string;
  }>;
}

// ===== Group results by name similarity =====
function groupResultsByName(results: Record<string, PlatformResult[]>): CandidateGroup[] {
  const groups: CandidateGroup[] = [];

  for (const platformId of PLATFORM_IDS) {
    const platformResults = results[platformId] || [];
    for (const result of platformResults.slice(0, 5)) { // أول 5 نتائج من كل منصة
      const name = getResultName(result);
      if (!name) continue;

      // ابحث عن مجموعة موجودة تتشابه مع هذا الاسم
      let foundGroup: CandidateGroup | null = null;
      for (const group of groups) {
        if (nameSimilarity(group.name, name) >= 0.6) {
          foundGroup = group;
          break;
        }
      }

      if (foundGroup) {
        // أضف هذه المنصة للمجموعة الموجودة (إذا لم تكن موجودة)
        const alreadyHasPlatform = foundGroup.platforms.some(p => p.platformId === platformId);
        if (!alreadyHasPlatform) {
          foundGroup.platforms.push({
            platformId,
            result,
            url: getResultUrl(result, platformId),
          });
        }
      } else {
        // أنشئ مجموعة جديدة
        groups.push({
          id: `${platformId}-${name}-${groups.length}`,
          name,
          platforms: [{ platformId, result, url: getResultUrl(result, platformId) }],
        });
      }
    }
  }

  // رتّب: المجموعات متعددة المنصات أولاً
  return groups.sort((a, b) => b.platforms.length - a.platforms.length);
}

// ===== MergeDialog =====
function MergeDialog({
  group,
  city,
  onConfirm,
  onClose,
}: {
  group: CandidateGroup;
  city?: string;
  onConfirm: (data: MergedLeadData) => void;
  onClose: () => void;
}) {
  // جمع كل البيانات المتاحة من المنصات
  const allPhones = group.platforms
    .map(p => getResultPhone(p.result))
    .filter(Boolean) as string[];
  const allWebsites = group.platforms
    .map(p => p.result.website)
    .filter(Boolean) as string[];
  const allCities = group.platforms
    .map(p => p.result.city || (p.result.formatted_address ? p.result.formatted_address.split(",")[0] : null))
    .filter(Boolean) as string[];
  const allCategories = group.platforms
    .map(p => p.result.businessCategory)
    .filter(Boolean) as string[];

  const [form, setForm] = useState<MergedLeadData>({
    companyName: group.name,
    businessType: allCategories[0] || "",
    city: allCities[0] || city || "",
    phone: allPhones[0] || "",
    website: allWebsites[0] || "",
    instagramUrl: group.platforms.find(p => p.platformId === "instagram")?.url || "",
    tiktokUrl: group.platforms.find(p => p.platformId === "tiktok")?.url || "",
    snapchatUrl: group.platforms.find(p => p.platformId === "snapchat")?.url || "",
    twitterUrl: group.platforms.find(p => p.platformId === "twitter")?.url || "",
    linkedinUrl: group.platforms.find(p => p.platformId === "linkedin")?.url || "",
    facebookUrl: group.platforms.find(p => p.platformId === "facebook")?.url || "",
    googleMapsUrl: group.platforms.find(p => p.platformId === "google")?.url || "",
    sources: group.platforms.map(p => PLATFORM_META[p.platformId]?.label || p.platformId),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Merge className="w-4 h-4 text-primary" />
            دمج بيانات من {group.platforms.length} منصات
          </DialogTitle>
        </DialogHeader>

        {/* Platform badges */}
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border">
          {group.platforms.map(p => {
            const meta = PLATFORM_META[p.platformId];
            if (!meta) return null;
            return (
              <span key={p.platformId} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${meta.badge}`}>
                <meta.icon className="w-3 h-3" />
                {meta.label}
              </span>
            );
          })}
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">اسم النشاط</Label>
              <Input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">نوع النشاط</Label>
              <Input
                value={form.businessType || ""}
                onChange={e => setForm(f => ({ ...f, businessType: e.target.value }))}
                className="h-8 text-sm"
                placeholder="مطعم، صالون، متجر..."
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">المدينة</Label>
              <Input
                value={form.city || ""}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">رقم الهاتف</Label>
              <Input
                value={form.phone || ""}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="h-8 text-sm font-mono"
                dir="ltr"
                placeholder="+966..."
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">الموقع الإلكتروني</Label>
              <Input
                value={form.website || ""}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="h-8 text-sm"
                dir="ltr"
              />
            </div>
          </div>

          {/* Social URLs */}
          <div className="space-y-2 pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground font-medium">روابط المنصات</p>
            {[
              { key: "instagramUrl", label: "إنستجرام", platformId: "instagram" },
              { key: "tiktokUrl", label: "تيك توك", platformId: "tiktok" },
              { key: "snapchatUrl", label: "سناب شات", platformId: "snapchat" },
              { key: "twitterUrl", label: "تويتر", platformId: "twitter" },
              { key: "linkedinUrl", label: "لينكدإن", platformId: "linkedin" },
              { key: "facebookUrl", label: "فيسبوك", platformId: "facebook" },
              { key: "googleMapsUrl", label: "Google Maps", platformId: "google" },
            ].map(({ key, label, platformId }) => {
              const meta = PLATFORM_META[platformId];
              const val = (form as any)[key] || "";
              const hasPlatform = group.platforms.some(p => p.platformId === platformId);
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${meta.bg} ${meta.border} border`}>
                    <meta.icon className={`w-3 h-3 ${meta.color}`} />
                  </div>
                  <Input
                    value={val}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={`h-7 text-xs flex-1 ${hasPlatform ? "" : "opacity-50"}`}
                    dir="ltr"
                    placeholder={`رابط ${label}`}
                  />
                  {hasPlatform && val && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-8 text-sm">
            إلغاء
          </Button>
          <Button
            onClick={() => onConfirm(form)}
            disabled={!form.companyName.trim()}
            className="flex-1 h-8 text-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة كعميل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== CandidateGroupCard =====
function CandidateGroupCard({
  group,
  city,
  onMerge,
  onAddSingle,
}: {
  group: CandidateGroup;
  city?: string;
  onMerge: (group: CandidateGroup) => void;
  onAddSingle: (platformId: string, result: PlatformResult) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isMultiPlatform = group.platforms.length > 1;

  // جمع البيانات المتاحة
  const phone = group.platforms.map(p => getResultPhone(p.result)).find(Boolean);
  const website = group.platforms.map(p => p.result.website).find(Boolean);
  const city2 = group.platforms.map(p => p.result.city || (p.result.formatted_address?.split(",")[0])).find(Boolean);
  const followers = group.platforms.map(p => p.result.followersCount).find(f => f && f > 0);
  const rating = group.platforms.map(p => p.result.rating).find(Boolean);

  return (
    <div className={`rounded-xl border transition-all ${
      isMultiPlatform
        ? "border-primary/30 bg-primary/5"
        : "border-border bg-card/50"
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        {/* Platform badges */}
        <div className="flex flex-col gap-1 shrink-0 mt-0.5">
          {group.platforms.slice(0, 3).map(p => {
            const meta = PLATFORM_META[p.platformId];
            if (!meta) return null;
            return (
              <div key={p.platformId} className={`w-6 h-6 rounded-md ${meta.bg} ${meta.border} border flex items-center justify-center`}>
                <meta.icon className={`w-3 h-3 ${meta.color}`} />
              </div>
            );
          })}
          {group.platforms.length > 3 && (
            <div className="w-6 h-6 rounded-md bg-muted/30 border border-border flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground font-bold">+{group.platforms.length - 3}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground leading-tight truncate">{group.name}</h4>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                {city2 && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{city2}</span>}
                {phone && <span className="flex items-center gap-0.5 text-green-400"><Phone className="w-2.5 h-2.5" /><span dir="ltr">{phone}</span></span>}
                {followers && <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{followers.toLocaleString()}</span>}
                {rating && <span className="flex items-center gap-0.5 text-yellow-400"><Star className="w-2.5 h-2.5 fill-current" />{rating}</span>}
              </div>
            </div>

            {/* Multi-platform badge */}
            {isMultiPlatform && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 shrink-0">
                {group.platforms.length} منصات
              </Badge>
            )}
          </div>

          {/* Platform chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {group.platforms.map(p => {
              const meta = PLATFORM_META[p.platformId];
              if (!meta) return null;
              return (
                <span key={p.platformId} className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${meta.badge}`}>
                  <meta.icon className="w-2.5 h-2.5" />
                  {meta.label}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-2 h-2 opacity-60 hover:opacity-100" />
                    </a>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-0">
        {isMultiPlatform ? (
          <Button
            size="sm"
            className="flex-1 h-7 text-xs gap-1.5"
            onClick={() => onMerge(group)}
          >
            <Merge className="w-3 h-3" />
            دمج وإضافة كعميل
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs gap-1.5"
            onClick={() => onAddSingle(group.platforms[0].platformId, group.platforms[0].result)}
          >
            <Plus className="w-3 h-3" />
            إضافة كعميل
          </Button>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          className="h-7 w-7 flex items-center justify-center rounded-lg border border-border hover:bg-muted/30 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50 pt-3 space-y-2">
          {group.platforms.map(p => {
            const meta = PLATFORM_META[p.platformId];
            if (!meta) return null;
            const r = p.result;
            return (
              <div key={p.platformId} className={`rounded-lg p-2.5 border ${meta.bg} ${meta.border}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <meta.icon className={`w-3 h-3 ${meta.color}`} />
                  <span className={`text-[11px] font-semibold ${meta.color}`}>{meta.label}</span>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="mr-auto">
                      <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </a>
                  )}
                </div>
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  {r.username && <p>@{r.username}</p>}
                  {getResultPhone(r) && <p className="text-green-400 font-mono" dir="ltr">{getResultPhone(r)}</p>}
                  {r.website && <p className="text-blue-400 truncate" dir="ltr">{r.website}</p>}
                  {(r.city || r.formatted_address) && <p>{r.city || r.formatted_address}</p>}
                  {r.followersCount && r.followersCount > 0 && <p>{r.followersCount.toLocaleString()} متابع</p>}
                  {(r.bio || r.description) && <p className="line-clamp-2 mt-1">{r.bio || r.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Main CrossPlatformPanel =====
export function CrossPlatformPanel({ results, loading, keyword, city, onAddLead }: Props) {
  const [mergeGroup, setMergeGroup] = useState<CandidateGroup | null>(null);
  const [addedNames, setAddedNames] = useState<Set<string>>(new Set());

  // حساب Platform Coverage
  const coverage = useMemo(() => {
    return PLATFORM_IDS.map(id => ({
      id,
      meta: PLATFORM_META[id],
      count: (results[id] || []).length,
      isLoading: loading[id] || false,
    }));
  }, [results, loading]);

  const totalFound = coverage.filter(c => c.count > 0).length;
  const totalResults = coverage.reduce((s, c) => s + c.count, 0);

  // تجميع النتائج في مجموعات
  const groups = useMemo(() => groupResultsByName(results), [results]);
  const multiPlatformGroups = groups.filter(g => g.platforms.length > 1);
  const singlePlatformGroups = groups.filter(g => g.platforms.length === 1);

  const handleMerge = (group: CandidateGroup) => {
    setMergeGroup(group);
  };

  const handleAddSingle = (platformId: string, result: PlatformResult) => {
    const name = getResultName(result);
    const data: MergedLeadData = {
      companyName: name,
      businessType: result.businessCategory || "",
      city: result.city || (result.formatted_address?.split(",")[0]) || city || "",
      phone: getResultPhone(result),
      website: result.website,
      instagramUrl: platformId === "instagram" ? getResultUrl(result, platformId) : undefined,
      tiktokUrl: platformId === "tiktok" ? getResultUrl(result, platformId) : undefined,
      snapchatUrl: platformId === "snapchat" ? getResultUrl(result, platformId) : undefined,
      twitterUrl: platformId === "twitter" ? getResultUrl(result, platformId) : undefined,
      linkedinUrl: platformId === "linkedin" ? getResultUrl(result, platformId) : undefined,
      facebookUrl: platformId === "facebook" ? getResultUrl(result, platformId) : undefined,
      googleMapsUrl: platformId === "google" ? getResultUrl(result, platformId) : undefined,
      sources: [PLATFORM_META[platformId]?.label || platformId],
    };
    onAddLead(data);
    setAddedNames(prev => { const next = new Set(prev); next.add(name); return next; });
  };

  const handleMergeConfirm = (data: MergedLeadData) => {
    onAddLead(data);
    setAddedNames(prev => { const next = new Set(prev); next.add(data.companyName); return next; });
    setMergeGroup(null);
  };

  if (totalResults === 0 && !Object.values(loading).some(Boolean)) {
    return null; // لا يُعرض شيء إذا لم تكن هناك نتائج
  }

  return (
    <div className="space-y-4">
      {/* ===== Platform Coverage Summary ===== */}
      <div className="rounded-xl border border-border p-3 space-y-2" style={{ background: "oklch(0.10 0.015 240)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            تغطية المنصات
          </h3>
          <span className="text-xs text-muted-foreground">
            {totalFound}/{PLATFORM_IDS.length} منصة — {totalResults} نتيجة
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {coverage.map(c => (
            <div
              key={c.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                c.isLoading
                  ? "border-primary/30 bg-primary/5 animate-pulse"
                  : c.count > 0
                    ? `${c.meta.bg} ${c.meta.border}`
                    : "bg-muted/10 border-border/30 opacity-40"
              }`}
            >
              <c.meta.icon className={`w-3.5 h-3.5 ${c.count > 0 ? c.meta.color : "text-muted-foreground"}`} />
              <span className="text-[9px] font-medium text-center leading-tight">{c.meta.label}</span>
              {c.isLoading ? (
                <span className="text-[9px] text-primary">جاري...</span>
              ) : c.count > 0 ? (
                <span className={`text-[10px] font-bold ${c.meta.color}`}>{c.count}</span>
              ) : (
                <XCircle className="w-3 h-3 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Multi-platform matches ===== */}
      {multiPlatformGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              تطابقات عبر منصات متعددة
            </h3>
            <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-green-500/30">
              {multiPlatformGroups.length}
            </Badge>
            <span className="text-[10px] text-muted-foreground">— نفس النشاط في أكثر من منصة</span>
          </div>
          {multiPlatformGroups.map(group => (
            <CandidateGroupCard
              key={group.id}
              group={group}
              city={city}
              onMerge={handleMerge}
              onAddSingle={handleAddSingle}
            />
          ))}
        </div>
      )}

      {/* ===== Single-platform results ===== */}
      {singlePlatformGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
              نتائج منصة واحدة
            </h3>
            <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              {singlePlatformGroups.length}
            </Badge>
          </div>
          {singlePlatformGroups.slice(0, 10).map(group => (
            <CandidateGroupCard
              key={group.id}
              group={group}
              city={city}
              onMerge={handleMerge}
              onAddSingle={handleAddSingle}
            />
          ))}
          {singlePlatformGroups.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              + {singlePlatformGroups.length - 10} نتيجة أخرى
            </p>
          )}
        </div>
      )}

      {/* ===== Merge Dialog ===== */}
      {mergeGroup && (
        <MergeDialog
          group={mergeGroup}
          city={city}
          onConfirm={handleMergeConfirm}
          onClose={() => setMergeGroup(null)}
        />
      )}
    </div>
  );
}
