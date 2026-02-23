import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  LogOut,
  Users,
  ChevronRight,
  Menu,
  X,
  Search,
  MessageCircle,
  MessagesSquare,
  Shield,
  Zap,
  Globe,
  Brain,
  Smartphone,
  Layers,
  Settings2,
  FileSpreadsheet,
  Upload,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

// القائمة الرئيسية - مرتبة بشكل احترافي
const navItems = [
  { path: "/", label: "لوحة التحكم", icon: BarChart3, permission: null },
  { path: "/chats", label: "المحادثات", icon: MessagesSquare, permission: "whatsapp.send" },
  { path: "/whatsapp", label: "إرسال واتساب", icon: MessageCircle, permission: "whatsapp.send" },
  { path: "/leads", label: "قائمة العملاء", icon: Users, permission: "leads.view" },
  { path: "/search-hub", label: "مركز البحث", icon: Search, permission: "search.use" },
];

// قائمة الإدارة - مدمجة ومرتبة بدون تكرار
const adminNavItems = [
  { path: "/users", label: "إدارة المستخدمين", icon: Shield },
  // AI مدمج: إعدادات AI + قاعدة المعرفة في صفحة واحدة
  { path: "/ai-settings", label: "ذكاء اصطناعي AI", icon: Brain },
  // إعدادات البيانات تشمل كشف الاهتمام + شرائح العملاء (مدمجة)
  { path: "/data-settings", label: "إعدادات البيانات", icon: Settings2 },
  { path: "/segments", label: "شرائح العملاء", icon: Layers },
  { path: "/whatsapp-accounts", label: "حسابات واتساب", icon: Smartphone },
  { path: "/whatsapp-report", label: "تقرير الإرسال", icon: TrendingUp },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const logout = trpc.auth.logout.useMutation();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // جلب صلاحيات المستخدم
  const { data: myPerms } = trpc.invitations.myPermissions.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const userPermissionsList = myPerms?.permissions ?? [];
  const isAdmin = user?.role === "admin";
  // جلب عداد الرسائل غير المقروءة
  const { data: unreadData } = trpc.waSettings.getTotalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });
  const totalUnread = unreadData?.total ?? 0;
  // فلترة navItems حسب الصلاحيات
  const visibleNavItems = navItems.filter((item) => {
    if (isAdmin) return true;
    if (!item.permission) return true;
    return userPermissionsList.includes(item.permission);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">منصة تحليل التسويق الرقمي</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            اكتشف الثغرات التسويقية في المواقع الإلكترونية وحسابات السوشيال ميديا للعملاء المحتملين في السعودية
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            تسجيل الدخول للمتابعة
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout.mutateAsync();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 h-full w-64 z-50 flex flex-col border-l border-border transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "oklch(0.11 0.012 240)" }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.65 0.18 200 / 0.2)", border: "1px solid oklch(0.65 0.18 200 / 0.3)" }}>
              <Zap className="w-5 h-5" style={{ color: "var(--brand-cyan)" }} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-tight">بحثي</p>
              <p className="text-xs text-muted-foreground">مجمع البيانات</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  style={isActive ? {
                    background: "oklch(0.65 0.18 200 / 0.12)",
                    border: "1px solid oklch(0.65 0.18 200 / 0.2)",
                    color: "var(--brand-cyan)",
                  } : {}}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.path === "/chats" && totalUnread > 0 && (
                    <span
                      className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
                      style={{ background: "oklch(0.55 0.22 25)" }}
                    >
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {/* قسم الأدمن */}
          {user?.role === "admin" && (
            <>
              <div className="px-3 pt-3 pb-1">
                <p className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">إدارة</p>
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path} onClick={() => setSidebarOpen(false)}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                      style={isActive ? {
                        background: "oklch(0.65 0.18 200 / 0.12)",
                        border: "1px solid oklch(0.65 0.18 200 / 0.2)",
                        color: "var(--brand-cyan)",
                      } : {}}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: "oklch(0.15 0.015 240)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "oklch(0.65 0.18 200 / 0.2)", color: "var(--brand-cyan)" }}>
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name || "المستخدم"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 flex-shrink-0" style={{ background: "oklch(0.11 0.012 240)" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="w-4 h-4" />
            <span>مجمع بيانات الأعمال</span>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">النظام يعمل</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
