import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Search, Send, Bot, Instagram, MessageSquare,
  Phone, Archive, RefreshCw, Sparkles, Filter,
  CheckCheck, Clock, AlertCircle, ChevronDown,
  MoreVertical, User, Link2
} from "lucide-react";
import { Link } from "wouter";

// أيقونات المنصات
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`}>
    <path d="M12.166 2c.93 0 4.369.26 5.975 3.607.522 1.1.397 2.957.298 4.42l-.008.13c-.01.148-.02.29-.027.425.3.15.878.337 1.73.18.12-.022.245-.034.37-.034.48 0 .9.2 1.07.52.22.42.06.93-.46 1.32-.07.05-.19.12-.35.2-.5.24-1.26.6-1.5 1.28-.06.17-.05.33.03.54l.01.02c.27.65 1.1 2.64-.26 3.54-.36.24-.78.35-1.26.35-.4 0-.84-.08-1.32-.24-.48-.16-.93-.24-1.35-.24-.46 0-.85.1-1.17.3-.52.32-1.03.97-1.5 1.57-.47.6-.96 1.22-1.6 1.6-.52.3-1.1.46-1.72.46-.62 0-1.2-.16-1.72-.46-.64-.38-1.13-1-1.6-1.6-.47-.6-.98-1.25-1.5-1.57-.32-.2-.71-.3-1.17-.3-.42 0-.87.08-1.35.24-.48.16-.92.24-1.32.24-.48 0-.9-.11-1.26-.35-1.36-.9-.53-2.89-.26-3.54l.01-.02c.08-.21.09-.37.03-.54-.24-.68-1-.04-1.5-1.28-.07-.18-.2-.37-.35-.47-.52-.39-.68-.9-.46-1.32.17-.32.59-.52 1.07-.52.125 0 .25.012.37.034.852.157 1.43-.03 1.73-.18-.007-.135-.017-.277-.027-.425l-.008-.13c-.099-1.463-.224-3.32.298-4.42C7.797 2.26 11.236 2 12.166 2z"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current ${className}`}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PLATFORM_CONFIG = {
  whatsapp: {
    name: "واتساب",
    icon: <WhatsAppIcon className="w-4 h-4" />,
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
    badge: "bg-green-500",
  },
  instagram: {
    name: "إنستجرام",
    icon: <Instagram className="w-4 h-4" />,
    color: "text-pink-600",
    bg: "bg-pink-100 dark:bg-pink-900/30",
    badge: "bg-gradient-to-br from-purple-500 to-pink-500",
  },
  tiktok: {
    name: "تيك توك",
    icon: <TikTokIcon className="w-4 h-4" />,
    color: "text-gray-800 dark:text-gray-200",
    bg: "bg-gray-100 dark:bg-gray-800/50",
    badge: "bg-gray-800",
  },
  snapchat: {
    name: "سناب شات",
    icon: <SnapchatIcon className="w-4 h-4" />,
    color: "text-yellow-600",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    badge: "bg-yellow-400",
  },
};

type Platform = keyof typeof PLATFORM_CONFIG;

interface Conversation {
  id: number;
  platform: string;
  senderUsername: string | null;
  senderDisplayName: string | null;
  senderProfilePic: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: Date | null;
  unreadCount: number | null;
  isRead: boolean | null;
  aiAutoReply: boolean | null;
  source: "social" | "whatsapp";
}

function formatTime(date: Date | null | string) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "الآن";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} د`;
  if (diff < 86400000) return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

export default function UnifiedInbox() {
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<"all" | Platform>("all");
  const [filterUnread, setFilterUnread] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [aiReplyLoading, setAiReplyLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: inboxData, refetch: refetchConvs } = trpc.inbox.conversations.list.useQuery({
    platform: filterPlatform,
    unreadOnly: filterUnread,
    search: searchQuery || undefined,
    limit: 100,
  }, {
    // polling كل 8 ثوانٍ للإشعارات الفورية
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });

  // إشعار المتصفح عند وصول رسائل جديدة
  const prevUnreadRef = useRef<number>(0);
  useEffect(() => {
    const currentUnread = (inboxData?.conversations as Conversation[] || []).reduce(
      (sum, c) => sum + (c.unreadCount ?? 0), 0
    );
    if (currentUnread > prevUnreadRef.current && prevUnreadRef.current > 0) {
      const diff = currentUnread - prevUnreadRef.current;
      toast.info(`${diff} رسالة جديدة`, {
        description: "لديك رسائل غير مقروءة في صندوق الوارد",
        duration: 4000,
      });
      // إشعار المتصفح إذا كانت الصفحة في الخلفية
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('رسائل جديدة', { body: `${diff} رسالة جديدة في صندوق الوارد` });
      }
    }
    prevUnreadRef.current = currentUnread;
  }, [inboxData]);

  const { data: messages, refetch: refetchMessages } = trpc.inbox.conversations.getMessages.useQuery(
    {
      conversationId: selectedConv?.id ?? 0,
      platform: (selectedConv?.platform ?? "whatsapp") as Platform,
    },
    { enabled: !!selectedConv }
  );

  const { data: stats } = trpc.inbox.conversations.stats.useQuery();

  const sendMutation = trpc.inbox.conversations.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      refetchMessages();
      refetchConvs();
    },
    onError: (err) => {
      toast.error("فشل الإرسال", { description: err.message });
    },
  });

  const toggleAiMutation = trpc.inbox.conversations.toggleAiReply.useMutation({
    onSuccess: () => refetchConvs(),
  });

  const generateAiReplyMutation = trpc.inbox.conversations.generateAiReply.useMutation({
    onSuccess: (data) => {
      setMessageText(typeof data.reply === "string" ? data.reply : "");
      setAiReplyLoading(false);
    },
    onError: () => setAiReplyLoading(false),
  });

  const markAsReadMutation = trpc.inbox.conversations.markAsRead.useMutation();

  useEffect(() => {
    if (selectedConv) {
      markAsReadMutation.mutate({
        conversationId: selectedConv.id,
        platform: selectedConv.platform as Platform,
      });
    }
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !selectedConv) return;
    sendMutation.mutate({
      conversationId: selectedConv.id,
      platform: selectedConv.platform as Platform,
      content: messageText.trim(),
    });
  };

  const handleGenerateAiReply = () => {
    if (!messages || messages.length === 0) return;
    setAiReplyLoading(true);
    const lastMessages = [...messages].reverse().slice(-6).map(m => ({
      direction: String(m.direction),
      content: m.content ?? "",
    }));
    generateAiReplyMutation.mutate({ lastMessages });
  };

  const conversations = inboxData?.conversations as Conversation[] || [];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">
        {/* ===== القائمة الجانبية ===== */}
        <div className="w-80 border-l flex flex-col bg-background shrink-0">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">صندوق الوارد</h2>
              <div className="flex items-center gap-1">
                {stats?.unreadConversations ? (
                  <Badge className="bg-red-500 text-white text-xs px-1.5">
                    {stats.unreadConversations}
                  </Badge>
                ) : null}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchConvs()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* بحث */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث في المحادثات..."
                className="pr-9 h-8 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* فلاتر المنصات */}
            <div className="flex gap-1 flex-wrap">
              {(["all", "whatsapp", "instagram", "tiktok", "snapchat"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(p)}
                  className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                    filterPlatform === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p === "all" ? "الكل" : PLATFORM_CONFIG[p]?.name}
                </button>
              ))}
            </div>

            {/* فلتر غير المقروء */}
            <div className="flex items-center gap-2">
              <Switch
                id="unread-filter"
                checked={filterUnread}
                onCheckedChange={setFilterUnread}
                className="scale-75"
              />
              <Label htmlFor="unread-filter" className="text-xs text-muted-foreground cursor-pointer">
                غير المقروء فقط
              </Label>
            </div>
          </div>

          {/* قائمة المحادثات */}
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">لا توجد محادثات</p>
                {!inboxData && (
                  <Link href="/social-accounts">
                    <Button variant="link" size="sm" className="mt-2 text-xs gap-1">
                      <Link2 className="w-3 h-3" />
                      ربط الحسابات
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const platform = PLATFORM_CONFIG[conv.platform as Platform];
                const isSelected = selectedConv?.id === conv.id && selectedConv?.platform === conv.platform;
                const displayName = conv.senderDisplayName || conv.senderUsername || "مجهول";

                return (
                  <button
                    key={`${conv.platform}-${conv.id}`}
                    className={`w-full p-3 text-right flex gap-3 hover:bg-muted/50 transition-colors border-b border-border/50 ${
                      isSelected ? "bg-muted" : ""
                    } ${!conv.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    onClick={() => setSelectedConv(conv)}
                  >
                    {/* أفاتار */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold overflow-hidden">
                        {conv.senderProfilePic ? (
                          <img src={conv.senderProfilePic} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          displayName[0]?.toUpperCase() || "?"
                        )}
                      </div>
                      {/* شارة المنصة */}
                      <div className={`absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full ${platform?.badge} flex items-center justify-center text-white`}>
                        <span className="scale-75">{platform?.icon}</span>
                      </div>
                    </div>

                    {/* المحتوى */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-sm font-medium truncate ${!conv.isRead ? "font-bold" : ""}`}>
                          {displayName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 mr-1">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate flex-1">
                          {conv.lastMessagePreview || "لا توجد رسائل"}
                        </p>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <Badge className="bg-blue-500 text-white text-xs px-1.5 py-0 h-4 mr-1 shrink-0">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* ===== منطقة الشات ===== */}
        {selectedConv ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header المحادثة */}
            <div className="p-4 border-b flex items-center justify-between bg-background">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-bold text-sm overflow-hidden">
                  {selectedConv.senderProfilePic ? (
                    <img src={selectedConv.senderProfilePic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (selectedConv.senderDisplayName || selectedConv.senderUsername || "?")[0]?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {selectedConv.senderDisplayName || selectedConv.senderUsername || "مجهول"}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${PLATFORM_CONFIG[selectedConv.platform as Platform]?.color}`}>
                      {PLATFORM_CONFIG[selectedConv.platform as Platform]?.icon}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {PLATFORM_CONFIG[selectedConv.platform as Platform]?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* أدوات المحادثة */}
              <div className="flex items-center gap-3">
                {/* تبديل الرد التلقائي */}
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    checked={selectedConv.aiAutoReply ?? false}
                    onCheckedChange={(checked) => {
                      toggleAiMutation.mutate({
                        conversationId: selectedConv.id,
                        platform: selectedConv.platform as Platform,
                        enabled: checked,
                      });
                      setSelectedConv(prev => prev ? { ...prev, aiAutoReply: checked } : prev);
                    }}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">AI</span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Archive className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* الرسائل */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3 max-w-3xl mx-auto">
                {!messages || messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">لا توجد رسائل بعد</p>
                  </div>
                ) : (
                  [...messages].reverse().map((msg) => {
                    const isOutbound = msg.direction === "outbound" || msg.direction === "outgoing";
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutbound ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                            isOutbound
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                            <span className={`text-xs ${isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                              {formatTime(msg.sentAt)}
                            </span>
                            {isOutbound && (
                              <CheckCheck className={`w-3 h-3 ${
                                msg.status === "read" ? "text-blue-300" : "text-primary-foreground/70"
                              }`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* منطقة الإدخال */}
            <div className="p-4 border-t bg-background space-y-2">
              {/* زر توليد رد AI */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleGenerateAiReply}
                  disabled={aiReplyLoading}
                >
                  {aiReplyLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  )}
                  اقتراح رد ذكي
                </Button>
                {selectedConv.platform !== "whatsapp" && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {selectedConv.platform === "instagram"
                      ? "إنستجرام: الإرسال للمتابعين فقط"
                      : "الإرسال عبر التطبيق الأصلي"}
                  </span>
                )}
              </div>

              {/* حقل الرسالة */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="اكتب رسالتك هنا..."
                  className="resize-none min-h-[60px] max-h-32 text-sm"
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button
                  className="self-end gap-1 shrink-0"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  إرسال
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* حالة عدم اختيار محادثة - دليل الإعداد */
          <div className="flex-1 overflow-y-auto p-6" dir="rtl">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* العنوان */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">صندوق الوارد الموحد</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  اربط حساباتك لاستقبال رسائل جميع المنصات في مكان واحد والرد عليها مباشرة
                </p>
              </div>

              {/* بطاقات المنصات */}
              <div className="grid grid-cols-1 gap-3">
                {/* واتساب */}
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <WhatsAppIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">واتساب</h3>
                        <p className="text-xs text-muted-foreground">ربط عبر QR Code - يعمل الآن</p>
                      </div>
                    </div>
                    <Link href="/whatsapp-accounts">
                      <Button size="sm" variant="outline" className="text-xs border-green-500/50 text-green-600 hover:bg-green-500/10 gap-1">
                        <Link2 className="w-3 h-3" />
                        إعداد الحسابات
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>✓ استقبال وإرسال الرسائل مباشرة</p>
                    <p>✓ رد تلقائي بالذكاء الاصطناعي</p>
                    <p>✓ إرسال جماعي للعملاء</p>
                  </div>
                </div>

                {/* إنستجرام */}
                <div className="rounded-xl border border-pink-500/30 bg-pink-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <Instagram className="w-5 h-5 text-pink-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">إنستجرام</h3>
                        <p className="text-xs text-muted-foreground">ربط عبر Facebook OAuth - يتطلب Business Account</p>
                      </div>
                    </div>
                    <Link href="/settings">
                      <Button size="sm" variant="outline" className="text-xs border-pink-500/50 text-pink-600 hover:bg-pink-500/10 gap-1">
                        <Link2 className="w-3 h-3" />
                        ربط الحساب
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>✓ استقبال رسائل Direct من المتابعين</p>
                    <p>✓ الرد على التعليقات والرسائل</p>
                    <p className="text-amber-600">⚠ يتطلب: حساب Business + Meta App مُعتمد</p>
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-pink-500/10 text-xs">
                    <p className="font-medium text-pink-600 mb-1">خطوات الإعداد:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                      <li>اذهب إلى الإعدادات ← تبويب إنستجرام</li>
                      <li>اضغط "تسجيل الدخول بإنستجرام" أو أدخل Access Token يدوياً</li>
                      <li>ستظهر رسائل Direct هنا تلقائياً</li>
                    </ol>
                  </div>
                </div>

                {/* تيك توك */}
                <div className="rounded-xl border border-gray-500/30 bg-gray-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <TikTokIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">تيك توك</h3>
                        <p className="text-xs text-muted-foreground">ربط عبر TikTok OAuth - يتطلب Business Account</p>
                      </div>
                    </div>
                    <Link href="/social-accounts">
                      <Button size="sm" variant="outline" className="text-xs gap-1">
                        <Link2 className="w-3 h-3" />
                        ربط الحساب
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>✓ استقبال تعليقات الفيديوهات</p>
                    <p>✓ متابعة الإشارات والردود</p>
                    <p className="text-amber-600">⚠ الرسائل الخاصة تُفتح في تطبيق TikTok مباشرة</p>
                  </div>
                </div>

                {/* سناب شات */}
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <SnapchatIcon className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">سناب شات</h3>
                        <p className="text-xs text-muted-foreground">ربط عبر Snapchat OAuth - يتطلب Business Account</p>
                      </div>
                    </div>
                    <Link href="/social-accounts">
                      <Button size="sm" variant="outline" className="text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 gap-1">
                        <Link2 className="w-3 h-3" />
                        ربط الحساب
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    <p>✓ استقبال رسائل Snapchat Business</p>
                    <p>✓ متابعة التفاعل مع الإعلانات</p>
                    <p className="text-amber-600">⚠ الرسائل الخاصة تُفتح في تطبيق Snapchat مباشرة</p>
                  </div>
                </div>
              </div>

              {/* إحصائيات */}
              {stats && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.totalConversations ?? 0}</p>
                    <p className="text-xs text-muted-foreground">إجمالي المحادثات</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold text-blue-500">{stats.unreadConversations ?? 0}</p>
                    <p className="text-xs text-muted-foreground">غير مقروءة</p>
                  </div>
                  <div className="rounded-xl border p-3 text-center">
                    <p className="text-2xl font-bold text-green-500">{stats.openConversations ?? 0}</p>
                    <p className="text-xs text-muted-foreground">محادثات مفتوحة</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
