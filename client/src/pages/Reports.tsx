import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  FileText, MessageSquare, Users, TrendingUp, Calendar, Send,
  RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Inbox,
  BarChart2, Zap, Star, CheckCircle, Clock, Bot, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const COLORS = ["#25D366", "#128C7E", "#34B7F1", "#9B59B6", "#E67E22", "#E74C3C"];

// ===== بطاقة إحصاء =====
function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string; value: string | number;
  icon: React.ElementType; color: string; trend?: { value: number };
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{typeof value === 'number' ? value.toLocaleString("ar-SA") : value}</div>
      <div className="text-sm text-[#8696a0]">{title}</div>
    </div>
  );
}

// ===== تقرير واتساب =====
function WhatsAppReport() {
  const [period, setPeriod] = useState("7");
  const { data, isLoading, refetch } = trpc.waSettings.getDailyStats.useQuery(
    { days: parseInt(period) },
    { refetchOnWindowFocus: false }
  );

  const chartData = useMemo(() => {
    if (!data?.dailyBreakdown) return [];
    return data.dailyBreakdown.map((d: { day: string; sent: number; received: number }) => ({
      date: new Date(d.day).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
      مُرسَل: d.sent || 0,
      مُستقبَل: d.received || 0,
    }));
  }, [data]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <RefreshCw className="w-6 h-6 text-[#25D366] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">تقرير رسائل واتساب</h2>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-xs border-white/10 text-white" style={{ background: "#202c33" }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="14">آخر 14 يوم</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void refetch()} className="h-8 gap-1.5 text-xs border-white/10 text-white hover:bg-white/5">
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي المُرسَل" value={data?.totals?.sent || 0} icon={Send} color="#25D366" />
        <StatCard title="إجمالي المُستقبَل" value={data?.totals?.received || 0} icon={Inbox} color="#34B7F1" />
        <StatCard title="إجمالي المحادثات" value={data?.totals?.chats || 0} icon={MessageSquare} color="#9B59B6" />
        <StatCard title="عدد الحسابات" value={data?.accounts?.length || 0} icon={Users} color="#E67E22" />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-medium mb-4 text-sm">الرسائل اليومية</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#8696a0", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8696a0", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e2a32", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="مُرسَل" fill="#25D366" radius={[4, 4, 0, 0]} />
              <Bar dataKey="مُستقبَل" fill="#34B7F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.accounts && data.accounts.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-medium mb-4 text-sm">أداء الحسابات</h3>
          <div className="space-y-3">
            {data.accounts.map((acc: {
              accountId: string; label: string; phoneNumber: string;
              sent: number; received: number; replyRate: number; isConnected: boolean;
            }, i: number) => (
              <div key={acc.accountId} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>
                  {acc.label?.charAt(0) || "؟"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{acc.label || acc.accountId}</p>
                  <p className="text-xs text-[#8696a0]">{acc.phoneNumber}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#25D366]">{acc.sent}</p>
                  <p className="text-xs text-[#8696a0]">مُرسَل</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#34B7F1]">{acc.received}</p>
                  <p className="text-xs text-[#8696a0]">مُستقبَل</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-yellow-400">{acc.replyRate}%</p>
                  <p className="text-xs text-[#8696a0]">معدل الرد</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${acc.isConnected ? "bg-green-400" : "bg-red-400"}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== تقرير العملاء =====
function LeadsReport() {
  const { data: stats, isLoading } = trpc.leads.stats.useQuery();

  const cityData = useMemo(() => {
    if (!stats?.byCity) return [];
    return (stats.byCity as { city: string; count: number }[])
      .slice(0, 8)
      .map(d => ({ name: d.city || "غير محدد", value: Number(d.count) }));
  }, [stats]);

  const zoneData = useMemo(() => {
    if (!stats?.byZone) return [];
    return (stats.byZone as { zoneName: string; count: number }[])
      .slice(0, 6)
      .map(d => ({ name: d.zoneName || "غير محدد", value: Number(d.count) }));
  }, [stats]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <RefreshCw className="w-6 h-6 text-[#25D366] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-white font-semibold">تقرير العملاء والتحليل</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي العملاء" value={Number(stats?.total) || 0} icon={Users} color="#25D366" />
        <StatCard title="تم التحليل" value={Number(stats?.analyzed) || 0} icon={TrendingUp} color="#34B7F1" />
        <StatCard title="في الانتظار" value={Number(stats?.pending) || 0} icon={Clock} color="#9B59B6" />
        <StatCard
          title="نسبة التحليل"
          value={`${stats?.total ? Math.round((Number(stats.analyzed) / Number(stats.total)) * 100) : 0}%`}
          icon={Activity}
          color="#E67E22"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cityData.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <h3 className="text-white font-medium mb-4 text-sm">توزيع العملاء حسب المدينة</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: "#8696a0", fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#8696a0", fontSize: 10 }} width={70} />
                <Tooltip contentStyle={{ background: "#1e2a32", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#25D366" radius={[0, 4, 4, 0]} name="العدد" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {zoneData.length > 0 && (
          <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
            <h3 className="text-white font-medium mb-4 text-sm">توزيع العملاء حسب المنطقة</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={zoneData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {zoneData.map((_: { name: string; value: number }, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e2a32", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {cityData.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-medium mb-4 text-sm">تفاصيل المدن</h3>
          <div className="space-y-2">
            {cityData.map((c: { name: string; value: number }, i: number) => {
              const total = cityData.reduce((sum: number, x: { name: string; value: number }) => sum + x.value, 0);
              const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-[#8696a0] w-28 text-right">{c.name}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-sm font-bold text-white w-20 text-left">{c.value.toLocaleString("ar-SA")} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== تقرير الأداء =====
function PerformanceReport() {
  const [days, setDays] = useState(30);
  const { data: empStats, isLoading } = trpc.waSettings.getEmployeePerformance.useQuery(
    { days },
    { refetchOnWindowFocus: false }
  );

  const empData = useMemo(() => {
    if (!empStats) return [];
    return empStats.slice(0, 8).map((e: {
      name: string; totalChats: number; closeRate: number; performanceScore: number;
    }) => ({
      name: e.name?.substring(0, 10) || "موظف",
      محادثات: e.totalChats || 0,
      "نسبة الإغلاق": e.closeRate || 0,
    }));
  }, [empStats]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <RefreshCw className="w-6 h-6 text-[#25D366] animate-spin" />
    </div>
  );

  const totalChats = empStats?.reduce((s: number, e: { totalChats: number }) => s + e.totalChats, 0) || 0;
  const avgPerformance = empStats?.length
    ? Math.round(empStats.reduce((s: number, e: { performanceScore: number }) => s + e.performanceScore, 0) / empStats.length)
    : 0;
  const avgCloseRate = empStats?.length
    ? Math.round(empStats.reduce((s: number, e: { closeRate: number }) => s + e.closeRate, 0) / empStats.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">تقرير أداء الموظفين</h2>
        <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-36 h-8 text-xs border-white/10 text-white" style={{ background: "#202c33" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي الموظفين" value={empStats?.length || 0} icon={Users} color="#25D366" />
        <StatCard title="إجمالي المحادثات" value={totalChats} icon={MessageSquare} color="#34B7F1" />
        <StatCard title="متوسط الأداء" value={`${avgPerformance}%`} icon={Star} color="#9B59B6" />
        <StatCard title="متوسط نسبة الإغلاق" value={`${avgCloseRate}%`} icon={CheckCircle} color="#E67E22" />
      </div>

      {empData.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-medium mb-4 text-sm">أداء الموظفين - عدد المحادثات</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={empData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#8696a0", fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#8696a0", fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: "#1e2a32", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Bar dataKey="محادثات" fill="#25D366" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {empStats && empStats.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#202c33" }}>
                <th className="text-right p-3 text-[#8696a0] font-medium">الموظف</th>
                <th className="text-center p-3 text-[#8696a0] font-medium">المحادثات</th>
                <th className="text-center p-3 text-[#8696a0] font-medium">المغلقة</th>
                <th className="text-center p-3 text-[#8696a0] font-medium">نسبة الإغلاق</th>
                <th className="text-center p-3 text-[#8696a0] font-medium">الأداء</th>
                <th className="text-center p-3 text-[#8696a0] font-medium">الفرص الضائعة</th>
              </tr>
            </thead>
            <tbody>
              {empStats.map((emp: {
                id: number; name: string; totalChats: number; closedChats: number;
                closeRate: number; performanceScore: number; missedOpportunities: number;
              }, i: number) => (
                <tr key={i} className="border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <td className="p-3 text-white font-medium">{emp.name}</td>
                  <td className="p-3 text-center text-[#25D366] font-bold">{emp.totalChats || 0}</td>
                  <td className="p-3 text-center text-[#34B7F1]">{emp.closedChats || 0}</td>
                  <td className="p-3 text-center text-yellow-400">{emp.closeRate || 0}%</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      emp.performanceScore >= 70 ? "bg-green-500/20 text-green-400" :
                      emp.performanceScore >= 40 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {emp.performanceScore || 0}%
                    </span>
                  </td>
                  <td className="p-3 text-center text-red-400">{emp.missedOpportunities || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== تقرير الذكاء الاصطناعي =====
function AIReport() {
  const [period, setPeriod] = useState("7");
  const { data } = trpc.waSettings.getDailyStats.useQuery(
    { days: parseInt(period) },
    { refetchOnWindowFocus: false }
  );

  const totalSent = data?.totals?.sent || 0;
  const totalReceived = data?.totals?.received || 0;
  const replyRate = totalReceived > 0 ? Math.round((totalSent / totalReceived) * 100) : 0;
  const activeAccounts = data?.accounts?.filter((a: { isConnected: boolean }) => a.isConnected)?.length || 0;

  const chartData = useMemo(() => {
    if (!data?.dailyBreakdown) return [];
    return data.dailyBreakdown.map((d: { day: string; sent: number; received: number }) => ({
      date: new Date(d.day).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }),
      "مُرسَلة": d.sent || 0,
      "مُستقبَلة": d.received || 0,
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">تقرير أداء الذكاء الاصطناعي</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 h-8 text-xs border-white/10 text-white" style={{ background: "#202c33" }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="14">آخر 14 يوم</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="إجمالي الرسائل المُرسَلة" value={totalSent} icon={Bot} color="#25D366" />
        <StatCard title="إجمالي الرسائل الواردة" value={totalReceived} icon={Zap} color="#34B7F1" />
        <StatCard title="معدل الاستجابة" value={`${replyRate}%`} icon={Activity} color="#9B59B6" />
        <StatCard title="الحسابات النشطة" value={activeAccounts} icon={Clock} color="#E67E22" />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <h3 className="text-white font-medium mb-4 text-sm">نشاط الرسائل اليومي</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#8696a0", fontSize: 11 }} />
              <YAxis tick={{ fill: "#8696a0", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e2a32", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="مُرسَلة" stroke="#25D366" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="مُستقبَلة" stroke="#34B7F1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ background: "rgba(37,211,102,0.05)", borderColor: "rgba(37,211,102,0.2)" }}>
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#25D366] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-white font-medium text-sm">تحليل أداء النظام</p>
            <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
              {totalSent > 0
                ? `النظام يُرسل ${totalSent.toLocaleString("ar-SA")} رسالة ويستقبل ${totalReceived.toLocaleString("ar-SA")} رسالة في آخر ${period} أيام. معدل الاستجابة ${replyRate}%.`
                : "لا توجد بيانات كافية. تأكد من ربط حسابات واتساب وتفعيل الرد التلقائي في الإعدادات."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== التقرير الأسبوعي =====
function WeeklyReportTab() {
  const { data: reports = [], isLoading, refetch } = trpc.weeklyReports.list.useQuery();
  const generateReport = trpc.weeklyReports.generate.useMutation({
    onSuccess: () => { toast.success("تم توليد التقرير الأسبوعي"); void refetch(); },
    onError: (e: { message: string }) => toast.error("خطأ في التوليد", { description: e.message }),
  });
  const sendReport = trpc.weeklyReports.sendViaWhatsapp.useMutation({
    onSuccess: () => toast.success("تم إرسال التقرير عبر واتساب"),
    onError: (e: { message: string }) => toast.error("خطأ في الإرسال", { description: e.message }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <RefreshCw className="w-6 h-6 text-[#25D366] animate-spin" />
    </div>
  );

  type Report = {
    id: number; title?: string; summary?: string; createdAt: Date;
    totalLeads?: number; totalMessages?: number; sentViaWhatsapp: boolean;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold">التقارير الأسبوعية</h2>
          <p className="text-xs text-[#8696a0] mt-0.5">توليد تقارير شاملة بالذكاء الاصطناعي وإرسالها عبر واتساب</p>
        </div>
        <Button onClick={() => generateReport.mutate({})} disabled={generateReport.isPending}
          className="gap-1.5 text-white" style={{ background: "#25D366" }}>
          <Sparkles className="w-4 h-4" />
          {generateReport.isPending ? "جاري التوليد..." : "توليد تقرير جديد"}
        </Button>
      </div>

      {(reports as Report[]).length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-[#8696a0] mx-auto mb-3" />
          <p className="text-white font-medium">لا توجد تقارير بعد</p>
          <p className="text-sm text-[#8696a0] mt-1">اضغط "توليد تقرير جديد" لإنشاء أول تقرير أسبوعي</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(reports as Report[]).map((report) => (
            <div key={report.id} className="rounded-xl border p-5" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-[#25D366]" />
                    <h3 className="text-white font-medium text-sm">{report.title || "تقرير أسبوعي"}</h3>
                    <span className="text-xs text-[#8696a0]">
                      {new Date(report.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                  {report.summary && (
                    <p className="text-xs text-[#8696a0] leading-relaxed line-clamp-3">{report.summary}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3">
                    {report.totalLeads !== undefined && (
                      <span className="text-xs text-[#8696a0]">عملاء: <span className="text-white">{report.totalLeads}</span></span>
                    )}
                    {report.totalMessages !== undefined && (
                      <span className="text-xs text-[#8696a0]">رسائل: <span className="text-white">{report.totalMessages}</span></span>
                    )}
                    {report.sentViaWhatsapp && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> أُرسل عبر واتساب
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => sendReport.mutate({ reportId: report.id })}
                  disabled={sendReport.isPending} className="h-8 gap-1.5 text-xs border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10">
                  <Send className="w-3.5 h-3.5" />
                  إرسال واتساب
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Reports() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#111b21" }}>
      <div className="px-6 py-4 border-b border-white/10 flex-shrink-0" style={{ background: "#202c33" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(37,211,102,0.15)" }}>
            <BarChart2 className="w-5 h-5 text-[#25D366]" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">التقارير والإحصائيات</h1>
            <p className="text-xs text-[#8696a0]">تقارير شاملة ودقيقة لجميع جوانب النظام</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-6 pt-4 pb-0 flex-shrink-0 border-b border-white/5" style={{ background: "#1a2530" }}>
            <TabsList className="h-9 gap-1" style={{ background: "#202c33" }}>
              <TabsTrigger value="whatsapp" className="text-xs gap-1.5 data-[state=active]:text-white data-[state=active]:bg-[#2a3942]">
                <MessageSquare className="w-3.5 h-3.5" />
                واتساب
              </TabsTrigger>
              <TabsTrigger value="leads" className="text-xs gap-1.5 data-[state=active]:text-white data-[state=active]:bg-[#2a3942]">
                <Users className="w-3.5 h-3.5" />
                العملاء
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs gap-1.5 data-[state=active]:text-white data-[state=active]:bg-[#2a3942]">
                <Activity className="w-3.5 h-3.5" />
                الأداء
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs gap-1.5 data-[state=active]:text-white data-[state=active]:bg-[#2a3942]">
                <Bot className="w-3.5 h-3.5" />
                الذكاء الاصطناعي
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs gap-1.5 data-[state=active]:text-white data-[state=active]:bg-[#2a3942]">
                <Calendar className="w-3.5 h-3.5" />
                أسبوعي
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="whatsapp" className="p-6 m-0">
              <WhatsAppReport />
            </TabsContent>
            <TabsContent value="leads" className="p-6 m-0">
              <LeadsReport />
            </TabsContent>
            <TabsContent value="performance" className="p-6 m-0">
              <PerformanceReport />
            </TabsContent>
            <TabsContent value="ai" className="p-6 m-0">
              <AIReport />
            </TabsContent>
            <TabsContent value="weekly" className="p-6 m-0">
              <WeeklyReportTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
