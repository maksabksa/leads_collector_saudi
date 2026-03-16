import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, AlertCircle, Clock, XCircle, History } from "lucide-react";

interface Props {
  leadId: number;
  phone: string;
  name: string;
}

export default function WhatchimpSendButton({ leadId, phone: _phone, name }: Props) {
  const { data: configured } = trpc.whatchimp.isConfigured.useQuery();
  const utils = trpc.useUtils();

  const { data: history, isLoading: historyLoading } = trpc.whatchimp.getSendHistory.useQuery(
    { leadId, limit: 5 },
    { enabled: !!configured?.configured }
  );

  const sendMutation = trpc.whatchimp.sendLead.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        toast.success(`تم إرسال ${name} إلى Whatchimp بنجاح`);
        utils.whatchimp.getSendHistory.invalidate({ leadId });
      } else {
        toast.error(res.error || "فشل الإرسال");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  if (!configured?.configured) {
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <AlertCircle className="w-3 h-3" />
        Whatchimp غير مربوط — اذهب للإعدادات لربطه
      </p>
    );
  }

  const lastSent = history?.[0];
  const successCount = history?.filter(h => h.status === "success").length ?? 0;

  return (
    <div className="space-y-3">
      {/* زر الإرسال */}
      <button
        onClick={() => sendMutation.mutate({ leadId })}
        disabled={sendMutation.isPending}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
        style={{
          background: "oklch(0.55 0.2 145 / 0.15)",
          color: "oklch(0.65 0.2 145)",
          border: "1px solid oklch(0.55 0.2 145 / 0.3)",
          opacity: sendMutation.isPending ? 0.7 : 1,
        }}
      >
        {sendMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
        {lastSent?.status === "success" ? "إعادة الإرسال إلى Whatchimp" : "إرسال إلى Whatchimp"}
      </button>

      {/* سجل الإرسال */}
      {!historyLoading && history && history.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <History className="w-3 h-3" />
            سجل الإرسال ({successCount} ناجح من {history.length})
          </p>
          <div className="space-y-1">
            {history.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg"
                style={{ background: "oklch(0.15 0.01 240)" }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {log.status === "success" ? (
                    <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "oklch(0.65 0.18 145)" }} />
                  ) : log.status === "failed" ? (
                    <XCircle className="w-3 h-3 shrink-0" style={{ color: "oklch(0.65 0.2 25)" }} />
                  ) : (
                    <Clock className="w-3 h-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className={log.status === "success" ? "" : "text-muted-foreground"}>
                    {log.status === "success" ? "نجح" : log.status === "failed" ? "فشل" : "تم التخطي"}
                  </span>
                  {log.errorMessage && (
                    <span className="text-muted-foreground truncate max-w-[110px]" title={log.errorMessage}>
                      — {log.errorMessage}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {new Date(log.sentAt).toLocaleDateString("ar-SA", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
