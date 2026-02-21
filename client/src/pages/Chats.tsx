import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Search,
  Send,
  Archive,
  Trash2,
  Phone,
  User,
  ExternalLink,
  ChevronRight,
  CheckCheck,
  Clock,
  Bot,
  RefreshCw,
  Filter,
  MoreVertical,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

// ===== أنواع البيانات =====
type Chat = {
  id: number;
  accountId: string;
  phone: string;
  contactName: string | null;
  leadId: number | null;
  lastMessage: string | null;
  lastMessageAt: string | Date | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string | Date;
};

type ChatMessage = {
  id: number;
  chatId: number;
  direction: "outgoing" | "incoming";
  message: string;
  isAutoReply: boolean;
  status: "sent" | "delivered" | "read" | "failed";
  sentAt: string | Date;
};

// ===== مكون بطاقة المحادثة =====
function ChatCard({
  chat,
  isActive,
  onClick,
}: {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
}) {
  const timeStr = chat.lastMessageAt
    ? new Date(chat.lastMessageAt).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const dateStr = chat.lastMessageAt
    ? (() => {
        const d = new Date(chat.lastMessageAt);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return timeStr;
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return "أمس";
        return d.toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit" });
      })()
    : "";

  return (
    <button
      onClick={onClick}
      className={`w-full text-right p-3 rounded-lg transition-all border ${
        isActive
          ? "bg-primary/10 border-primary/30"
          : "bg-transparent border-transparent hover:bg-muted/30 hover:border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* أيقونة المحادثة */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {(chat.contactName || chat.phone).charAt(0).toUpperCase()}
        </div>

        {/* المعلومات */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-medium text-sm truncate">
              {chat.contactName || chat.phone}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">{dateStr}</span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {chat.lastMessage || "لا توجد رسائل"}
            </p>
            {chat.unreadCount > 0 && (
              <Badge className="h-5 min-w-5 text-xs px-1.5 flex-shrink-0 bg-green-500 hover:bg-green-500">
                {chat.unreadCount}
              </Badge>
            )}
          </div>
          {chat.leadId && (
            <span className="text-xs text-primary/60 mt-0.5 block">مرتبط بعميل</span>
          )}
        </div>
      </div>
    </button>
  );
}

// ===== مكون فقاعة الرسالة =====
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isOut = msg.direction === "outgoing";
  const time = new Date(msg.sentAt).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOut ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOut
            ? "bg-primary text-primary-foreground rounded-tl-sm"
            : "bg-muted text-foreground rounded-tr-sm"
        }`}
      >
        {msg.isAutoReply && (
          <div className={`flex items-center gap-1 text-xs mb-1 ${isOut ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            <Bot className="w-3 h-3" />
            <span>رد تلقائي</span>
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-start" : "justify-end"}`}>
          <span className={`text-xs ${isOut ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {time}
          </span>
          {isOut && (
            <span className={`text-xs ${msg.status === "read" ? "text-blue-300" : "text-primary-foreground/60"}`}>
              {msg.status === "sent" && <Clock className="w-3 h-3 inline" />}
              {msg.status === "delivered" && <CheckCheck className="w-3 h-3 inline" />}
              {msg.status === "read" && <CheckCheck className="w-3 h-3 inline" />}
              {msg.status === "failed" && <X className="w-3 h-3 inline text-red-400" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Chats() {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "archived">("all");
  const [newMessage, setNewMessage] = useState("");
  const [newChatPhone, setNewChatPhone] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ===== Queries =====
  const { data: chats = [], refetch: refetchChats } = trpc.waSettings.listChats.useQuery({
    accountId: "default",
    includeArchived: filterMode === "archived",
  });

  const { data: stats } = trpc.waSettings.getChatStats.useQuery({ accountId: "default" });

  const { data: messages = [], refetch: refetchMessages } = trpc.waSettings.getChatMessages.useQuery(
    { chatId: selectedChatId ?? 0 },
    { enabled: selectedChatId !== null && selectedChatId > 0, refetchInterval: selectedChatId !== null && selectedChatId > 0 ? 5000 : false }
  );

  // ===== Mutations =====
  const sendMessage = trpc.waSettings.sendChatMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
      refetchChats();
    },
    onError: (e) => toast.error("فشل الإرسال", { description: e.message }),
  });

  const markAsRead = trpc.waSettings.markChatAsRead.useMutation({
    onSuccess: () => refetchChats(),
  });

  const archiveChat = trpc.waSettings.archiveChat.useMutation({
    onSuccess: () => {
      refetchChats();
      setSelectedChatId(null);
      toast.success("تم الأرشفة");
    },
  });

  const deleteChat = trpc.waSettings.deleteChat.useMutation({
    onSuccess: () => {
      refetchChats();
      setSelectedChatId(null);
      toast.success("تم الحذف");
    },
  });

  // ===== تمرير للأسفل عند وصول رسائل جديدة =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ===== تعليم كمقروءة عند فتح المحادثة =====
  useEffect(() => {
    if (selectedChatId) {
      const chat = (chats as Chat[]).find((c) => c.id === selectedChatId);
      if (chat && chat.unreadCount > 0) {
        markAsRead.mutate({ chatId: selectedChatId });
      }
    }
  }, [selectedChatId]);

  // ===== فلترة المحادثات =====
  const filteredChats = (chats as Chat[]).filter((chat) => {
    if (filterMode === "unread") return chat.unreadCount > 0;
    if (filterMode === "archived") return chat.isArchived;
    return !chat.isArchived;
  }).filter((chat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      chat.contactName?.toLowerCase().includes(q) ||
      chat.phone.includes(q) ||
      chat.lastMessage?.toLowerCase().includes(q)
    );
  });

  const selectedChat = (chats as Chat[]).find((c) => c.id === selectedChatId);

  // ===== إرسال رسالة =====
  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedChat) return;
    sendMessage.mutate({
      chatId: selectedChat.id,
      accountId: "default",
      phone: selectedChat.phone,
      message: newMessage.trim(),
    });
  }, [newMessage, selectedChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ===== بدء محادثة جديدة =====
  const handleNewChat = () => {
    if (!newChatPhone.trim()) return;
    sendMessage.mutate(
      {
        accountId: "default",
        phone: newChatPhone.trim(),
        message: "مرحباً",
      },
      {
        onSuccess: (data) => {
          setSelectedChatId(data.chatId);
          setShowNewChat(false);
          setNewChatPhone("");
          refetchChats();
        },
      }
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      {/* رأس الصفحة */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold">المحادثات</h1>
          <p className="text-sm text-muted-foreground">
            {stats?.total ?? 0} محادثة · {stats?.unread ?? 0} غير مقروءة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchChats(); refetchMessages(); }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowNewChat(true)}>
            <MessageCircle className="w-4 h-4 ml-1" />
            محادثة جديدة
          </Button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== العمود الأيسر: قائمة المحادثات ===== */}
        <div className="w-80 flex-shrink-0 border-l border-border flex flex-col bg-card/30">

          {/* بحث وفلتر */}
          <div className="p-3 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المحادثات..."
                className="pr-9 h-9 text-sm"
              />
            </div>
            {/* أزرار الفلتر */}
            <div className="flex gap-1">
              {(["all", "unread", "archived"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                    filterMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {mode === "all" && `الكل (${stats?.total ?? 0})`}
                  {mode === "unread" && `غير مقروء (${stats?.unread ?? 0})`}
                  {mode === "archived" && `أرشيف (${stats?.archived ?? 0})`}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة المحادثات */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">
                    {searchQuery ? "لا نتائج للبحث" : "لا توجد محادثات بعد"}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <ChatCard
                    key={chat.id}
                    chat={chat}
                    isActive={selectedChatId === chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ===== العمود الأيمن: نافذة الشات ===== */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedChat ? (
            <>
              {/* رأس المحادثة */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-card/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {(selectedChat.contactName || selectedChat.phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">
                      {selectedChat.contactName || selectedChat.phone}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <span dir="ltr">{selectedChat.phone}</span>
                      {selectedChat.leadId && (
                        <>
                          <span>·</span>
                          <Link href={`/leads/${selectedChat.leadId}`}>
                            <span className="text-primary flex items-center gap-1 hover:underline cursor-pointer">
                              <User className="w-3 h-3" />
                              عرض العميل
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* خيارات المحادثة */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      const waUrl = `https://wa.me/${selectedChat.phone.replace(/\D/g, "")}`;
                      window.open(waUrl, "_blank");
                    }}
                    title="فتح في واتساب"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          archiveChat.mutate({
                            chatId: selectedChat.id,
                            archived: !selectedChat.isArchived,
                          })
                        }
                      >
                        <Archive className="w-4 h-4 ml-2" />
                        {selectedChat.isArchived ? "إلغاء الأرشفة" : "أرشفة"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("هل تريد حذف هذه المحادثة نهائياً؟")) {
                            deleteChat.mutate({ chatId: selectedChat.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف المحادثة
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* منطقة الرسائل */}
              <ScrollArea className="flex-1 px-4 py-4">
                {(messages as ChatMessage[]).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">لا توجد رسائل بعد</p>
                    <p className="text-xs mt-1">ابدأ المحادثة بإرسال رسالة</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* تجميع الرسائل حسب التاريخ */}
                    {(messages as ChatMessage[])
                      .slice()
                      .reverse()
                      .reduce((acc: { date: string; msgs: ChatMessage[] }[], msg) => {
                        const date = new Date(msg.sentAt).toLocaleDateString("ar-SA", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                        const last = acc[acc.length - 1];
                        if (!last || last.date !== date) {
                          acc.push({ date, msgs: [msg] });
                        } else {
                          last.msgs.push(msg);
                        }
                        return acc;
                      }, [])
                      .map((group) => (
                        <div key={group.date}>
                          {/* فاصل التاريخ */}
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                              {group.date}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          {group.msgs.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} />
                          ))}
                        </div>
                      ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* منطقة الإدخال */}
              <div className="px-4 py-3 border-t border-border flex-shrink-0 bg-card/20">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
                      className="min-h-[44px] max-h-32 resize-none text-sm py-2.5 pl-10"
                      rows={1}
                    />
                    <span className="absolute left-3 bottom-2.5 text-xs text-muted-foreground">
                      {newMessage.length > 0 && newMessage.length}
                    </span>
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="h-11 w-11 p-0 flex-shrink-0"
                  >
                    {sendMessage.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  الرسائل تُسجَّل في السجل فقط — للإرسال الفعلي استخدم{" "}
                  <Link href="/whatsapp">
                    <span className="text-primary hover:underline cursor-pointer">صفحة واتساب</span>
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* حالة عدم اختيار محادثة */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">سجل المحادثات</h3>
              <p className="text-sm text-center max-w-xs">
                اختر محادثة من القائمة لعرض سجل الرسائل، أو ابدأ محادثة جديدة
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowNewChat(true)}
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                بدء محادثة جديدة
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ===== نافذة محادثة جديدة ===== */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewChat(false)}>
          <div
            className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">محادثة جديدة</h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowNewChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم الهاتف</label>
                <Input
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="966501234567+"
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleNewChat}
                disabled={!newChatPhone.trim() || sendMessage.isPending}
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                بدء المحادثة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
