import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageCircle,
  Search,
  Send,
  Archive,
  Trash2,
  Phone,
  ExternalLink,
  CheckCheck,
  Clock,
  Bot,
  RefreshCw,
  X,
  Smartphone,
  MoreVertical,
  Circle,
  Paperclip,
  FileText,
  Download,
  Smile,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Copy,
  ThumbsUp,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

// ===== ألوان ثابتة لكل حساب واتساب =====
const ACCOUNT_COLORS = [
  { bg: "oklch(0.52 0.22 145)", light: "oklch(0.52 0.22 145 / 0.18)", border: "oklch(0.52 0.22 145 / 0.5)", text: "oklch(0.78 0.18 145)" },
  { bg: "oklch(0.52 0.22 260)", light: "oklch(0.52 0.22 260 / 0.18)", border: "oklch(0.52 0.22 260 / 0.5)", text: "oklch(0.78 0.18 260)" },
  { bg: "oklch(0.52 0.22 30)",  light: "oklch(0.52 0.22 30 / 0.18)",  border: "oklch(0.52 0.22 30 / 0.5)",  text: "oklch(0.78 0.18 30)"  },
  { bg: "oklch(0.52 0.22 320)", light: "oklch(0.52 0.22 320 / 0.18)", border: "oklch(0.52 0.22 320 / 0.5)", text: "oklch(0.78 0.18 320)" },
  { bg: "oklch(0.52 0.22 190)", light: "oklch(0.52 0.22 190 / 0.18)", border: "oklch(0.52 0.22 190 / 0.5)", text: "oklch(0.78 0.18 190)" },
  { bg: "oklch(0.52 0.22 60)",  light: "oklch(0.52 0.22 60 / 0.18)",  border: "oklch(0.52 0.22 60 / 0.5)",  text: "oklch(0.78 0.18 60)"  },
];

function getAccountColor(accountId: string) {
  let hash = 0;
  for (let i = 0; i < accountId.length; i++) hash = (hash * 31 + accountId.charCodeAt(i)) & 0xffffffff;
  return ACCOUNT_COLORS[Math.abs(hash) % ACCOUNT_COLORS.length];
}

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
  senderAccountLabel?: string;
  senderPhoneNumber?: string;
};

type ChatMessage = {
  id: number;
  chatId: number;
  accountId: string;
  direction: "outgoing" | "incoming";
  message: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
  isAutoReply: boolean;
  status: "sent" | "delivered" | "read" | "failed";
  sentAt: string | Date;
  senderAccountLabel?: string;
  senderPhoneNumber?: string;
};

// ===== مكون شارة الحساب =====
function AccountBadge({ accountId, label, phone }: { accountId: string; label?: string; phone?: string }) {
  const color = getAccountColor(accountId);
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
      style={{ background: color.light, borderColor: color.border, color: color.text }}
    >
      <Smartphone className="w-3 h-3" />
      {label || phone || accountId}
    </span>
  );
}

// ===== مكون بطاقة المحادثة =====
function ChatCard({ chat, isActive, onClick }: { chat: Chat; isActive: boolean; onClick: () => void }) {
  const color = getAccountColor(chat.accountId);
  const timeStr = chat.lastMessageAt
    ? new Date(chat.lastMessageAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
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
      className="w-full text-right p-3 rounded-xl transition-all border"
      style={
        isActive
          ? { background: "oklch(0.18 0.02 240)", borderColor: "oklch(0.4 0.15 240 / 0.4)" }
          : { background: "transparent", borderColor: "transparent" }
      }
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "oklch(0.14 0.015 240)"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div className="flex items-start gap-3">
        {/* أيقونة ملونة حسب الحساب */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold relative"
          style={{ background: color.light, border: `2px solid ${color.border}`, color: color.text }}
        >
          {(chat.contactName || chat.phone).charAt(0).toUpperCase()}
          {chat.unreadCount > 0 && (
            <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] flex items-center justify-center font-bold">
              {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
            </span>
          )}
        </div>
        {/* المعلومات */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="font-semibold text-sm truncate">
              {chat.contactName || chat.phone}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">{dateStr}</span>
          </div>
          <p className="text-xs text-muted-foreground/60 truncate" dir="ltr">{chat.phone}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {chat.lastMessage || "لا توجد رسائل"}
          </p>
          {/* شارة الحساب */}
          {chat.senderAccountLabel && (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full mt-1"
              style={{ background: color.light, color: color.text }}
            >
              <Smartphone className="w-2.5 h-2.5" />
              {chat.senderAccountLabel}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ===== مكون فقاعة الرسالة =====
function MessageBubble({ msg, showAccountBadge }: { msg: ChatMessage; showAccountBadge: boolean }) {
  const isOut = msg.direction === "outgoing";
  const time = new Date(msg.sentAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const color = getAccountColor(msg.accountId);

  return (
    <div className={`flex ${isOut ? "justify-start" : "justify-end"} mb-2`}>
      <div className={`max-w-[78%] flex flex-col ${isOut ? "items-start" : "items-end"}`}>
        {/* شارة الحساب المرسل */}
        {isOut && showAccountBadge && msg.senderAccountLabel && (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mb-1 font-medium"
            style={{ background: color.light, color: color.text, border: `1px solid ${color.border}` }}
          >
            <Smartphone className="w-2.5 h-2.5" />
            {msg.senderAccountLabel}
            {msg.senderPhoneNumber && msg.senderPhoneNumber !== msg.senderAccountLabel && (
              <span className="opacity-60 mr-1" dir="ltr">· {msg.senderPhoneNumber}</span>
            )}
          </span>
        )}
        <div
          className="rounded-2xl px-4 py-2.5 shadow-sm"
          style={
            isOut
              ? { background: color.bg, color: "white", borderBottomLeftRadius: "4px" }
              : { background: "oklch(0.2 0.015 240)", color: "var(--foreground)", borderBottomRightRadius: "4px" }
          }
        >
          {msg.isAutoReply && (
            <div className="flex items-center gap-1 text-xs mb-1 opacity-70">
              <Bot className="w-3 h-3" />
              <span>رد تلقائي</span>
            </div>
          )}
          {/* عرض الوسائط */}
          {msg.mediaUrl && (
            <div className="mb-2">
              {msg.mediaType === "image" ? (
                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={msg.mediaUrl}
                    alt={msg.mediaFilename || "صورة"}
                    className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : msg.mediaType === "video" ? (
                <video src={msg.mediaUrl} controls className="max-w-full rounded-xl max-h-64" />
              ) : msg.mediaType === "audio" ? (
                <audio src={msg.mediaUrl} controls className="w-full" />
              ) : (
                <a
                  href={msg.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
                >
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm truncate">{msg.mediaFilename || "ملف"}</span>
                  <Download className="w-4 h-4 flex-shrink-0 opacity-60" />
                </a>
              )}
            </div>
          )}
          {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>}
          <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-start" : "justify-end"}`}>
            <span className="text-xs opacity-60">{time}</span>
            {isOut && (
              <span className="text-xs opacity-70">
                {msg.status === "sent" && <Clock className="w-3 h-3 inline" />}
                {(msg.status === "delivered" || msg.status === "read") && <CheckCheck className="w-3 h-3 inline" />}
                {msg.status === "failed" && <X className="w-3 h-3 inline text-red-400" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Chats() {
  // قراءة query parameters لفتح محادثة محددة
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const phoneFromUrl = urlParams.get("phone") || "";
  const nameFromUrl = urlParams.get("name") || "";

  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread" | "archived">("all");
  const [newMessage, setNewMessage] = useState("");
  const [newChatPhone, setNewChatPhone] = useState(phoneFromUrl);
  const [newChatName, setNewChatName] = useState(nameFromUrl);
  const [showNewChat, setShowNewChat] = useState(!!phoneFromUrl);
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [liveDot, setLiveDot] = useState(true);
  // وسائط مرفوعة
  const [pendingMedia, setPendingMedia] = useState<{ base64: string; mimetype: string; filename: string; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // AI Panel
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiIntent, setAiIntent] = useState<{ intent: string; urgency: string; sentiment: string; suggestedAction: string; interestScore: number } | null>(null);
  const [aiTone, setAiTone] = useState<"formal" | "friendly" | "direct">("friendly");
  // إيموجي
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // تسجيل صوتي
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== Queries مع polling تلقائي =====
  const { data: chats = [] } = trpc.waSettings.listChats.useQuery(
    { accountId: selectedAccountId, includeArchived: filterMode === "archived" },
    { refetchInterval: 3000 }
  );
  const { data: stats } = trpc.waSettings.getChatStats.useQuery(
    { accountId: "all" },
    { refetchInterval: 5000 }
  );
  const { data: messages = [] } = trpc.waSettings.getChatMessages.useQuery(
    { chatId: selectedChatId ?? 0 },
    {
      enabled: selectedChatId !== null && selectedChatId > 0,
      refetchInterval: selectedChatId !== null && selectedChatId > 0 ? 2000 : false,
    }
  );
  const { data: waAccounts = [] } = trpc.waAccounts.listAccounts.useQuery();
  const utils = trpc.useUtils();

  // ===== Mutations =====
  const sendMessage = trpc.waSettings.sendChatMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
      // إعادة جلب الرسائل فوراً
      utils.waSettings.getChatMessages.invalidate({ chatId: selectedChatId ?? 0 });
      utils.waSettings.listChats.invalidate();
    },
    onError: (err) => toast.error("فشل الإرسال", { description: err.message }),
  });
  const archiveChat = trpc.waSettings.archiveChat.useMutation();
  const deleteChat = trpc.waSettings.deleteChat.useMutation({
    onSuccess: () => { setSelectedChatId(null); toast.success("تم حذف المحادثة"); },
  });
  const markAsRead = trpc.waSettings.markChatAsRead.useMutation();
  const suggestAiReply = trpc.waSettings.suggestAiReply.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
      if (data.intentAnalysis) setAiIntent(data.intentAnalysis as typeof aiIntent);
      setShowAiPanel(true);
    },
    onError: () => toast.error("تعذر جلب اقتراحات AI"),
  });

  // ===== دوال التسجيل الصوتي =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          setPendingMedia({ base64, mimetype: "audio/webm", filename: "رسالة-صوتية.webm", previewUrl: URL.createObjectURL(blob) });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingTime(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error("تعذر الوصول للمايكروفون");
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); };

  // ===== المحادثة المختارة =====
  const selectedChat = (chats as Chat[]).find((c) => c.id === selectedChatId) ?? null;

  // ===== فلترة المحادثات =====
  const filteredChats = useMemo(() => {
    return (chats as Chat[]).filter((c) => {
      if (filterMode === "unread") return c.unreadCount > 0;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        (c.contactName?.toLowerCase().includes(q) ?? false) ||
        c.phone.includes(q) ||
        (c.lastMessage?.toLowerCase().includes(q) ?? false) ||
        (c.senderAccountLabel?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [chats, filterMode, searchQuery]);

  // ===== ترتيب الرسائل من الأقدم للأحدث =====
  const sortedMessages = useMemo(() => {
    return [...(messages as ChatMessage[])].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  }, [messages]);

  // ===== تجميع الرسائل بالتاريخ =====
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: ChatMessage[] }[] = [];
    let currentDate = "";
    for (const msg of sortedMessages) {
      const d = new Date(msg.sentAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      let dateLabel = d.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });
      if (d.toDateString() === today.toDateString()) dateLabel = "اليوم";
      else if (d.toDateString() === yesterday.toDateString()) dateLabel = "أمس";
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ date: dateLabel, msgs: [] });
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [sortedMessages]);

  // ===== هل هناك حسابات متعددة في الرسائل؟ =====
  const hasMultipleAccounts = useMemo(() => {
    const ids = new Set(sortedMessages.filter(m => m.direction === "outgoing").map(m => m.accountId));
    return ids.size > 1;
  }, [sortedMessages]);

  // ===== تمرير للأسفل عند رسائل جديدة =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages.length]);

  // ===== تعليم كمقروء عند فتح المحادثة =====
  useEffect(() => {
    if (selectedChatId && selectedChat?.unreadCount && selectedChat.unreadCount > 0) {
      markAsRead.mutate({ chatId: selectedChatId });
    }
  }, [selectedChatId]);

  // ===== نبض المؤشر الحي =====
  useEffect(() => {
    const t = setInterval(() => setLiveDot(p => !p), 1500);
    return () => clearInterval(t);
  }, []);

  // ===== اختيار ملف =====
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // حد الحجم: 16MB
    if (file.size > 16 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً", { description: "الحد الأقصى 16MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      const previewUrl = result;
      setPendingMedia({ base64, mimetype: file.type, filename: file.name, previewUrl });
    };
    reader.readAsDataURL(file);
    // إعادة تعيين القيمة للسماح باختيار نفس الملف مرة ثانية
    e.target.value = "";
  };

  // ===== إرسال رسالة =====
  const handleSend = () => {
    if (!selectedChat) return;
    if (!newMessage.trim() && !pendingMedia) return;
    if (pendingMedia) {
      sendMessage.mutate({
        chatId: selectedChat.id,
        accountId: selectedChat.accountId,
        phone: selectedChat.phone,
        message: newMessage.trim(),
        mediaBase64: pendingMedia.base64,
        mimetype: pendingMedia.mimetype,
        mediaFilename: pendingMedia.filename,
      }, {
        onSuccess: () => setPendingMedia(null),
      });
    } else {
      sendMessage.mutate({
        chatId: selectedChat.id,
        accountId: selectedChat.accountId,
        phone: selectedChat.phone,
        message: newMessage.trim(),
      });
    }
  };

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
      { accountId: "default", phone: newChatPhone.trim(), contactName: newChatName.trim() || undefined, message: "مرحباً" },
      {
        onSuccess: (data) => {
          setSelectedChatId(data.chatId);
          setShowNewChat(false);
          setNewChatPhone("");
          setNewChatName("");
        },
      }
    );
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col" dir="rtl">
      {/* رأس الصفحة */}
      <div
        className="px-5 py-3 border-b border-border/60 flex items-center justify-between flex-shrink-0"
        style={{ background: "oklch(0.12 0.015 240)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            المحادثات
          </h1>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Circle
              className="w-2 h-2 fill-green-500 text-green-500"
              style={{ opacity: liveDot ? 1 : 0.3, transition: "opacity 0.5s" }}
            />
            مباشر · {stats?.total ?? 0} محادثة · {stats?.unread ?? 0} غير مقروءة
          </span>
        </div>
        <div className="flex items-center gap-2">
          {waAccounts.length > 1 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="text-xs bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-foreground"
            >
              <option value="all">كل الحسابات</option>
              {waAccounts.map(acc => (
                <option key={acc.accountId} value={acc.accountId}>{acc.label}</option>
              ))}
            </select>
          )}
          <Button size="sm" onClick={() => setShowNewChat(true)} className="gap-1.5 text-xs h-8">
            <MessageCircle className="w-3.5 h-3.5" />
            محادثة جديدة
          </Button>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== العمود الأيسر: قائمة المحادثات ===== */}
        <div
          className="w-72 flex-shrink-0 border-l border-border/50 flex flex-col"
          style={{ background: "oklch(0.11 0.015 240)" }}
        >
          {/* بحث وفلتر */}
          <div className="p-3 space-y-2 border-b border-border/40">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="pr-8 h-8 text-xs"
                style={{ background: "oklch(0.16 0.015 240)" }}
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread", "archived"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                    filterMode === mode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {mode === "all" && `الكل (${stats?.total ?? 0})`}
                  {mode === "unread" && `غير مقروء (${stats?.unread ?? 0})`}
                  {mode === "archived" && `أرشيف`}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة المحادثات */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredChats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">{searchQuery ? "لا نتائج" : "لا توجد محادثات"}</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <ChatCard
                    key={chat.id}
                    chat={chat as Chat}
                    isActive={selectedChatId === chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* مفتاح الأرقام في الأسفل */}
          {waAccounts.length > 0 && (
            <div className="p-3 border-t border-border/40 space-y-1.5">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">أرقام الاستقبال</p>
              {waAccounts.map(acc => {
                const c = getAccountColor(acc.accountId);
                return (
                  <div key={acc.accountId} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.bg }} />
                    <span className="text-xs text-muted-foreground truncate flex-1">{acc.label}</span>
                    <span className="text-[10px] text-muted-foreground/40 flex-shrink-0" dir="ltr">{acc.phoneNumber}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== العمود الأيمن: نافذة الشات ===== */}
        <div
          className="flex-1 flex flex-col overflow-hidden"
          style={{ background: "oklch(0.09 0.01 240)" }}
        >
          {selectedChat ? (
            <>
              {/* رأس المحادثة */}
              <div
                className="px-4 py-3 border-b border-border/50 flex items-center justify-between flex-shrink-0"
                style={{ background: "oklch(0.12 0.015 240)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: getAccountColor(selectedChat.accountId).light,
                      border: `2px solid ${getAccountColor(selectedChat.accountId).border}`,
                      color: getAccountColor(selectedChat.accountId).text,
                    }}
                  >
                    {(selectedChat.contactName || selectedChat.phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedChat.contactName || selectedChat.phone}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1" dir="ltr">
                        <Phone className="w-3 h-3" />
                        {selectedChat.phone}
                      </span>
                      <AccountBadge
                        accountId={selectedChat.accountId}
                        label={selectedChat.senderAccountLabel}
                        phone={selectedChat.senderPhoneNumber}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedChat.leadId && (
                    <Link href={`/leads/${selectedChat.leadId}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        العميل
                      </Button>
                    </Link>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => archiveChat.mutate({ chatId: selectedChat.id, archived: !selectedChat.isArchived })}>
                        <Archive className="w-4 h-4 ml-2" />
                        {selectedChat.isArchived ? "إلغاء الأرشفة" : "أرشفة"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => { if (confirm("هل تريد حذف هذه المحادثة؟")) deleteChat.mutate({ chatId: selectedChat.id }); }}
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        حذف المحادثة
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* منطقة الرسائل */}
              <ScrollArea className="flex-1 px-4 py-3">
                {sortedMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
                    <MessageCircle className="w-12 h-12 mb-3 opacity-15" />
                    <p className="text-sm">لا توجد رسائل بعد</p>
                    <p className="text-xs mt-1 opacity-50">ابدأ المحادثة بكتابة رسالة أدناه</p>
                  </div>
                ) : (
                  <>
                    {groupedMessages.map((group) => (
                      <div key={group.date}>
                        {/* فاصل التاريخ */}
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px bg-border/30" />
                          <span
                            className="text-xs text-muted-foreground px-3 py-0.5 rounded-full border border-border/30"
                            style={{ background: "oklch(0.14 0.015 240)" }}
                          >
                            {group.date}
                          </span>
                          <div className="flex-1 h-px bg-border/30" />
                        </div>
                        {group.msgs.map((msg, idx) => {
                          const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                          // إظهار شارة الحساب عند أول رسالة صادرة أو عند تغيير الحساب
                          const showBadge = msg.direction === "outgoing" && (
                            hasMultipleAccounts
                              ? (!prevMsg || prevMsg.accountId !== msg.accountId || prevMsg.direction !== "outgoing")
                              : idx === 0
                          );
                          return (
                            <MessageBubble key={msg.id} msg={msg} showAccountBadge={showBadge} />
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </ScrollArea>

              {/* منطقة الإدخال */}
              <div
                className="px-4 py-3 border-t border-border/50 flex-shrink-0 relative"
                style={{ background: "oklch(0.12 0.015 240)" }}
              >
                {/* شارة الإرسال */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">الإرسال عبر:</span>
                  <AccountBadge
                    accountId={selectedChat.accountId}
                    label={selectedChat.senderAccountLabel}
                    phone={selectedChat.senderPhoneNumber}
                  />
                </div>
                {/* معاينة الوسائط قبل الإرسال */}
                {pendingMedia && (
                  <div
                    className="flex items-center gap-2 mb-2 p-2 rounded-xl border"
                    style={{ background: "oklch(0.16 0.015 240)", borderColor: "oklch(0.3 0.02 240)" }}
                  >
                    {pendingMedia.mimetype.startsWith("image") ? (
                      <img src={pendingMedia.previewUrl} alt="معاينة" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{pendingMedia.filename}</p>
                      <p className="text-xs text-muted-foreground">{pendingMedia.mimetype}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 flex-shrink-0"
                      onClick={() => setPendingMedia(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {/* لوحة AI */}
                {showAiPanel && (
                  <div
                    className="mb-2 rounded-xl border p-3"
                    style={{ background: "oklch(0.14 0.025 260)", borderColor: "oklch(0.3 0.08 260 / 0.5)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" style={{ color: "oklch(0.75 0.2 260)" }} />
                        <span className="text-xs font-semibold" style={{ color: "oklch(0.75 0.2 260)" }}>اقتراحات AI</span>
                        {aiIntent && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "oklch(0.2 0.05 260)", color: "oklch(0.7 0.15 260)" }}>
                            {aiIntent.interestScore}% اهتمام
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value as "formal" | "friendly" | "direct")}
                          className="text-xs rounded-lg px-2 py-1 border"
                          style={{ background: "oklch(0.18 0.02 240)", borderColor: "oklch(0.3 0.02 240)", color: "var(--foreground)" }}
                        >
                          <option value="friendly">ودي</option>
                          <option value="formal">رسمي</option>
                          <option value="direct">مباشر</option>
                        </select>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowAiPanel(false)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    {aiIntent && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {aiIntent.intent === "price_inquiry" ? "سؤال سعر" : aiIntent.intent === "purchase_intent" ? "نية شراء" : aiIntent.intent === "complaint" ? "شكوى" : aiIntent.intent === "follow_up" ? "متابعة" : "استفسار"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${aiIntent.urgency === "high" ? "bg-red-500/20 text-red-400" : aiIntent.urgency === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                          {aiIntent.urgency === "high" ? "عاجل" : aiIntent.urgency === "medium" ? "متوسط" : "منخفض"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${aiIntent.sentiment === "positive" ? "bg-green-500/20 text-green-400" : aiIntent.sentiment === "negative" ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"}`}>
                          {aiIntent.sentiment === "positive" ? "إيجابي" : aiIntent.sentiment === "negative" ? "سلبي" : "محايد"}
                        </span>
                        {aiIntent.suggestedAction && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">→ {aiIntent.suggestedAction}</span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          className="text-right text-sm px-3 py-2 rounded-lg border transition-all hover:opacity-90"
                          style={{ background: "oklch(0.18 0.03 260)", borderColor: "oklch(0.35 0.1 260 / 0.4)", color: "var(--foreground)" }}
                          onClick={() => { setNewMessage(s); setShowAiPanel(false); textareaRef.current?.focus(); }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs opacity-50 flex-shrink-0 mt-0.5">{i + 1}.</span>
                            <span>{s}</span>
                            <Copy className="w-3 h-3 opacity-40 flex-shrink-0 mt-0.5 mr-auto" />
                          </div>
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs h-7"
                      onClick={() => selectedChatId && suggestAiReply.mutate({ chatId: selectedChatId, tone: aiTone })}
                      disabled={suggestAiReply.isPending}
                    >
                      {suggestAiReply.isPending ? <RefreshCw className="w-3 h-3 animate-spin ml-1" /> : <RefreshCw className="w-3 h-3 ml-1" />}
                      تحديث الاقتراحات
                    </Button>
                  </div>
                )}
                {/* إيموجي picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 left-0 z-50">
                    <EmojiPicker
                      theme={Theme.DARK}
                      onEmojiClick={(data: EmojiClickData) => {
                        setNewMessage(prev => prev + data.emoji);
                        setShowEmojiPicker(false);
                        textareaRef.current?.focus();
                      }}
                      height={350}
                      width={300}
                    />
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* زر رفع ملف */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 p-0 flex-shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    title="إرفاق ملف أو صورة"
                    style={{ color: getAccountColor(selectedChat.accountId).text }}
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  {/* زر الإيموجي */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 p-0 flex-shrink-0"
                    onClick={() => setShowEmojiPicker(p => !p)}
                    title="إيموجي"
                    style={{ color: showEmojiPicker ? getAccountColor(selectedChat.accountId).text : undefined }}
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                  {/* زر AI */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 p-0 flex-shrink-0"
                    onClick={() => selectedChatId && suggestAiReply.mutate({ chatId: selectedChatId, tone: aiTone })}
                    disabled={suggestAiReply.isPending}
                    title="اقتراح AI"
                    style={{ color: showAiPanel ? "oklch(0.75 0.2 260)" : undefined }}
                  >
                    {suggestAiReply.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isRecording ? "جاري التسجيل..." : pendingMedia ? "تعليق على الملف (اختياري)..." : "اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"}
                    className="flex-1 min-h-[44px] max-h-32 resize-none text-sm py-2.5"
                    rows={1}
                    disabled={isRecording}
                    style={{ background: "oklch(0.16 0.015 240)", borderColor: isRecording ? "oklch(0.6 0.2 0)" : "oklch(0.25 0.02 240)" }}
                  />
                  {/* زر التسجيل الصوتي */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-11 w-11 p-0 flex-shrink-0"
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
                    style={{ color: isRecording ? "oklch(0.65 0.25 0)" : undefined }}
                  >
                    {isRecording ? (
                      <div className="flex flex-col items-center">
                        <MicOff className="w-4 h-4" />
                        <span className="text-[9px]">{recordingTime}s</span>
                      </div>
                    ) : <Mic className="w-5 h-5" />}
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={(!newMessage.trim() && !pendingMedia) || sendMessage.isPending}
                    className="h-11 w-11 p-0 flex-shrink-0"
                    style={{ background: getAccountColor(selectedChat.accountId).bg }}
                  >
                    {sendMessage.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/40 mt-1.5 text-center">
                  يتحدث تلقائياً كل ثانيتين · للإرسال الفعلي تأكد من ربط{" "}
                  <Link href="/whatsapp">
                    <span className="text-primary/60 hover:text-primary cursor-pointer">صفحة واتساب</span>
                  </Link>
                </p>
              </div>
            </>
          ) : (
            /* حالة عدم اختيار محادثة */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
                style={{ background: "oklch(0.15 0.02 240)" }}
              >
                <MessageCircle className="w-12 h-12 opacity-15" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">صندوق الوارد</h3>
              <p className="text-sm text-center max-w-xs opacity-50 mb-1">اختر محادثة لعرض الرسائل</p>
              <p className="text-xs text-center max-w-xs opacity-30 mb-5">يتحدث تلقائياً كل ثانيتين</p>
              {waAccounts.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-sm mb-4">
                  {waAccounts.map(acc => (
                    <AccountBadge key={acc.accountId} accountId={acc.accountId} label={acc.label} phone={acc.phoneNumber} />
                  ))}
                </div>
              )}
              <Button variant="outline" onClick={() => setShowNewChat(true)}>
                <MessageCircle className="w-4 h-4 ml-2" />
                بدء محادثة جديدة
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ===== نافذة محادثة جديدة ===== */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewChat(false)}>
          <div
            className="border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ background: "oklch(0.14 0.015 240)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                محادثة جديدة
              </h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowNewChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">اسم العميل (اختياري)</label>
                <Input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="اسم العميل أو اسم الشركة"
                  style={{ background: "oklch(0.18 0.015 240)" }}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">رقم الهاتف</label>
                <Input
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="+966501234567"
                  dir="ltr"
                  className="text-left"
                  style={{ background: "oklch(0.18 0.015 240)" }}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleNewChat}
                disabled={!newChatPhone.trim() || sendMessage.isPending}
              >
                {sendMessage.isPending ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <MessageCircle className="w-4 h-4 ml-2" />}
                بدء المحادثة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
