import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Map, TrendingUp, AlertCircle, CheckCircle, Clock, Plus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function ScoreRing({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="oklch(0.2 0.02 240)" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="36" y="41" textAnchor="middle" fill={color} fontSize="14" fontWeight="700">{value.toFixed(1)}</text>
    </svg>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.leads.stats.useQuery();
  const { data: zones, isLoading: zonesLoading } = trpc.zones.list.useQuery();
  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery({});
  const seedZones = trpc.zones.seed.useMutation();
  const utils = trpc.useUtils();

  const handleSeedZones = async () => {
    await seedZones.mutateAsync();
    utils.zones.list.invalidate();
  };

  const completedZones = zones?.filter(z => z.status === "completed").length ?? 0;
  const inProgressZones = zones?.filter(z => z.status === "in_progress").length ?? 0;
  const totalZones = zones?.length ?? 0;
  const analyzedLeads = stats?.analyzed ?? 0;
  const totalLeads = stats?.total ?? 0;

  const cityData = (stats?.byCity ?? []).map((c: any) => ({ name: c.city, value: Number(c.count) }));
  const COLORS = ["#22d3ee", "#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63"];

  const recentLeads = leads?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-1">نظرة شاملة على مشروع تجميع بيانات اللحوم والملاحم</p>
        </div>
        <Link href="/leads/add">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.15 200))" }}>
            <Plus className="w-4 h-4" />
            إضافة Lead
          </button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي Leads",
            value: statsLoading ? "..." : totalLeads,
            sub: `الهدف: 400`,
            icon: Users,
            color: "var(--brand-cyan)",
            bg: "oklch(0.65 0.18 200 / 0.1)",
          },
          {
            label: "تم التحليل",
            value: statsLoading ? "..." : analyzedLeads,
            sub: `${totalLeads > 0 ? Math.round((analyzedLeads / totalLeads) * 100) : 0}% من الكل`,
            icon: CheckCircle,
            color: "var(--brand-green)",
            bg: "oklch(0.65 0.18 145 / 0.1)",
          },
          {
            label: "المناطق",
            value: zonesLoading ? "..." : totalZones,
            sub: `${completedZones} مكتملة`,
            icon: Map,
            color: "var(--brand-gold)",
            bg: "oklch(0.78 0.16 75 / 0.1)",
          },
          {
            label: "قيد الانتظار",
            value: statsLoading ? "..." : stats?.pending ?? 0,
            sub: "بحاجة للتحليل",
            icon: Clock,
            color: "var(--brand-purple)",
            bg: "oklch(0.62 0.18 285 / 0.1)",
          },
        ].map((stat, i) => (
          <div key={i} className="rounded-2xl p-4 border border-border" style={{ background: stat.bg }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${stat.bg}`, border: `1px solid ${stat.color}30` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{stat.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-5 border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-foreground">تقدم جمع البيانات</p>
            <p className="text-xs text-muted-foreground mt-0.5">الهدف: 400 Lead في السعودية كاملة</p>
          </div>
          <span className="text-2xl font-bold" style={{ color: "var(--brand-cyan)" }}>
            {totalLeads > 0 ? Math.round((totalLeads / 400) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 240)" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, (totalLeads / 400) * 100)}%`,
              background: "linear-gradient(90deg, oklch(0.55 0.15 200), oklch(0.72 0.18 200))",
            }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0</span>
          <span>100</span>
          <span>200</span>
          <span>300</span>
          <span>400</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City distribution chart */}
        <div className="rounded-2xl p-5 border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
          <h3 className="font-semibold text-foreground mb-4">توزيع Leads حسب المدينة</h3>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cityData} layout="vertical">
                <XAxis type="number" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.7 0.01 240)", fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.15 0.015 240)", border: "1px solid oklch(0.25 0.02 240)", borderRadius: "8px", color: "oklch(0.9 0.005 240)" }}
                />
                <Bar dataKey="value" fill="oklch(0.65 0.18 200)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <BarChart className="w-10 h-10 opacity-30" />
              <p className="text-sm">لا توجد بيانات بعد</p>
              <Link href="/leads/add">
                <button className="text-xs px-3 py-1.5 rounded-lg mt-1" style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                  أضف أول Lead
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Zones status */}
        <div className="rounded-2xl p-5 border border-border" style={{ background: "oklch(0.12 0.015 240)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">حالة المناطق الجغرافية</h3>
            <Link href="/zones">
              <button className="text-xs flex items-center gap-1" style={{ color: "var(--brand-cyan)" }}>
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </button>
            </Link>
          </div>
          {totalZones === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Map className="w-10 h-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">لم يتم إنشاء المناطق بعد</p>
              <button
                onClick={handleSeedZones}
                disabled={seedZones.isPending}
                className="text-xs px-4 py-2 rounded-lg font-medium transition-all"
                style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}
              >
                {seedZones.isPending ? "جاري الإنشاء..." : "إنشاء 22 منطقة تلقائياً"}
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {zones?.slice(0, 8).map((zone) => (
                <div key={zone.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "oklch(0.15 0.015 240)" }}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    zone.status === "completed" ? "bg-green-500" :
                    zone.status === "in_progress" ? "bg-yellow-500" : "bg-gray-500"
                  }`} />
                  <span className="text-sm text-foreground flex-1 truncate">{zone.name}</span>
                  <span className="text-xs text-muted-foreground">{zone.leadsCount}/{zone.targetLeads}</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.2 0.02 240)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (zone.leadsCount / zone.targetLeads) * 100)}%`,
                        background: zone.status === "completed" ? "oklch(0.65 0.18 145)" : "oklch(0.65 0.18 200)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="rounded-2xl border border-border overflow-hidden" style={{ background: "oklch(0.12 0.015 240)" }}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">آخر Leads المضافة</h3>
          <Link href="/leads">
            <button className="text-xs flex items-center gap-1" style={{ color: "var(--brand-cyan)" }}>
              عرض الكل <ArrowLeft className="w-3 h-3" />
            </button>
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Users className="w-10 h-10 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground">لا توجد Leads بعد</p>
            <Link href="/leads/add">
              <button className="text-xs px-4 py-2 rounded-lg font-medium" style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
                أضف أول Lead الآن
              </button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`}>
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: "oklch(0.65 0.18 200 / 0.15)", color: "var(--brand-cyan)" }}>
                    {lead.companyName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">{lead.businessType} · {lead.city}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      lead.analysisStatus === "completed" ? "score-high" :
                      lead.analysisStatus === "analyzing" ? "score-medium" :
                      lead.analysisStatus === "failed" ? "score-low" : ""
                    }`}
                    style={lead.analysisStatus === "pending" ? { background: "oklch(0.2 0.02 240)", color: "oklch(0.55 0.01 240)" } : {}}>
                      {lead.analysisStatus === "completed" ? "مُحلَّل" :
                       lead.analysisStatus === "analyzing" ? "جاري التحليل" :
                       lead.analysisStatus === "failed" ? "فشل" : "معلق"}
                    </span>
                    {lead.leadPriorityScore && (
                      <span className="text-xs font-bold" style={{ color: lead.leadPriorityScore >= 7 ? "var(--brand-green)" : lead.leadPriorityScore >= 5 ? "var(--brand-gold)" : "var(--brand-red)" }}>
                        {lead.leadPriorityScore.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
