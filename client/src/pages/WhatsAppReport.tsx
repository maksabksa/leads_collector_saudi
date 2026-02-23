import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  MessageSquare, Send, Inbox, TrendingUp, Phone, Smartphone,
  Calendar, RefreshCw, ArrowUpRight, ArrowDownRight, Activity,
  Users, CheckCheck, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ===== ألوان الحسابات =====
const ACCOUNT_COLORS = [
  "#25D366", "#128C7E", "#34B7F1", "#9B59B6", "#E67E22", "#E74C3C",
];

function getAccountColor(index: number) {
  return ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];
}

// ===== مكوّن بطاقة الإحصاء =====
function StatCard({
  title, value, subtitle, icon: Icon, color, trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.value >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend.value >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value.toLocaleString("ar-SA")}</div>
      <div className="text-sm text-[#8696a0]">{title}</div>
      {subtitle && <div className="text-xs text-[#8696a0] mt-1 opacity-70">{subtitle}</div>}
    </div>
  );
}

// ===== مكوّن بطاقة الحساب =====
function AccountCard({
  account, index,
}: {
  account: {
    accountId: string;
    label: string;
    phoneNumber: string;
    sent: number;
    received: number;
    replyRate: number;
    totalChats: number;
    activeChats: number;
    unreadMessages: number;
    isConnected: boolean;
  };
  index: number;
}) {
  const color = getAccountColor(index);
  const total = account.sent + account.received;
  const sentPct = total > 0 ? Math.round((account.sent / total) * 100) : 0;

  return (
    <div
      className="rounded-xl p-4 border transition-all hover:border-opacity-60"
      style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}40` }}
    >
      {/* رأس البطاقة */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${color}20`, border: `2px solid ${color}40`, color }}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{account.label}</div>
            <div className="text-xs text-[#8696a0]">{account.phoneNumber}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: account.isConnected ? "#25D366" : "#6b7280" }}
          />
          <span className="text-xs" style={{ color: account.isConnected ? "#25D366" : "#6b7280" }}>
            {account.isConnected ? "مسجّل" : "غير مسجّل"}
          </span>
        </div>
      </div>

      {/* إحصائيات الرسائل */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-white">{account.sent.toLocaleString("ar-SA")}</div>
          <div className="text-[10px] text-[#8696a0] flex items-center justify-center gap-1 mt-0.5">
            <Send className="w-2.5 h-2.5" /> مُرسَلة
          </div>
        </div>
        <div className="text-center border-x border-white/10">
          <div className="text-xl font-bold text-white">{account.received.toLocaleString("ar-SA")}</div>
          <div className="text-[10px] text-[#8696a0] flex items-center justify-center gap-1 mt-0.5">
            <Inbox className="w-2.5 h-2.5" /> مُستقبَلة
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: account.replyRate >= 50 ? "#25D366" : "#f59e0b" }}>
            {account.replyRate}%
          </div>
          <div className="text-[10px] text-[#8696a0] flex items-center justify-center gap-1 mt-0.5">
            <TrendingUp className="w-2.5 h-2.5" /> معدل الرد
          </div>
        </div>
      </div>

      {/* شريط التوزيع */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-[#8696a0] mb-1">
          <span>صادر {sentPct}%</span>
          <span>وارد {100 - sentPct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${sentPct}%`, background: color }}
          />
        </div>
      </div>

      {/* إحصائيات المحادثات */}
      <div className="flex items-center justify-between text-xs text-[#8696a0] pt-3 border-t border-white/5">
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{account.totalChats} محادثة</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5" />
          <span>{account.activeChats} نشطة</span>
        </div>
        {account.unreadMessages > 0 && (
          <div className="flex items-center gap-1 text-[#25D366]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{account.unreadMessages} غير مقروء</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function WhatsAppReport() {
  const [days, setDays] = useState(7);

  const { data, isLoading, refetch } = trpc.waSettings.getDailyStats.useQuery(
    { days },
    { refetchInterval: 30000 }
  );

  const accounts = data?.accounts ?? [];
  const dailyBreakdown = data?.dailyBreakdown ?? [];
  const totals = data?.totals ?? { sent: 0, received: 0, chats: 0 };

  // تحضير بيانات الرسم البياني اليومي
  const chartData = useMemo(() => {
    return dailyBreakdown.map(day => ({
      day: new Date(day.day).toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit" }),
      مُرسَلة: day.sent,
      مُستقبَلة: day.received,
      الإجمالي: day.sent + day.received,
    }));
  }, [dailyBreakdown]);

  // بيانات الدائرة للتوزيع بين الحسابات
  const pieData = useMemo(() => {
    return accounts.map((acc, i) => ({
      name: acc.label,
      value: acc.sent + acc.received,
      color: getAccountColor(i),
    })).filter(d => d.value > 0);
  }, [accounts]);

  // أفضل حساب من حيث النشاط
  const topAccount = useMemo(() => {
    if (accounts.length === 0) return null;
    return accounts.reduce((best, acc) => (acc.sent + acc.received) > (best.sent + best.received) ? acc : best);
  }, [accounts]);

  const overallReplyRate = totals.sent > 0 && totals.received > 0
    ? Math.round((totals.sent / totals.received) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "#0b141a", color: "white" }}>
      {/* رأس الصفحة */}
      <div className="border-b border-white/10 px-6 py-4" style={{ background: "#111b21" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart className="w-5 h-5 text-[#25D366]" />
              تقرير الإرسال
            </h1>
            <p className="text-sm text-[#8696a0] mt-0.5">
              إحصائيات كل رقم واتساب: الرسائل المُرسَلة والمُستقبَلة ومعدل الرد
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* اختيار الفترة الزمنية */}
            <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "rgba(255,255,255,0.1)", background: "#202c33" }}>
              {[3, 7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className="text-xs px-3 py-1 rounded-md transition-all"
                  style={days === d
                    ? { background: "#25D366", color: "white" }
                    : { color: "#8696a0" }
                  }
                >
                  {d} يوم
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="gap-1.5 text-xs border-white/10 text-[#8696a0] hover:text-white"
              style={{ background: "#202c33" }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              تحديث
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#25D366]" />
            <span className="mr-3 text-[#8696a0]">جاري تحميل البيانات...</span>
          </div>
        ) : (
          <>
            {/* ===== الإحصائيات الإجمالية ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="إجمالي الرسائل المُرسَلة"
                value={totals.sent}
                subtitle={`خلال آخر ${days} يوم`}
                icon={Send}
                color="#25D366"
              />
              <StatCard
                title="إجمالي الرسائل المُستقبَلة"
                value={totals.received}
                subtitle={`خلال آخر ${days} يوم`}
                icon={Inbox}
                color="#34B7F1"
              />
              <StatCard
                title="معدل الرد الإجمالي"
                value={`${overallReplyRate}%`}
                subtitle="نسبة الصادر إلى الوارد"
                icon={TrendingUp}
                color={overallReplyRate >= 50 ? "#25D366" : "#f59e0b"}
              />
              <StatCard
                title="إجمالي المحادثات"
                value={totals.chats}
                subtitle="عبر جميع الأرقام"
                icon={MessageSquare}
                color="#9B59B6"
              />
            </div>

            {/* ===== بطاقات الحسابات ===== */}
            {accounts.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-[#8696a0] mb-3 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  إحصائيات كل رقم واتساب
                  {topAccount && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366" }}>
                      الأكثر نشاطاً: {topAccount.label}
                    </span>
                  )}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((acc, i) => (
                    <AccountCard key={acc.accountId} account={acc} index={i} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <Smartphone className="w-12 h-12 mx-auto mb-3 text-[#8696a0] opacity-30" />
                <p className="text-[#8696a0]">لا توجد بيانات حسابات واتساب</p>
                <p className="text-xs text-[#8696a0] mt-1 opacity-70">أضف حسابات واتساب من صفحة الإعدادات</p>
              </div>
            )}

            {/* ===== الرسوم البيانية ===== */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* رسم بياني يومي */}
                <div className="lg:col-span-2 rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#25D366]" />
                    النشاط اليومي (آخر {days} يوم)
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="day" tick={{ fill: "#8696a0", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8696a0", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#202c33", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }}
                        labelStyle={{ color: "#8696a0" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", color: "#8696a0" }} />
                      <Bar dataKey="مُرسَلة" fill="#25D366" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="مُستقبَلة" fill="#34B7F1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* توزيع الرسائل بين الحسابات */}
                <div className="rounded-xl p-4 border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#34B7F1]" />
                    توزيع النشاط بين الأرقام
                  </h3>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            dataKey="value"
                            paddingAngle={3}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "#202c33", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {pieData.map((entry, i) => {
                          const total = pieData.reduce((s, d) => s + d.value, 0);
                          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                                <span className="text-[#8696a0] truncate max-w-[100px]">{entry.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{entry.value.toLocaleString("ar-SA")}</span>
                                <span className="text-[#8696a0]">{pct}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-[#8696a0] text-sm">
                      لا توجد بيانات كافية
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== جدول مقارنة الأرقام ===== */}
            {accounts.length > 1 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="px-4 py-3 border-b" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-[#25D366]" />
                    مقارنة الأرقام
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                        <th className="text-right px-4 py-3 text-[#8696a0] font-medium text-xs">الرقم</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">مُرسَلة</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">مُستقبَلة</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">معدل الرد</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">المحادثات</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">غير مقروء</th>
                        <th className="text-center px-4 py-3 text-[#8696a0] font-medium text-xs">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((acc, i) => {
                        const color = getAccountColor(i);
                        const isTop = topAccount?.accountId === acc.accountId;
                        return (
                          <tr
                            key={acc.accountId}
                            className="border-t transition-colors"
                            style={{
                              borderColor: "rgba(255,255,255,0.05)",
                              background: isTop ? `${color}08` : undefined,
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                <div>
                                  <div className="font-medium text-white text-xs">{acc.label}</div>
                                  <div className="text-[10px] text-[#8696a0]">{acc.phoneNumber}</div>
                                </div>
                                {isTop && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>
                                    الأكثر نشاطاً
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-white font-medium">{acc.sent.toLocaleString("ar-SA")}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-white font-medium">{acc.received.toLocaleString("ar-SA")}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className="font-bold"
                                style={{ color: acc.replyRate >= 50 ? "#25D366" : acc.replyRate >= 25 ? "#f59e0b" : "#ef4444" }}
                              >
                                {acc.replyRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-[#8696a0]">{acc.totalChats}</td>
                            <td className="px-4 py-3 text-center">
                              {acc.unreadMessages > 0 ? (
                                <span className="text-[#25D366] font-medium">{acc.unreadMessages}</span>
                              ) : (
                                <span className="text-[#8696a0]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: acc.isConnected ? "#25D366" : "#6b7280" }}
                                />
                                <span className="text-xs" style={{ color: acc.isConnected ? "#25D366" : "#6b7280" }}>
                                  {acc.isConnected ? "مسجّل" : "غير مسجّل"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* رسالة إذا لم توجد بيانات */}
            {chartData.length === 0 && accounts.length === 0 && (
              <div className="text-center py-16 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <BarChart className="w-16 h-16 mx-auto mb-4 text-[#8696a0] opacity-20" />
                <p className="text-[#8696a0] text-lg font-medium">لا توجد بيانات بعد</p>
                <p className="text-sm text-[#8696a0] mt-2 opacity-70">
                  ستظهر الإحصائيات هنا بعد بدء استخدام واتساب وإرسال الرسائل
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
