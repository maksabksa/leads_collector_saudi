import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Search, Send, Archive, Trash2, Phone, ExternalLink,
  CheckCheck, Clock, Bot, RefreshCw, X, Smartphone, MoreVertical,
  Paperclip, FileText, Download, Smile, Mic, MicOff, Sparkles,
  Copy, Plus, Check, Zap, ChevronDown, UserPlus, BarChart2, AlertTriangle, TrendingUp,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";

// ===== ألوان الحسابات =====
const ACCOUNT_COLORS = [
  { bg: "#25D366", light: "rgba(37,211,102,0.15)", border: "rgba(37,211,102,0.4)", text: "#25D366" },
  { bg: "#128C7E", light: "rgba(18,140,126,0.15)", border: "rgba(18,140,126,0.4)", text: "#4ecdc4" },
  { bg: "#075E54", light: "rgba(7,94,84,0.15)",    border: "rgba(7,94,84,0.4)",    text: "#25D366" },
  { bg: "#34B7F1", light: "rgba(52,183,241,0.15)", border: "rgba(52,183,241,0.4)", text: "#34B7F1" },
  { bg: "#9B59B6", light: "rgba(155,89,182,0.15)", border: "rgba(155,89,182,0.4)", text: "#c39bd3" },
  { bg: "#E67E22", light: "rgba(230,126,34,0.15)", border: "rgba(230,126,34,0.4)", text: "#f0a55a" },
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
  aiAutoReplyEnabled: boolean;
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

// ===== عرض اسم جهة الاتصال بأولوية: اسم واتساب > اسم Lead > رقم الهاتف =====
function getDisplayName(chat: Chat): string {
  if (chat.contactName && chat.contactName.trim()) return chat.contactName.trim();
  return chat.phone;
}

// ===== مكوّن بطاقة المحادثة =====
function ChatCard({ chat, isActive, onClick }: { chat: Chat; isActive: boolean; onClick: () => void }) {
  const color = getAccountColor(chat.accountId);
  const now = new Date();
  const msgDate = chat.lastMessageAt ? new Date(chat.lastMessageAt) : null;
  let timeLabel = "";
  if (msgDate) {
    const isToday = msgDate.toDateString() === now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (isToday) timeLabel = msgDate.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    else if (msgDate.toDateString() === yesterday.toDateString()) timeLabel = "أمس";
    else timeLabel = msgDate.toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit" });
  }
  const displayName = getDisplayName(chat);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="w-full text-right px-3 py-2.5 transition-colors border-b border-white/5"
      style={isActive ? { background: "rgba(255,255,255,0.08)" } : {}}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: color.light, border: `2px solid ${color.border}`, color: color.text }}
          >
            {initials}
          </div>
          {chat.aiAutoReplyEnabled && (
            <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center border-2 border-[#111b21]">
              <Bot className="w-2 h-2 text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="font-semibold text-sm text-white truncate">{displayName}</span>
            <span className="text-xs text-[#8696a0] flex-shrink-0">{timeLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs text-[#8696a0] truncate flex-1">{chat.lastMessage || "لا توجد رسائل"}</p>
            {chat.unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center px-1">
                {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ===== مكوّن فقاعة الرسالة (تصميم واتساب) =====
function MessageBubble({ msg, showSenderBadge }: { msg: ChatMessage; showSenderBadge: boolean }) {
  const isOut = msg.direction === "outgoing";
  const time = new Date(msg.sentAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const date = new Date(msg.sentAt).toLocaleDateString("ar-SA", { day: "2-digit", month: "2-digit", year: "2-digit" });

  return (
    <div className={`flex mb-1 ${isOut ? "justify-end" : "justify-start"} px-3`}>
      <div className="max-w-[72%] relative">
        {isOut && showSenderBadge && msg.senderAccountLabel && (
          <div className="flex justify-end mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}>
              <Smartphone className="w-2.5 h-2.5" />
              <span className="font-medium">{msg.senderAccountLabel}</span>
              {msg.senderPhoneNumber && msg.senderPhoneNumber !== msg.senderAccountLabel && (
                <span className="text-[#8696a0]">· {msg.senderPhoneNumber}</span>
              )}
            </span>
          </div>
        )}
        <div
          className="rounded-lg px-3 py-2 shadow-sm relative"
          style={
            isOut
              ? { background: "#005c4b", borderRadius: "8px 0px 8px 8px" }
              : { background: "#202c33", borderRadius: "0px 8px 8px 8px" }
          }
        >
          {/* ذيل الفقاعة */}
          <div
            className="absolute top-0 w-0 h-0"
            style={
              isOut
                ? { right: "-8px", borderLeft: "8px solid #005c4b", borderBottom: "8px solid transparent" }
                : { left: "-8px", borderRight: "8px solid #202c33", borderBottom: "8px solid transparent" }
            }
          />
          {msg.isAutoReply && (
            <div className="flex items-center gap-1 text-[10px] mb-1 text-[#25D366]">
              <Bot className="w-2.5 h-2.5" />
              <span>رد تلقائي AI</span>
            </div>
          )}
          {msg.mediaUrl && (
            <div className="mb-2">
              {msg.mediaType === "image" ? (
                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                  <img src={msg.mediaUrl} alt={msg.mediaFilename || "صورة"} className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer" />
                </a>
              ) : msg.mediaType === "video" ? (
                <video src={msg.mediaUrl} controls className="max-w-full rounded-lg max-h-64" />
              ) : msg.mediaType === "audio" ? (
                <audio src={msg.mediaUrl} controls className="w-full" />
              ) : (
                <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <FileText className="w-5 h-5 flex-shrink-0 text-[#25D366]" />
                  <span className="text-sm truncate text-white">{msg.mediaFilename || "ملف"}</span>
                  <Download className="w-4 h-4 flex-shrink-0 text-[#8696a0]" />
                </a>
              )}
            </div>
          )}
          {msg.message && <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">{msg.message}</p>}
          <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-start"}`}>
            <span className="text-[11px] text-[#8696a0]" title={`${date} • ${time}`}>{time}</span>
            {isOut && (
              <span className="text-[11px]">
                {msg.status === "sent" && <Check className="w-3 h-3 text-[#8696a0] inline" />}
                {msg.status === "delivered" && <CheckCheck className="w-3 h-3 text-[#8696a0] inline" />}
                {msg.status === "read" && <CheckCheck className="w-3 h-3 text-[#53bdeb] inline" />}
                {msg.status === "failed" && <X className="w-3 h-3 text-red-400 inline" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== مكوّن مفتاح AI =====
function AiToggle({
  enabled, loading, label, onClick, size = "md",
}: {
  enabled: boolean; loading?: boolean; label: string; onClick: () => void; size?: "sm" | "md";
}) {
  const isSmall = size === "sm";
  return (
    <div
      className="flex items-center gap-1.5 rounded-full border cursor-pointer transition-all select-none"
      style={{
        padding: isSmall ? "4px 10px" : "6px 12px",
        background: enabled ? "rgba(37,211,102,0.15)" : "rgba(255,255,255,0.05)",
        borderColor: enabled ? "rgba(37,211,102,0.5)" : "rgba(255,255,255,0.15)",
      }}
      onClick={onClick}
    >
      {loading ? (
        <RefreshCw className={`${isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} animate-spin text-[#25D366]`} />
      ) : (
        <Bot className={`${isSmall ? "w-3 h-3" : "w-3.5 h-3.5"}`} style={{ color: enabled ? "#25D366" : "#8696a0" }} />
      )}
      <span className={`${isSmall ? "text-[11px]" : "text-xs"} font-medium`} style={{ color: enabled ? "#25D366" : "#8696a0" }}>
        {label}
      </span>
      <div
        className="rounded-full transition-all relative flex-shrink-0"
        style={{
          width: isSmall ? "26px" : "30px",
          height: isSmall ? "14px" : "16px",
          background: enabled ? "#25D366" : "#374151",
        }}
      >
        <div
          className="absolute top-0.5 rounded-full bg-white transition-all"
          style={{
            width: isSmall ? "10px" : "12px",
            height: isSmall ? "10px" : "12px",
            left: enabled ? (isSmall ? "14px" : "16px") : "2px",
          }}
        />
      </div>
    </div>
  );
}

// ===== الصفحة الرئيسية =====
export default function Chats() {
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
  const [pendingMedia, setPendingMedia] = useState<{ base64: string; mimetype: string; filename: string; previewUrl: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  // ===== حالة AI =====
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiIntent, setAiIntent] = useState<{ intent: string; urgency: string; sentiment: string; suggestedAction: string; interestScore: number } | null>(null);
  const [aiTone, setAiTone] = useState<"formal" | "friendly" | "direct">("friendly");
  const [globalAiEnabled, setGlobalAiEnabled] = useState(false);
  const [globalAiLoading, setGlobalAiLoading] = useState(false);
  const [chatAiLoading, setChatAiLoading] = useState(false);
  const [aiEditedReply, setAiEditedReply] = useState(""); // الرد المختار/المعدَّل

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ===== جلب البيانات =====
  const { data: chats = [], refetch: refetchChats } = trpc.waSettings.listChats.useQuery(
    { accountId: selectedAccountId, includeArchived: filterMode === "archived" },
    { refetchInterval: 2000 }
  );
  const { data: messages = [], refetch: refetchMessages } = trpc.waSettings.getChatMessages.useQuery(
    { chatId: selectedChatId! },
    { enabled: selectedChatId !== null && selectedChatId > 0, refetchInterval: 2000 }
  );
  const { data: stats } = trpc.waSettings.getChatStats.useQuery({ accountId: "all" }, { refetchInterval: 5000 });
  const { data: waAccounts = [] } = trpc.waAccounts.listAccounts.useQuery();
  const { data: aiSettingsData } = trpc.aiConfig.getSettings.useQuery();

  useEffect(() => {
    if (aiSettingsData) setGlobalAiEnabled(aiSettingsData.globalAutoReplyEnabled ?? false);
  }, [aiSettingsData]);

  // ===== Mutations =====
  const sendMessage = trpc.waSettings.sendChatMessage.useMutation({
    onSuccess: () => { setNewMessage(""); setPendingMedia(null); refetchMessages(); refetchChats(); },
    onError: (e) => toast.error("فشل الإرسال", { description: e.message }),
  });
  const markAsRead = trpc.waSettings.markChatAsRead.useMutation({ onSuccess: () => refetchChats() });
  const archiveChat = trpc.waSettings.archiveChat.useMutation({ onSuccess: () => { refetchChats(); setSelectedChatId(null); } });
  const deleteChat = trpc.waSettings.deleteChat.useMutation({ onSuccess: () => { refetchChats(); setSelectedChatId(null); } });
  const assignChat = trpc.waSettings.assignChatToEmployee.useMutation({
    onSuccess: () => { toast.success("تم تعيين المحادثة"); refetchChats(); setShowAssignModal(false); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const closeChat = trpc.waSettings.closeChat.useMutation({
    onSuccess: () => { toast.success("تم إغلاق المحادثة"); refetchChats(); },
    onError: (e) => toast.error("خطأ", { description: e.message }),
  });
  const analyzeChat = trpc.waSettings.analyzeChatWithAI.useMutation({
    onSuccess: (data) => {
      toast.success("تحليل AI", { description: data.summary });
      setAiAnalysisResult(data);
      setShowAiAnalysis(true);
    },
    onError: (e) => toast.error("خطأ في التحليل", { description: e.message }),
  });
  const { data: employeeList = [] } = trpc.waSettings.getEmployeeList.useQuery();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    sentiment: string; opportunityMissed: boolean; weakPoints: string[];
    strengths: string[]; missedOpportunities: string[]; recommendations: string[];
    summary: string; closingProbability: number;
  } | null>(null);

  // ===== AI: توليد رد بقاعدة المعرفة RAG =====
  const suggestAiReply = trpc.ragKnowledge.generateRagReply.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data.suggestions);
      setAiIntent(data.intentAnalysis);
      setAiEditedReply(data.suggestions[0] || "");
      setShowAiPanel(true);
      if (data.ragContext && data.ragContext.length > 0) {
        toast.success("تحسين بقاعدة المعرفة", { description: `${data.ragContext.length} مصدر معلومات` });
      }
    },
    onError: (e) => toast.error("خطأ في AI", { description: e.message }),
  });

  // تحكم AI لكل محادثة
  const setChatAutoReply = trpc.aiConfig.setChatAutoReply.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.enabled ? "تم تفعيل الرد التلقائي AI" : "تم إيقاف الرد التلقائي AI");
      refetchChats();
      setChatAiLoading(false);
    },
    onError: (e) => { toast.error("خطأ", { description: e.message }); setChatAiLoading(false); },
  });

  // تحكم AI الإجمالي
  const setGlobalAutoReply = trpc.aiConfig.setGlobalAutoReply.useMutation({
    onSuccess: (_, vars) => { setGlobalAiEnabled(vars.enabled); setGlobalAiLoading(false); },
    onError: (e) => { toast.error("خطأ", { description: e.message }); setGlobalAiLoading(false); },
  });

  const setBulkChatAutoReply = trpc.aiConfig.setBulkChatAutoReply.useMutation({
    onSuccess: (data, vars) => {
      toast.success(`${vars.enabled ? "تفعيل" : "إيقاف"} AI لـ ${data.updatedCount} محادثة`);
      refetchChats();
    },
  });

  // ===== المحادثة المختارة =====
  const selectedChat = useMemo(() => (chats as Chat[]).find(c => c.id === selectedChatId), [chats, selectedChatId]);

  // ===== فلترة المحادثات =====
  const filteredChats = useMemo(() => {
    let list = chats as Chat[];
    if (filterMode === "unread") list = list.filter(c => c.unreadCount > 0);
    // فلتر حسب الحساب (الرقم المُرسِل) - يعمل فقط عند تحديد حساب معين غير "all"
    if (selectedAccountId !== "all") {
      list = list.filter(c => c.accountId === selectedAccountId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        getDisplayName(c).toLowerCase().includes(q) || c.phone.includes(q) || (c.lastMessage || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [chats, filterMode, searchQuery, selectedAccountId]);

  // ===== ترتيب وتجميع الرسائل =====
  const sortedMessages = useMemo(() =>
    [...(messages as ChatMessage[])].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()),
    [messages]
  );
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: ChatMessage[] }[] = [];
    let currentDate = "";
    for (const msg of sortedMessages) {
      const d = new Date(msg.sentAt);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      let label = d.toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "long" });
      if (d.toDateString() === today.toDateString()) label = "اليوم";
      else if (d.toDateString() === yesterday.toDateString()) label = "أمس";
      if (label !== currentDate) { currentDate = label; groups.push({ date: label, msgs: [] }); }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [sortedMessages]);

  const hasMultipleAccounts = useMemo(() => {
    const ids = new Set(sortedMessages.filter(m => m.direction === "outgoing").map(m => m.accountId));
    return ids.size > 1;
  }, [sortedMessages]);

  // ===== تمرير للأسفل =====
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [sortedMessages.length, selectedChatId]);

  // ===== تعليم كمقروء =====
  useEffect(() => {
    if (selectedChatId && selectedChat?.unreadCount && selectedChat.unreadCount > 0) {
      markAsRead.mutate({ chatId: selectedChatId });
    }
  }, [selectedChatId]);

  // ===== تسجيل صوتي =====
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    else setRecordingTime(0);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setPendingMedia({ base64: result.split(",")[1], mimetype: "audio/webm", filename: "voice.webm", previewUrl: result });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch { toast.error("لا يمكن الوصول للميكروفون"); }
  };
  const handleStopRecording = () => { mediaRecorderRef.current?.stop(); setIsRecording(false); };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("الحد الأقصى 16MB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPendingMedia({ base64: result.split(",")[1], mimetype: file.type, filename: file.name, previewUrl: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = useCallback(() => {
    if (!selectedChat) return;
    if (!newMessage.trim() && !pendingMedia) return;
    sendMessage.mutate({
      chatId: selectedChat.id, accountId: selectedChat.accountId, phone: selectedChat.phone,
      message: newMessage.trim(),
      ...(pendingMedia ? { mediaBase64: pendingMedia.base64, mimetype: pendingMedia.mimetype, mediaFilename: pendingMedia.filename } : {}),
    });
  }, [selectedChat, newMessage, pendingMedia, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => {
    if (!newChatPhone.trim()) return;
    const accountId = waAccounts[0]?.accountId || "default";
    sendMessage.mutate(
      {
        chatId: 0,
        accountId,
        phone: newChatPhone.trim(),
        contactName: newChatName.trim() || undefined,
        message: "مرحباً",
      },
      {
        onSuccess: () => {
          setShowNewChat(false);
          setNewChatPhone("");
          setNewChatName("");
          refetchChats();
        }
      }
    );
  };

  const handleToggleChatAI = (chatId: number, currentEnabled: boolean) => {
    setChatAiLoading(true);
    setChatAutoReply.mutate({ chatId, enabled: !currentEnabled });
  };

  const handleToggleGlobalAI = () => {
    const newVal = !globalAiEnabled;
    setGlobalAiLoading(true);
    setGlobalAiEnabled(newVal);
    setGlobalAutoReply.mutate({ enabled: newVal });
    setBulkChatAutoReply.mutate({ enabled: newVal, accountId: "all" });
  };

  // إرسال رد AI مباشرة
  const handleSendAiReply = () => {
    if (!selectedChat || !aiEditedReply.trim()) return;
    sendMessage.mutate({
      chatId: selectedChat.id, accountId: selectedChat.accountId, phone: selectedChat.phone,
      message: aiEditedReply.trim(),
    });
    setShowAiPanel(false);
    setAiEditedReply("");
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: "#111b21" }}>
      {/* ===== شريط علوي ===== */}
      <div className="flex-shrink-0 border-b border-white/10" style={{ background: "#202c33" }}>
        {/* شريط حالة AI الإجمالي */}
        {globalAiEnabled && (
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 border-b border-[#25D366]/20" style={{ background: "rgba(37,211,102,0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
            <span className="text-[11px] text-[#25D366] font-medium">الرد التلقائي بالـ AI مفعّل لجميع المحادثات</span>
            <Link href="/ai-settings" className="text-[11px] text-[#25D366] underline opacity-70 hover:opacity-100">إعدادات AI</Link>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-[#25D366]" />
            <span className="font-semibold text-white text-sm">المحادثات</span>
            {stats && (
              <Badge variant="outline" className="text-xs border-[#25D366]/40 text-[#25D366]">
                {(stats as any).total ?? 0} محادثة
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* ===== مفتاح AI الإجمالي ===== */}
            <AiToggle
              enabled={globalAiEnabled}
              loading={globalAiLoading}
              label={globalAiEnabled ? "AI مفعّل للكل" : "AI موقف للكل"}
              onClick={handleToggleGlobalAI}
            />
            {waAccounts.length > 1 && (
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="text-xs rounded-lg px-2 py-1.5 border text-white"
                style={{ background: "#2a3942", borderColor: "rgba(255,255,255,0.1)" }}
              >
                <option value="all">كل الحسابات</option>
                {(waAccounts as any[]).map((acc) => (
                  <option key={acc.accountId} value={acc.accountId}>{acc.label}</option>
                ))}
              </select>
            )}
            <Button size="sm" onClick={() => setShowNewChat(true)} className="gap-1.5 text-xs h-8 text-white" style={{ background: "#25D366" }}>
              <Plus className="w-3.5 h-3.5" /> جديد
            </Button>
          </div>
        </div>
      </div>

      {/* ===== المحتوى الرئيسي ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== قائمة المحادثات ===== */}
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-white/10" style={{ background: "#111b21" }}>
          {/* بحث وفلتر */}
          <div className="p-2 space-y-2 border-b border-white/10">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8696a0]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث باسم أو رقم..."
                className="pr-8 h-8 text-xs border-0 text-white placeholder:text-[#8696a0]"
                style={{ background: "#202c33" }}
              />
            </div>
            {/* فلتر الحالة */}
            <div className="flex gap-1">
              {(["all", "unread", "archived"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className="flex-1 text-xs py-1 rounded-md transition-colors"
                  style={filterMode === mode ? { background: "#25D366", color: "white" } : { color: "#8696a0" }}
                >
                  {mode === "all" && `الكل (${(stats as any)?.total ?? 0})`}
                  {mode === "unread" && `غير مقروء (${(stats as any)?.unread ?? 0})`}
                  {mode === "archived" && "أرشيف"}
                </button>
              ))}
            </div>
            {/* فلتر حساب الواتساب (الرقم المُرسِل) - يظهر دائماً لمعرفة أي رقم يتعامل مع أكثر العملاء */}
            {(waAccounts as any[]).length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-[#8696a0] px-1">فلتر حسب الرقم المُرسِل:</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedAccountId("all")}
                    className="text-[11px] px-2 py-0.5 rounded-full border transition-all"
                    style={selectedAccountId === "all"
                      ? { background: "#25D366", borderColor: "#25D366", color: "white" }
                      : { background: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "#8696a0" }
                    }
                  >
                    كل الأرقام
                  </button>
                  {(waAccounts as any[]).map((acc) => {
                    const accChats = (chats as Chat[]).filter(c => c.accountId === acc.accountId);
                    const accUnread = accChats.reduce((s, c) => s + c.unreadCount, 0);
                    const color = getAccountColor(acc.accountId);
                    return (
                      <button
                        key={acc.accountId}
                        onClick={() => setSelectedAccountId(acc.accountId)}
                        className="text-[11px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1"
                        style={selectedAccountId === acc.accountId
                          ? { background: color.light, borderColor: color.border, color: color.text }
                          : { background: "transparent", borderColor: "rgba(255,255,255,0.1)", color: "#8696a0" }
                        }
                      >
                        <Smartphone className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[80px]">{acc.label}</span>
                        {accUnread > 0 && (
                          <span className="min-w-[14px] h-3.5 rounded-full bg-[#25D366] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                            {accUnread}
                          </span>
                        )}
                        <span className="text-[9px] opacity-60">({accChats.length})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* قائمة المحادثات - سكرول مستقل */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0]">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">{searchQuery ? "لا نتائج" : "لا توجد محادثات"}</p>
              </div>
            ) : (
              (filteredChats as Chat[]).map(chat => (
                <ChatCard
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === selectedChatId}
                  onClick={() => { setSelectedChatId(chat.id); setShowAiPanel(false); }}
                />
              ))
            )}
          </div>
        </div>

        {/* ===== منطقة الشات ===== */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#0b141a" }}>
            {/* رأس الشات */}
            <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 border-b border-white/10" style={{ background: "#202c33" }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: getAccountColor(selectedChat.accountId).light,
                    border: `2px solid ${getAccountColor(selectedChat.accountId).border}`,
                    color: getAccountColor(selectedChat.accountId).text,
                  }}
                >
                  {getDisplayName(selectedChat).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{getDisplayName(selectedChat)}</p>
                  <p className="text-xs text-[#8696a0]" dir="ltr">{selectedChat.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* ===== زر AI لهذه المحادثة ===== */}
                <AiToggle
                  enabled={selectedChat.aiAutoReplyEnabled}
                  loading={chatAiLoading}
                  label={selectedChat.aiAutoReplyEnabled ? "AI مفعّل" : "AI موقف"}
                  onClick={() => handleToggleChatAI(selectedChat.id, selectedChat.aiAutoReplyEnabled)}
                  size="sm"
                />
                {selectedChat.leadId && (
                  <Link href={`/leads/${selectedChat.leadId}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8696a0] hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8696a0] hover:text-white"
                  onClick={() => window.open(`tel:${selectedChat.phone}`, "_blank")}>
                  <Phone className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8696a0] hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ background: "#233138", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => setShowAssignModal(true)}>
                      <UserPlus className="w-4 h-4 ml-2" />
                      تعيين لموظف
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => analyzeChat.mutate({ chatId: selectedChat.id })}>
                      <BarChart2 className="w-4 h-4 ml-2" />
                      {analyzeChat.isPending ? "جاري التحليل..." : "تحليل AI"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => closeChat.mutate({ chatId: selectedChat.id })}>
                      <Check className="w-4 h-4 ml-2" />
                      إغلاق المحادثة
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem className="text-white hover:bg-white/10 cursor-pointer"
                      onClick={() => archiveChat.mutate({ chatId: selectedChat.id, archived: !selectedChat.isArchived })}>
                      <Archive className="w-4 h-4 ml-2" />
                      {selectedChat.isArchived ? "إلغاء الأرشفة" : "أرشفة"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                      onClick={() => { if (confirm("هل تريد حذف هذه المحادثة؟")) deleteChat.mutate({ chatId: selectedChat.id }); }}>
                      <Trash2 className="w-4 h-4 ml-2" />
                      حذف المحادثة
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* ===== منطقة الرسائل - سكرول منفرد مستقل ===== */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto py-3"
              style={{ scrollBehavior: "smooth", background: "#0b141a" }}
            >
              {sortedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#8696a0] py-20">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.08)" }}>
                    <MessageCircle className="w-10 h-10 text-[#25D366] opacity-30" />
                  </div>
                  <p className="text-sm">لا توجد رسائل بعد</p>
                  <p className="text-xs mt-1 opacity-50">ابدأ المحادثة بكتابة رسالة أدناه</p>
                </div>
              ) : (
                <>
                  {groupedMessages.map(group => (
                    <div key={group.date}>
                      <div className="flex items-center justify-center my-4">
                        <span className="text-xs text-[#8696a0] px-3 py-1 rounded-full" style={{ background: "#182229" }}>
                          {group.date}
                        </span>
                      </div>
                      {group.msgs.map((msg, idx) => {
                        const prevMsg = idx > 0 ? group.msgs[idx - 1] : null;
                        // عرض badge الرقم عند تعدد الأرقام: في أول رسالة أو عند تغيير الحساب
                        const showBadge = msg.direction === "outgoing" && hasMultipleAccounts &&
                          (!prevMsg || prevMsg.accountId !== msg.accountId || prevMsg.direction !== "outgoing");
                        return <MessageBubble key={msg.id} msg={msg} showSenderBadge={showBadge} />;
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* ===== منطقة الإدخال ===== */}
            <div className="px-3 py-2 flex-shrink-0 relative" style={{ background: "#202c33" }}>

              {/* ===== لوحة AI المحسّنة ===== */}
              {showAiPanel && (
                <div className="mb-3 rounded-2xl border flex flex-col" style={{ background: "#111b21", borderColor: "rgba(37,211,102,0.4)", maxHeight: "55vh", overflow: "hidden" }}>
                  {/* رأس لوحة AI */}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "rgba(37,211,102,0.1)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-sm font-bold text-[#25D366]">مساعد AI الذكي</span>
                      {suggestAiReply.isPending && (
                        <RefreshCw className="w-3.5 h-3.5 text-[#25D366] animate-spin" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={aiTone}
                        onChange={e => setAiTone(e.target.value as "formal" | "friendly" | "direct")}
                        className="text-xs rounded-lg px-2 py-1 border text-white"
                        style={{ background: "#2a3942", borderColor: "rgba(255,255,255,0.1)" }}
                      >
                        <option value="friendly">ودي</option>
                        <option value="formal">رسمي</option>
                        <option value="direct">مباشر</option>
                      </select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#8696a0] hover:text-white" onClick={() => setShowAiPanel(false)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* محتوى قابل للتمرير */}
                  <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
                  {/* تحليل النية */}
                  {aiIntent && (
                    <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-white/5">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-[#8696a0]">
                        {aiIntent.intent === "price_inquiry" ? "💰 سؤال سعر" : aiIntent.intent === "purchase_intent" ? "🛒 نية شراء" : aiIntent.intent === "complaint" ? "⚠️ شكوى" : aiIntent.intent === "follow_up" ? "🔄 متابعة" : "💬 استفسار"}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${aiIntent.urgency === "high" ? "bg-red-500/20 text-red-400" : aiIntent.urgency === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>
                        {aiIntent.urgency === "high" ? "🔴 عاجل" : aiIntent.urgency === "medium" ? "🟡 متوسط" : "🟢 عادي"}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${aiIntent.sentiment === "positive" ? "bg-green-500/20 text-green-400" : aiIntent.sentiment === "negative" ? "bg-red-500/20 text-red-400" : "bg-white/10 text-[#8696a0]"}`}>
                        {aiIntent.sentiment === "positive" ? "😊 إيجابي" : aiIntent.sentiment === "negative" ? "😟 سلبي" : "😐 محايد"}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366]">
                        {aiIntent.interestScore}% اهتمام
                      </span>
                    </div>
                  )}

                  {/* اقتراحات الردود */}
                  {aiSuggestions.length > 0 && (
                    <div className="px-4 py-2 space-y-1.5">
                      <p className="text-[11px] text-[#8696a0] mb-1">اختر رداً أو عدّله:</p>
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          className="w-full text-right text-xs px-3 py-2 rounded-xl border transition-all hover:opacity-90"
                          style={{
                            background: aiEditedReply === s ? "rgba(37,211,102,0.15)" : "#2a3942",
                            borderColor: aiEditedReply === s ? "rgba(37,211,102,0.5)" : "rgba(255,255,255,0.08)",
                            color: "white"
                          }}
                          onClick={() => setAiEditedReply(s)}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] text-[#8696a0] flex-shrink-0 mt-0.5">{i + 1}.</span>
                            <span className="flex-1 leading-relaxed">{s}</span>
                            {aiEditedReply === s && <Check className="w-3 h-3 text-[#25D366] flex-shrink-0 mt-0.5" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* منطقة التعديل والإرسال */}
                  <div className="px-4 pb-3 pt-1">
                    <Textarea
                      value={aiEditedReply}
                      onChange={e => setAiEditedReply(e.target.value)}
                      placeholder="عدّل الرد هنا قبل الإرسال..."
                      className="text-sm text-white border-0 resize-none mb-2"
                      style={{ background: "#2a3942", borderRadius: "10px", minHeight: "60px" }}
                      rows={2}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8 text-white"
                        style={{ background: "#25D366" }}
                        onClick={handleSendAiReply}
                        disabled={!aiEditedReply.trim() || sendMessage.isPending}
                      >
                        <Send className="w-3.5 h-3.5 ml-1" />
                        إرسال الرد
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="text-xs h-8 text-[#8696a0] hover:text-white"
                        onClick={() => { setNewMessage(aiEditedReply); setShowAiPanel(false); textareaRef.current?.focus(); }}
                      >
                        تعديل يدوي
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-8 w-8 p-0 text-[#8696a0] hover:text-[#25D366]"
                        onClick={() => selectedChatId && suggestAiReply.mutate({ chatId: selectedChatId, tone: aiTone })}
                        disabled={suggestAiReply.isPending}
                        title="تحديث الاقتراحات"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${suggestAiReply.isPending ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                  </div>{/* إغلاق div التمرير */}
                </div>
              )}
              {/* معاينة الوسائط */}
              {pendingMedia && (
                <div className="flex items-center gap-2 mb-2 p-2 rounded-xl border" style={{ background: "#182229", borderColor: "rgba(255,255,255,0.1)" }}>
                  {pendingMedia.mimetype.startsWith("image") ? (
                    <img src={pendingMedia.previewUrl} alt="معاينة" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#2a3942" }}>
                      <FileText className="w-5 h-5 text-[#25D366]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{pendingMedia.filename}</p>
                    <p className="text-xs text-[#8696a0]">{pendingMedia.mimetype}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#8696a0]" onClick={() => setPendingMedia(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* إيموجي picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 z-50">
                  <EmojiPicker theme={Theme.DARK} height={350} width={300}
                    onEmojiClick={(data: EmojiClickData) => {
                      setNewMessage(prev => prev + data.emoji);
                      setShowEmojiPicker(false);
                      textareaRef.current?.focus();
                    }}
                  />
                </div>
              )}

              {/* شريط الإدخال */}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                  onChange={handleFileSelect}
                />
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0 text-[#8696a0] hover:text-white"
                  onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0 text-[#8696a0] hover:text-white"
                  onClick={() => setShowEmojiPicker(p => !p)}>
                  <Smile className="w-5 h-5" />
                </Button>
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالة..."
                  className="flex-1 min-h-[40px] max-h-32 resize-none text-sm py-2.5 border-0 text-white placeholder:text-[#8696a0]"
                  style={{ background: "#2a3942", borderRadius: "8px" }}
                  rows={1}
                />
                {/* زر AI - واضح ومميز */}
                <Button
                  variant="ghost" size="sm"
                  className="h-10 w-10 p-0 flex-shrink-0 transition-all"
                  style={{
                    color: showAiPanel ? "#25D366" : "#8696a0",
                    background: showAiPanel ? "rgba(37,211,102,0.1)" : "transparent",
                    borderRadius: "50%",
                  }}
                  onClick={() => {
                    if (!showAiPanel && selectedChatId) {
                      suggestAiReply.mutate({ chatId: selectedChatId, tone: aiTone });
                    } else {
                      setShowAiPanel(false);
                    }
                  }}
                  disabled={suggestAiReply.isPending}
                  title="مساعد AI للرد"
                >
                  {suggestAiReply.isPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </Button>
                {/* زر إرسال أو تسجيل */}
                {newMessage.trim() || pendingMedia ? (
                  <Button onClick={handleSend} disabled={sendMessage.isPending}
                    className="h-10 w-10 p-0 flex-shrink-0 text-white"
                    style={{ background: "#25D366", borderRadius: "50%" }}>
                    {sendMessage.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 flex-shrink-0"
                    style={{ color: isRecording ? "#ef4444" : "#8696a0" }}
                    onClick={isRecording ? handleStopRecording : handleStartRecording}>
                    {isRecording ? (
                      <div className="flex flex-col items-center">
                        <MicOff className="w-4 h-4" />
                        <span className="text-[9px]">{recordingTime}s</span>
                      </div>
                    ) : <Mic className="w-5 h-5" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* حالة عدم اختيار محادثة */
          <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0]">
            <div className="w-28 h-28 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(37,211,102,0.08)" }}>
              <MessageCircle className="w-14 h-14 text-[#25D366] opacity-30" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">صندوق الوارد</h3>
            <p className="text-sm text-center max-w-xs opacity-50 mb-1">اختر محادثة من القائمة لعرض الرسائل</p>
            <p className="text-xs text-center max-w-xs opacity-30 mb-6">يتحدث تلقائياً كل ثانيتين</p>
            {(waAccounts as any[]).length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-sm mb-4">
                {(waAccounts as any[]).map((acc) => (
                  <span key={acc.accountId} className="text-xs px-3 py-1 rounded-full border text-[#25D366]"
                    style={{ borderColor: "rgba(37,211,102,0.3)", background: "rgba(37,211,102,0.08)" }}>
                    {acc.label}
                  </span>
                ))}
              </div>
            )}
            <Button onClick={() => setShowNewChat(true)} className="text-white" style={{ background: "#25D366" }}>
              <MessageCircle className="w-4 h-4 ml-2" />
              بدء محادثة جديدة
            </Button>
          </div>
        )}
      </div>

      {/* ===== نافذة محادثة جديدة ===== */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowNewChat(false)}>
          <div className="border rounded-2xl p-6 w-full max-w-sm shadow-2xl" style={{ background: "#233138", borderColor: "rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
                محادثة جديدة
              </h3>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#8696a0]" onClick={() => setShowNewChat(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#8696a0] mb-1 block">اسم العميل (اختياري)</label>
                <Input value={newChatName} onChange={e => setNewChatName(e.target.value)}
                  placeholder="اسم العميل أو اسم الشركة"
                  className="text-white border-0" style={{ background: "#2a3942" }} />
              </div>
              <div>
                <label className="text-sm text-[#8696a0] mb-1 block">رقم الهاتف</label>
                <Input value={newChatPhone} onChange={e => setNewChatPhone(e.target.value)}
                  placeholder="+966501234567" dir="ltr" className="text-left text-white border-0"
                  style={{ background: "#2a3942" }} />
              </div>
              <Button className="w-full text-white" onClick={handleNewChat}
                disabled={!newChatPhone.trim() || sendMessage.isPending}
                style={{ background: "#25D366" }}>
                {sendMessage.isPending ? <RefreshCw className="w-4 h-4 animate-spin ml-2" /> : <MessageCircle className="w-4 h-4 ml-2" />}
                بدء المحادثة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal تعيين الموظف ===== */}
      {showAssignModal && selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl p-5 w-80 shadow-2xl" style={{ background: "#233138", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#25D366]" />
                تعيين موظف
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[#8696a0] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8696a0] mb-3">محادثة: {selectedChat.contactName || selectedChat.phone}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => assignChat.mutate({ chatId: selectedChat.id, userId: null, userName: null })}
                className="w-full text-right px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)" }}
              >
                <Bot className="w-4 h-4 text-[#25D366]" />
                <span className="text-[#25D366]">ذكاء اصطناعي (AI)</span>
              </button>
              {(employeeList as Array<{ id: number; name: string | null; email: string | null }>).map(emp => (
                <button
                  key={emp.id}
                  onClick={() => assignChat.mutate({ chatId: selectedChat.id, userId: emp.id, userName: emp.name })}
                  className="w-full text-right px-3 py-2 rounded-lg text-sm text-white transition-colors hover:bg-white/10 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <div className="w-7 h-7 rounded-full bg-[#25D366]/20 flex items-center justify-center text-[#25D366] text-xs font-bold">
                    {(emp.name || "م").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{emp.name || "موظف"}</p>
                    {emp.email && <p className="text-[10px] text-[#8696a0]">{emp.email}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal تحليل AI ===== */}
      {showAiAnalysis && aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-xl p-5 w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl" style={{ background: "#233138", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#25D366]" />
                تحليل AI للمحادثة
              </h3>
              <button onClick={() => setShowAiAnalysis(false)} className="text-[#8696a0] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* الملخص */}
            <div className="p-3 rounded-lg mb-3" style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)" }}>
              <p className="text-sm text-white">{aiAnalysisResult.summary}</p>
            </div>
            {/* المؤشرات */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-xs text-[#8696a0] mb-1">احتمالية الإغلاق</p>
                <p className="text-2xl font-bold" style={{ color: aiAnalysisResult.closingProbability > 60 ? "#25D366" : aiAnalysisResult.closingProbability > 30 ? "#f59e0b" : "#ef4444" }}>
                  {aiAnalysisResult.closingProbability}%
                </p>
              </div>
              <div className="p-2 rounded-lg text-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <p className="text-xs text-[#8696a0] mb-1">المشاعر</p>
                <p className="text-lg font-bold" style={{ color: aiAnalysisResult.sentiment === "positive" ? "#25D366" : aiAnalysisResult.sentiment === "negative" ? "#ef4444" : "#f59e0b" }}>
                  {aiAnalysisResult.sentiment === "positive" ? "إيجابي" : aiAnalysisResult.sentiment === "negative" ? "سلبي" : "محايد"}
                </p>
              </div>
            </div>
            {aiAnalysisResult.opportunityMissed && (
              <div className="flex items-center gap-2 p-2 rounded-lg mb-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">تم تفويت فرصة بيع في هذه المحادثة</p>
              </div>
            )}
            {aiAnalysisResult.weakPoints.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> نقاط الضعف</p>
                {aiAnalysisResult.weakPoints.map((p, i) => <p key={i} className="text-xs text-[#8696a0] py-0.5 border-r-2 border-red-400/50 pr-2 mb-1">{p}</p>)}
              </div>
            )}
            {aiAnalysisResult.strengths.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-[#25D366] mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> نقاط القوة</p>
                {aiAnalysisResult.strengths.map((p, i) => <p key={i} className="text-xs text-[#8696a0] py-0.5 border-r-2 border-[#25D366]/50 pr-2 mb-1">{p}</p>)}
              </div>
            )}
            {aiAnalysisResult.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-400 mb-1">توصيات</p>
                {aiAnalysisResult.recommendations.map((r, i) => <p key={i} className="text-xs text-[#8696a0] py-0.5 border-r-2 border-blue-400/50 pr-2 mb-1">{r}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
