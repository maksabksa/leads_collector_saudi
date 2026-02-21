import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Save, Globe, Instagram, Twitter, Phone, MapPin, Building2, Tag, MessageCircle, CheckCircle2, XCircle, HelpCircle, TrendingUp, Flag, Calendar, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES_DATA } from "../../../shared/countries";

const FALLBACK_BUSINESS_TYPES = [
  "ملحمة", "أغنام", "ماعز", "لحوم", "ذبح وتجهيز", "توصيل لحوم",
  "مزرعة أغنام", "سوق ماشية", "أضاحي", "مشاوي ولحوم", "مطعم", "صيدلية", "بقالة", "مقهى", "صالون", "أخرى"
];

export default function AddLead() {
  const [, navigate] = useLocation();
  const { data: zones } = trpc.zones.list.useQuery();
  const { data: businessTypesData } = trpc.dataSettings.getByCategory.useQuery({ category: "businessType" });
  const businessTypes = businessTypesData?.length ? businessTypesData.map(b => b.label) : FALLBACK_BUSINESS_TYPES;
  const createLead = trpc.leads.create.useMutation();
  const utils = trpc.useUtils();

  const [selectedCountry, setSelectedCountry] = useState("السعودية");
  const availableCities = COUNTRIES_DATA.find(c => c.name === selectedCountry)?.cities ?? [];

  const [form, setForm] = useState({
    companyName: "",
    businessType: "ملحمة",
    country: "السعودية",
    city: "الرياض",
    district: "",
    zoneId: undefined as number | undefined,
    zoneName: "",
    verifiedPhone: "",
    hasWhatsapp: "unknown" as "yes" | "no" | "unknown",
    website: "",
    googleMapsUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    snapchatUrl: "",
    tiktokUrl: "",
    facebookUrl: "",
    reviewCount: 0,
    socialSince: "",
    notes: "",
    stage: "new" as "new" | "contacted" | "interested" | "price_offer" | "meeting" | "won" | "lost",
    priority: "medium" as "high" | "medium" | "low",
    nextStep: "",
    nextFollowup: undefined as number | undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const STAGE_OPTIONS = [
    { value: "new", label: "جديد", color: "oklch(0.65 0.05 240)" },
    { value: "contacted", label: "تم التواصل", color: "oklch(0.65 0.15 200)" },
    { value: "interested", label: "مهتم", color: "oklch(0.65 0.18 145)" },
    { value: "price_offer", label: "عرض سعر", color: "oklch(0.65 0.18 60)" },
    { value: "meeting", label: "اجتماع", color: "oklch(0.65 0.18 280)" },
    { value: "won", label: "عميل فعلي", color: "oklch(0.65 0.18 145)" },
    { value: "lost", label: "خسرناه", color: "oklch(0.55 0.18 25)" },
  ] as const;

  const PRIORITY_OPTIONS = [
    { value: "high", label: "عالية", color: "oklch(0.65 0.18 25)" },
    { value: "medium", label: "متوسطة", color: "oklch(0.65 0.18 60)" },
    { value: "low", label: "منخفضة", color: "oklch(0.65 0.05 240)" },
  ] as const;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.companyName.trim()) newErrors.companyName = "اسم النشاط مطلوب";
    if (form.verifiedPhone && !/^(\+966|05)\d{8,9}$/.test(form.verifiedPhone.replace(/\s/g, ""))) {
      newErrors.verifiedPhone = "رقم الهاتف يجب أن يبدأ بـ +966 أو 05";
    }
    if (form.stage === "interested" && !form.nextFollowup) {
      newErrors.nextFollowup = "عند تحديد العميل كمهتم يجب تحديد موعد متابعة";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const selectedZone = zones?.find(z => z.id === form.zoneId);
    const result = await createLead.mutateAsync({
      ...form,
      zoneName: selectedZone?.name || form.zoneName || undefined,
    });
    toast.success("تم إضافة العميل — جاري التحليل التلقائي في الخلفية...");
    utils.leads.list.invalidate();
    utils.leads.stats.invalidate();
    navigate(`/leads/${result.id}`);
  };

  const set = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

  const whatsappOptions = [
    { value: "yes", label: "لديه واتساب", icon: CheckCircle2, color: "oklch(0.65 0.18 145)", bg: "oklch(0.65 0.18 145 / 0.15)", border: "oklch(0.65 0.18 145 / 0.5)" },
    { value: "no", label: "ليس لديه", icon: XCircle, color: "oklch(0.65 0.18 25)", bg: "oklch(0.65 0.18 25 / 0.15)", border: "oklch(0.65 0.18 25 / 0.5)" },
    { value: "unknown", label: "غير محدد", icon: HelpCircle, color: "oklch(0.65 0.05 240)", bg: "oklch(0.65 0.05 240 / 0.1)", border: "oklch(0.65 0.05 240 / 0.3)" },
  ] as const;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/leads")} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">إضافة Lead جديد</h1>
          <p className="text-muted-foreground text-sm mt-0.5">أدخل بيانات النشاط التجاري</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" style={{ color: "var(--brand-cyan)" }} />
            المعلومات الأساسية
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1.5 block">اسم النشاط التجاري *</label>
              <input value={form.companyName} onChange={e => set("companyName", e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm border bg-background text-foreground focus:outline-none focus:border-primary transition-colors ${errors.companyName ? "border-red-500" : "border-border"}`}
                placeholder="مثال: ملحمة الأصيل" />
              {errors.companyName && <p className="text-xs mt-1" style={{ color: "var(--brand-red)" }}>{errors.companyName}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">نوع النشاط *</label>
              <select value={form.businessType} onChange={e => set("businessType", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary">
                {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">الدولة</label>
              <select value={selectedCountry} onChange={e => {
                setSelectedCountry(e.target.value);
                set("country", e.target.value);
                const firstCity = COUNTRIES_DATA.find(c => c.name === e.target.value)?.cities[0] ?? "";
                set("city", firstCity);
              }}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary">
                {COUNTRIES_DATA.map(c => <option key={c.code} value={c.name}>{c.flag} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">المدينة *</label>
              <select value={form.city} onChange={e => set("city", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary">
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">الحي / المنطقة الفرعية</label>
              <input value={form.district} onChange={e => set("district", e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                placeholder="مثال: حي النزهة" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">منطقة الشبكة</label>
              <select value={form.zoneId ?? ""} onChange={e => set("zoneId", e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary">
                <option value="">اختر المنطقة</option>
                {zones?.map(z => <option key={z.id} value={z.id}>{z.name} ({z.region})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Phone className="w-4 h-4" style={{ color: "var(--brand-gold)" }} />
            معلومات الاتصال
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">رقم الهاتف المُتحقق</label>
              <input value={form.verifiedPhone} onChange={e => set("verifiedPhone", e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl text-sm border bg-background text-foreground focus:outline-none focus:border-primary transition-colors ${errors.verifiedPhone ? "border-red-500" : "border-border"}`}
                placeholder="+966501234567" dir="ltr" />
              {errors.verifiedPhone && <p className="text-xs mt-1" style={{ color: "var(--brand-red)" }}>{errors.verifiedPhone}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">عدد تقييمات Google</label>
              <input type="number" value={form.reviewCount} onChange={e => set("reviewCount", Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                min={0} />
            </div>
          </div>

          {/* حالة واتساب - يدوي */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.18 145)" }} />
              حالة واتساب (يدوي)
            </label>
            <div className="flex gap-2">
              {whatsappOptions.map(opt => {
                const Icon = opt.icon;
                const isSelected = form.hasWhatsapp === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("hasWhatsapp", opt.value)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border"
                    style={{
                      background: isSelected ? opt.bg : "transparent",
                      borderColor: isSelected ? opt.border : "var(--border)",
                      color: isSelected ? opt.color : "var(--muted-foreground)",
                      boxShadow: isSelected ? `0 0 0 1px ${opt.border}` : "none",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {form.hasWhatsapp === "yes" && (
              <p className="text-xs mt-1.5" style={{ color: "oklch(0.65 0.18 145)" }}>
                ✓ سيُضاف لقائمة الإرسال عبر واتساب تلقائياً
              </p>
            )}
          </div>
        </div>

        {/* Digital presence */}
        <div className="rounded-2xl p-5 border border-border space-y-4" style={{ background: "oklch(0.12 0.015 240)" }}>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4" style={{ color: "var(--brand-cyan)" }} />
            الحضور الرقمي
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { field: "website", label: "الموقع الإلكتروني", placeholder: "https://example.com", icon: Globe },
              { field: "googleMapsUrl", label: "رابط Google Maps", placeholder: "https://maps.google.com/...", icon: MapPin },
              { field: "instagramUrl", label: "إنستغرام", placeholder: "https://instagram.com/...", icon: Instagram },
              { field: "twitterUrl", label: "تويتر / X", placeholder: "https://twitter.com/...", icon: Twitter },
              { field: "snapchatUrl", label: "سناب شات", placeholder: "https://snapchat.com/...", icon: Globe },
              { field: "tiktokUrl", label: "تيك توك", placeholder: "https://tiktok.com/...", icon: Globe },
            ].map(({ field, label, placeholder, icon: Icon }) => (
              <div key={field}>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </label>
                <input value={(form as any)[field]} onChange={e => set(field, e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
                  placeholder={placeholder} dir="ltr" />
              </div>
            ))}
          </div>
          {/* تاريخ الظهور على السوشيال */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              تاريخ الظهور على السوشيال ميديا (اختياري)
            </label>
            <input
              value={form.socialSince}
              onChange={e => set("socialSince", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
              placeholder="مثال: 2019 أو 2020-05"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">السنة أو الشهر-السنة التي بدأ فيها النشاط على السوشيال</p>
          </div>
        </div>

        {/* التصنيف الإلزامي */}
        <div className="rounded-2xl p-5 border-2 space-y-4" style={{ background: "oklch(0.12 0.015 240)", borderColor: "oklch(0.65 0.18 60 / 0.4)" }}>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.65 0.18 60)" }} />
            التصنيف والمتابعة
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.65 0.18 60 / 0.15)", color: "oklch(0.65 0.18 60)" }}>مهم</span>
          </h3>
          {/* مرحلة العميل */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              مرحلة العميل
            </label>
            <div className="flex flex-wrap gap-2">
              {STAGE_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set("stage", opt.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
                  style={{
                    background: form.stage === opt.value ? `${opt.color} / 0.15` : "transparent",
                    borderColor: form.stage === opt.value ? opt.color : "var(--border)",
                    color: form.stage === opt.value ? opt.color : "var(--muted-foreground)",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* الأولوية */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              الأولوية
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => set("priority", opt.value)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all border"
                  style={{
                    background: form.priority === opt.value ? `${opt.color} / 0.15` : "transparent",
                    borderColor: form.priority === opt.value ? opt.color : "var(--border)",
                    color: form.priority === opt.value ? opt.color : "var(--muted-foreground)",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* الخطوة التالية */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" />
              الخطوة التالية (اختياري)
            </label>
            <input value={form.nextStep} onChange={e => set("nextStep", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary"
              placeholder="مثال: إرسال عرض سعر غداً" />
          </div>
          {/* موعد المتابعة */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              موعد المتابعة {form.stage === "interested" && <span style={{ color: "oklch(0.65 0.18 25)" }}>*</span>}
            </label>
            <input type="datetime-local"
              value={form.nextFollowup ? new Date(form.nextFollowup).toISOString().slice(0, 16) : ""}
              onChange={e => set("nextFollowup", e.target.value ? new Date(e.target.value).getTime() : undefined)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm border bg-background text-foreground focus:outline-none focus:border-primary ${errors.nextFollowup ? "border-red-500" : "border-border"}`}
              dir="ltr" />
            {errors.nextFollowup && <p className="text-xs mt-1" style={{ color: "var(--brand-red)" }}>{errors.nextFollowup}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-2xl p-5 border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
          <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            ملاحظات إضافية
          </label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground focus:outline-none focus:border-primary resize-none"
            rows={3} placeholder="أي ملاحظات إضافية عن هذا النشاط..." />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={createLead.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.15 200))" }}>
            <Save className="w-4 h-4" />
            {createLead.isPending ? "جاري الحفظ..." : "حفظ + تحليل تلقائي"}
          </button>
          <button type="button" onClick={() => navigate("/leads")}
            className="px-6 py-3 rounded-xl text-sm text-muted-foreground border border-border hover:bg-white/5 transition-all">
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
