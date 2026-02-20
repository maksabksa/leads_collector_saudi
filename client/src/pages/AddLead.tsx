import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Save, Globe, Instagram, Twitter, Phone, MapPin, Building2, Tag } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES_DATA } from "../../../shared/countries";

const businessTypes = [
  "ملحمة", "أغنام", "ماعز", "لحوم", "ذبح وتجهيز", "توصيل لحوم",
  "مزرعة أغنام", "سوق ماشية", "أضاحي", "مشاوي ولحوم", "مطعم", "صيدلية", "بقالة", "مقهى", "صالون", "أخرى"
];

export default function AddLead() {
  const [, navigate] = useLocation();
  const { data: zones } = trpc.zones.list.useQuery();
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
    website: "",
    googleMapsUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    snapchatUrl: "",
    tiktokUrl: "",
    facebookUrl: "",
    reviewCount: 0,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.companyName.trim()) newErrors.companyName = "اسم النشاط مطلوب";
    if (form.verifiedPhone && !/^(\+966|05)\d{8,9}$/.test(form.verifiedPhone.replace(/\s/g, ""))) {
      newErrors.verifiedPhone = "رقم الهاتف يجب أن يبدأ بـ +966 أو 05";
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
    toast.success("تم إضافة العميل بنجاح");
    utils.leads.list.invalidate();
    utils.leads.stats.invalidate();
    navigate(`/leads/${result.id}`);
  };

  const set = (field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: "" }));
  };

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
            {createLead.isPending ? "جاري الحفظ..." : "حفظ وانتقل للتحليل"}
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
