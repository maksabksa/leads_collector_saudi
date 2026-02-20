import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Play, Pause, Trash2, Plus, Bot, CheckCircle2, AlertCircle,
  Info, XCircle, RefreshCw, Zap, Search, Globe, MapPin,
  TrendingUp, Users, Clock, ChevronDown, ChevronUp
} from "lucide-react";
import { COUNTRIES_DATA } from "../../../shared/countries";

type JobStatus = "pending" | "running" | "paused" | "completed" | "failed";
type LogEntry = { time: string; message: string; type: "info" | "success" | "warning" | "error" };

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: "في الانتظار", color: "bg-zinc-700 text-zinc-300", icon: <Clock className="w-3 h-3" /> },
  running:   { label: "يعمل الآن",   color: "bg-blue-900 text-blue-300 animate-pulse", icon: <Zap className="w-3 h-3" /> },
  paused:    { label: "متوقف مؤقتاً", color: "bg-yellow-900 text-yellow-300", icon: <Pause className="w-3 h-3" /> },
  completed: { label: "مكتمل",       color: "bg-green-900 text-green-300", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed:    { label: "فشل",         color: "bg-red-900 text-red-300", icon: <XCircle className="w-3 h-3" /> },
};

const LOG_ICONS: Record<string, React.ReactNode> = {
  info:    <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />,
  success: <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />,
  warning: <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />,
  error:   <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />,
};

// بيانات الدول والمدن
const COUNTRIES = COUNTRIES_DATA;

// أنواع الأنشطة الشائعة
const BUSINESS_PRESETS = [
  "ملحمة", "مطعم", "صيدلية", "بقالة", "مقهى", "صالون",
  "محل ملابس", "محل إلكترونيات", "مغسلة", "حلويات", "مخبز",
  "محل أغنام", "مزرعة دواجن", "محل عطور", "محل أثاث", "محل ذهب",
  "مدرسة تعليم قيادة", "مركز طبي", "عيادة أسنان", "صالة رياضية",
];

export default function SearchEngine() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("السعودية");
  const [selectedCity, setSelectedCity] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [jobName, setJobName] = useState("");
  const [targetCount, setTargetCount] = useState(50);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const cities = COUNTRIES.find(c => c.name === selectedCountry)?.cities ?? [];

  const { data: jobs = [], refetch } = trpc.searchJobs.list.useQuery(undefined, {
    refetchInterval: 3000, // تحديث كل 3 ثوانٍ
  });

  const createMutation = trpc.searchJobs.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء المهمة بـ ${data.keywords.length} كلمات بحث`);
      setShowCreateForm(false);
      setJobName("");
      setBusinessType("");
      refetch();
    },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const startMutation = trpc.searchJobs.start.useMutation({
    onSuccess: () => { toast.success("بدأ محرك البحث!"); refetch(); },
    onError: (err) => toast.error(`خطأ: ${err.message}`),
  });

  const pauseMutation = trpc.searchJobs.pause.useMutation({
    onSuccess: () => { toast.info("تم إيقاف المهمة مؤقتاً"); refetch(); },
  });

  const deleteMutation = trpc.searchJobs.delete.useMutation({
    onSuccess: () => { toast.success("تم حذف المهمة"); refetch(); },
  });

  const handleCreate = () => {
    if (!businessType.trim()) return toast.error("أدخل نوع النشاط");
    if (!selectedCity) return toast.error("اختر المدينة");
    const name = jobName || `${businessType} - ${selectedCity}`;
    createMutation.mutate({
      jobName: name,
      country: selectedCountry,
      city: selectedCity,
      businessType: businessType.trim(),
      targetCount,
    });
  };

  // إحصائيات إجمالية
  const totalAdded = jobs.reduce((s, j) => s + (j.totalAdded ?? 0), 0);
  const runningCount = jobs.filter(j => j.status === "running").length;
  const completedCount = jobs.filter(j => j.status === "completed").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-400" />
            محرك البحث الذكي
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            يبحث تلقائياً عن العملاء عبر Google Maps بطريقة منهجية دقيقة
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          مهمة بحث جديدة
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-900/50 rounded-lg">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-xs">مهام نشطة</p>
              <p className="text-white text-xl font-bold">{runningCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-900/50 rounded-lg">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-xs">إجمالي العملاء المُضافين</p>
              <p className="text-white text-xl font-bold">{totalAdded}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-zinc-400 text-xs">مهام مكتملة</p>
              <p className="text-white text-xl font-bold">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-zinc-900 border-zinc-700 border-dashed">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" />
              إنشاء مهمة بحث جديدة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Country + City */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">الدولة</label>
                <Select value={selectedCountry} onValueChange={(v) => { setSelectedCountry(v); setSelectedCity(""); }}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.code} value={c.name} className="text-white hover:bg-zinc-700">
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">المدينة</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="اختر المدينة..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                    {cities.map(city => (
                      <SelectItem key={city} value={city} className="text-white hover:bg-zinc-700">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Business Type */}
            <div>
              <label className="text-zinc-400 text-xs mb-1 block">نوع النشاط التجاري</label>
              <Input
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="مثال: ملحمة، مطعم، صيدلية..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BUSINESS_PRESETS.map(p => (
                  <button
                    key={p}
                    onClick={() => setBusinessType(p)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      businessType === p
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Job Name + Target */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">اسم المهمة (اختياري)</label>
                <Input
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="اسم وصفي للمهمة..."
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs mb-1 block">عدد العملاء المستهدف</label>
                <Select value={String(targetCount)} onValueChange={(v) => setTargetCount(Number(v))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {[20, 50, 100, 150, 200, 300, 400, 500].map(n => (
                      <SelectItem key={n} value={String(n)} className="text-white hover:bg-zinc-700">
                        {n} عميل
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                {createMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء المهمة
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="border-zinc-700 text-zinc-400 hover:text-white"
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">لا توجد مهام بحث بعد</p>
            <p className="text-sm mt-1">أنشئ مهمة جديدة لبدء البحث التلقائي عن العملاء</p>
          </div>
        ) : (
          jobs.map((job) => {
            const cfg = STATUS_CONFIG[job.status as JobStatus] ?? STATUS_CONFIG.pending;
            const progress = job.targetCount > 0 ? Math.min(100, (job.totalAdded / job.targetCount) * 100) : 0;
            const logs = (job.log as LogEntry[]) ?? [];
            const isExpanded = expandedJob === job.id;

            return (
              <Card key={job.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <CardContent className="p-4">
                  {/* Job Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold text-sm truncate">{job.jobName}</h3>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {job.country}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" /> {job.businessType}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {(job.status === "pending" || job.status === "paused") && (
                        <Button
                          size="sm"
                          onClick={() => startMutation.mutate({ id: job.id })}
                          disabled={startMutation.isPending}
                          className="bg-green-700 hover:bg-green-600 text-white h-7 px-3 text-xs gap-1"
                        >
                          <Play className="w-3 h-3" /> ابدأ
                        </Button>
                      )}
                      {job.status === "running" && (
                        <Button
                          size="sm"
                          onClick={() => pauseMutation.mutate({ id: job.id })}
                          className="bg-yellow-700 hover:bg-yellow-600 text-white h-7 px-3 text-xs gap-1"
                        >
                          <Pause className="w-3 h-3" /> إيقاف
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="text-zinc-400 hover:text-white h-7 px-2"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: job.id })}
                        className="text-red-500 hover:text-red-400 hover:bg-red-900/20 h-7 px-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>
                        {job.status === "running" && job.currentKeyword && (
                          <span className="text-blue-400">🔍 "{job.currentKeyword}"</span>
                        )}
                      </span>
                      <span>{job.totalAdded} / {job.targetCount} عميل</span>
                    </div>
                    <Progress value={progress} className="h-1.5 bg-zinc-800" />
                    <div className="flex gap-4 text-xs text-zinc-600">
                      <span>✅ مضاف: <span className="text-green-400">{job.totalAdded}</span></span>
                      <span>⚡ مكرر: <span className="text-yellow-400">{job.totalDuplicates}</span></span>
                      <span>🔍 فُحص: <span className="text-zinc-400">{job.totalSearched}</span></span>
                    </div>
                  </div>

                  {/* Expanded Log */}
                  {isExpanded && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <p className="text-zinc-500 text-xs mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> سجل العمليات
                      </p>
                      <div className="bg-zinc-950 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1 font-mono">
                        {logs.length === 0 ? (
                          <p className="text-zinc-600 text-xs">لا توجد سجلات بعد...</p>
                        ) : (
                          [...logs].reverse().map((entry, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              {LOG_ICONS[entry.type] ?? LOG_ICONS.info}
                              <span className="text-zinc-500 shrink-0">
                                {new Date(entry.time).toLocaleTimeString("ar-SA")}
                              </span>
                              <span className={
                                entry.type === "success" ? "text-green-400" :
                                entry.type === "warning" ? "text-yellow-400" :
                                entry.type === "error" ? "text-red-400" :
                                "text-zinc-300"
                              }>{entry.message}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Keywords used */}
                      {job.searchKeywords && (
                        <div className="mt-2">
                          <p className="text-zinc-500 text-xs mb-1">كلمات البحث المستخدمة:</p>
                          <div className="flex flex-wrap gap-1">
                            {(job.searchKeywords as string[]).map((kw, i) => (
                              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                                job.currentKeyword === kw
                                  ? "bg-blue-800 text-blue-200"
                                  : "bg-zinc-800 text-zinc-400"
                              }`}>
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-zinc-400 space-y-1">
              <p className="text-white font-medium">كيف يعمل محرك البحث؟</p>
              <p>يبحث تلقائياً في Google Maps بكلمات بحث متعددة ومتنوعة، مع تأخير عشوائي بين الطلبات (2-5 ثوانٍ) لمحاكاة السلوك البشري.</p>
              <p>يجلب تفاصيل كل نشاط (الاسم، الهاتف، الموقع الإلكتروني) ويتحقق من التكرار قبل الإضافة.</p>
              <p className="text-yellow-400">⚡ ملاحظة: بعض الأنشطة لا تُسجّل أرقامها في Google — وهذه في حد ذاتها فرصة تسويقية!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
