import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  leadId: number;
  phone: string;
  name: string;
}

export default function WhatchimpSendButton({ leadId, phone, name }: Props) {
  const { data: configured } = trpc.whatchimp.isConfigured.useQuery();
  const [sent, setSent] = useState(false);

  const sendMutation = trpc.whatchimp.sendLead.useMutation({
    onSuccess: (res) => {
      if (res.success) {
        setSent(true);
        toast.success(`تم إرسال ${name} إلى Whatchimp بنجاح`);
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

  if (sent) {
    return (
      <p className="text-xs flex items-center gap-1.5" style={{ color: "oklch(0.65 0.18 145)" }}>
        <CheckCircle2 className="w-3 h-3" />
        تم الإرسال إلى Whatchimp
      </p>
    );
  }

  return (
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
      إرسال إلى Whatchimp
    </button>
  );
}
