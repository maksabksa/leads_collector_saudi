import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, AlertCircle, Clock, XCircle, History, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Props {
  leadId: number;
  phone: string;
  name: string;
}

export default function WhatchimpSendButton({ leadId, phone: _phone, name }: Props) {
  const { data: configured } = trpc.whatchimp.isConfigured.useQuery();
  const utils = trpc.useUtils();

  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const { data: history, isLoading: historyLoading } = trpc.whatchimp.getSendHistory.useQuery(
    { leadId, limit: 5 },
    { enabled: !!configured?.configured }
  );

  const { data: templates, isLoading: templatesLoading } = trpc.whatchimp.getTemplates.useQuery(
    undefined,
    { enabled: showTemplateDialog && !!configured?.configured }
  );

  const sendTemplateMutation = trpc.whatchimp.sendTemplateMessage.useMutation({
    onSuccess: () => {
      toast.success(`تم إرسال رسالة Template لـ ${name} بنجاح`);
      utils.whatchimp.getSendHistory.invalidate({ leadId });
      setShowTemplateDialog(false);
      setSelectedTemplate("");
    },
    onError: (e) => toast.error(e.message),
  });

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
      {/* أزرار الإرسال */}
      <div className="flex gap-2">
        {/* زر إرسال Contact */}
        <button
          onClick={() => sendMutation.mutate({ leadId })}
          disabled={sendMutation.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
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
          {lastSent?.status === "success" ? "إعادة الإرسال" : "إرسال Contact"}
        </button>

        {/* زر إرسال Template */}
        <button
          onClick={() => setShowTemplateDialog(true)}
          disabled={sendTemplateMutation.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: "oklch(0.55 0.2 250 / 0.15)",
            color: "oklch(0.65 0.2 250)",
            border: "1px solid oklch(0.55 0.2 250 / 0.3)",
            opacity: sendTemplateMutation.isPending ? 0.7 : 1,
          }}
        >
          {sendTemplateMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <MessageSquare className="w-3 h-3" />
          )}
          إرسال Template
        </button>
      </div>

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
      {/* Dialog اختيار الـ Template */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              إرسال Template لـ {name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              اختر الـ Template المعتمد الذي تريد إرساله للعميل عبر WhatsApp
            </p>

            {templatesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري تحميل الـ Templates...
              </div>
            ) : (
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر Template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{t.name}</span>
                        {t.category && (
                          <span className="text-xs text-muted-foreground">{t.category}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                  {templates?.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      لا توجد templates معتمدة
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}

            {selectedTemplate && (
              <div
                className="text-xs p-3 rounded-lg"
                style={{ background: "oklch(0.55 0.2 250 / 0.1)", border: "1px solid oklch(0.55 0.2 250 / 0.2)" }}
              >
                <p className="text-muted-foreground">
                  سيتم إرسال الـ template <strong className="text-foreground">{selectedTemplate}</strong> إلى رقم العميل مع ملء البيانات تلقائياً من ملفه.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              إلغاء
            </Button>
            <Button
              disabled={!selectedTemplate || sendTemplateMutation.isPending}
              onClick={() => sendTemplateMutation.mutate({
                leadId,
                templateName: selectedTemplate,
                languageCode: "ar",
              })}
            >
              {sendTemplateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-1" /> جاري الإرسال...</>
              ) : (
                <><MessageSquare className="w-4 h-4 ml-1" /> إرسال</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
