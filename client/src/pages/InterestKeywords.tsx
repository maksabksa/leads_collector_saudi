import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tag,
  Plus,
  Trash2,
  Brain,
  Zap,
  TestTube,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  price: { label: "السعر والتكلفة", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  buy: { label: "الشراء والطلب", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  interest: { label: "الاهتمام والموافقة", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  contact: { label: "التواصل والمواعيد", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  general: { label: "عام", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function InterestKeywords() {
  const [activeTab, setActiveTab] = useState<"keywords" | "training" | "test">("keywords");
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState<"price" | "buy" | "interest" | "contact" | "general">("general");
  const [newWeight, setNewWeight] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; keyword: string; isDefault: boolean } | null>(null);

  // Training
  const [trainingMsg, setTrainingMsg] = useState("");
  const [trainingLabel, setTrainingLabel] = useState<"interested" | "not_interested">("interested");
  const [trainingNotes, setTrainingNotes] = useState("");

  // Test
  const [testMessage, setTestMessage] = useState("");
  const [testResult, setTestResult] = useState<{
    finalScore: number;
    isInterested: boolean;
    keywordsScore: number;
    aiScore: number | null;
    foundKeywords: { keyword: string; weight: number; category: string }[];
    aiReason: string | null;
  } | null>(null);

  // ===== Queries =====
  const { data: keywords = [], refetch: refetchKeywords } = trpc.interestKw.list.useQuery();
  const { data: stats } = trpc.interestKw.stats.useQuery();
  const { data: examples = [], refetch: refetchExamples } = trpc.interestKw.listTrainingExamples.useQuery();

  // ===== Mutations =====
  const addKeyword = trpc.interestKw.add.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة الكلمة");
      setNewKeyword("");
      refetchKeywords();
    },
    onError: (e) => toast.error("فشل الإضافة", { description: e.message }),
  });

  const updateKeyword = trpc.interestKw.update.useMutation({
    onSuccess: () => refetchKeywords(),
    onError: (e) => toast.error("فشل التحديث", { description: e.message }),
  });

  const deleteKeyword = trpc.interestKw.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الكلمة");
      setDeleteTarget(null);
      refetchKeywords();
    },
    onError: (e) => toast.error("فشل الحذف", { description: e.message }),
  });

  const addExample = trpc.interestKw.addTrainingExample.useMutation({
    onSuccess: () => {
      toast.success("تمت إضافة المثال التدريبي");
      setTrainingMsg("");
      setTrainingNotes("");
      refetchExamples();
    },
    onError: (e) => toast.error("فشل الإضافة", { description: e.message }),
  });

  const deleteExample = trpc.interestKw.deleteTrainingExample.useMutation({
    onSuccess: () => refetchExamples(),
  });

  const testMsg = trpc.interestKw.testMessage.useMutation({
    onSuccess: (data) => setTestResult(data),
    onError: (e) => toast.error("فشل الاختبار", { description: e.message }),
  });

  // تجميع الكلمات حسب الفئة
  const grouped = (keywords as any[]).reduce((acc: Record<string, any[]>, kw: any) => {
    if (!acc[kw.category]) acc[kw.category] = [];
    acc[kw.category].push(kw);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-7 h-7 text-primary" />
          كشف الاهتمام بالذكاء الاصطناعي
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          أضف كلمات مفتاحية وأمثلة تدريبية لتحسين دقة كشف العملاء المهتمين
        </p>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{stats?.active ?? 0}</p>
          <p className="text-xs text-muted-foreground">كلمة نشطة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
          <p className="text-xs text-muted-foreground">إجمالي الكلمات</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats?.interestedExamples ?? 0}</p>
          <p className="text-xs text-muted-foreground">أمثلة مهتمة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats?.notInterestedExamples ?? 0}</p>
          <p className="text-xs text-muted-foreground">أمثلة غير مهتمة</p>
        </div>
      </div>

      {/* تبويبات */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg w-fit">
        {[
          { id: "keywords", label: "الكلمات المفتاحية", icon: Tag },
          { id: "training", label: "التدريب", icon: BookOpen },
          { id: "test", label: "اختبار الكشف", icon: TestTube },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === id
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ===== تبويب الكلمات ===== */}
      {activeTab === "keywords" && (
        <div className="space-y-5">
          {/* إضافة كلمة */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              إضافة كلمة مفتاحية جديدة
            </h3>
            <div className="flex gap-3 flex-wrap">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="الكلمة المفتاحية..."
                className="flex-1 min-w-40"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newKeyword.trim()) {
                    addKeyword.mutate({ keyword: newKeyword, category: newCategory, weight: newWeight });
                  }
                }}
              />
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as typeof newCategory)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">الوزن:</span>
                <Input
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(parseInt(e.target.value) || 20)}
                  min={5}
                  max={100}
                  className="w-20"
                />
              </div>
              <Button
                onClick={() => addKeyword.mutate({ keyword: newKeyword, category: newCategory, weight: newWeight })}
                disabled={!newKeyword.trim() || addKeyword.isPending}
              >
                {addKeyword.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Plus className="w-4 h-4 ml-1" />}
                إضافة
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              الوزن يحدد مساهمة الكلمة في درجة الاهتمام (5-100). الكلمات ذات الوزن الأعلى تزيد الدرجة أكثر.
            </p>
          </div>

          {/* الكلمات مجمعة حسب الفئة */}
          {Object.entries(CATEGORY_CONFIG).map(([category, catInfo]) => {
            const catKeywords = grouped[category] || [];
            if (catKeywords.length === 0) return null;
            return (
              <div key={category} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className={`${catInfo.color} border text-xs`}>{catInfo.label}</Badge>
                  <span className="text-xs text-muted-foreground">({catKeywords.length} كلمة)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {catKeywords.map((kw: any) => (
                    <div
                      key={kw.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all ${
                        kw.isActive
                          ? "bg-primary/10 border-primary/30 text-foreground"
                          : "bg-muted/30 border-border text-muted-foreground line-through"
                      }`}
                    >
                      <Tag className="w-3 h-3 text-primary" />
                      <span>{kw.keyword}</span>
                      <span className="text-xs text-muted-foreground">({kw.weight})</span>
                      <div className="flex items-center gap-1 mr-1">
                        <Switch
                          checked={kw.isActive}
                          onCheckedChange={(v) => updateKeyword.mutate({ id: kw.id, isActive: v })}
                          className="scale-75"
                        />
                        {!kw.isDefault && (
                          <button
                            onClick={() => setDeleteTarget({ id: kw.id, keyword: kw.keyword, isDefault: kw.isDefault })}
                            className="text-destructive/60 hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {kw.isDefault && (
                          <span className="text-xs text-muted-foreground/50">افتراضي</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {(keywords as any[]).length === 0 && (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>لا توجد كلمات مفتاحية بعد</p>
            </div>
          )}
        </div>
      )}

      {/* ===== تبويب التدريب ===== */}
      {activeTab === "training" && (
        <div className="space-y-5">
          {/* إضافة مثال */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              إضافة مثال تدريبي
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              أضف أمثلة من رسائل حقيقية لتحسين دقة الذكاء الاصطناعي في كشف الاهتمام.
            </p>
            <div className="space-y-3">
              <Textarea
                value={trainingMsg}
                onChange={(e) => setTrainingMsg(e.target.value)}
                placeholder="أدخل رسالة العميل هنا..."
                rows={3}
                className="resize-none"
              />
              <div className="flex gap-3 flex-wrap">
                <div className="flex gap-2">
                  <Button
                    variant={trainingLabel === "interested" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTrainingLabel("interested")}
                    className={trainingLabel === "interested" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    مهتم بالشراء
                  </Button>
                  <Button
                    variant={trainingLabel === "not_interested" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTrainingLabel("not_interested")}
                    className={trainingLabel === "not_interested" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <XCircle className="w-4 h-4 ml-1" />
                    غير مهتم
                  </Button>
                </div>
                <Input
                  value={trainingNotes}
                  onChange={(e) => setTrainingNotes(e.target.value)}
                  placeholder="ملاحظة اختيارية..."
                  className="flex-1 min-w-40"
                />
                <Button
                  onClick={() => addExample.mutate({ message: trainingMsg, label: trainingLabel, notes: trainingNotes || undefined })}
                  disabled={!trainingMsg.trim() || addExample.isPending}
                >
                  {addExample.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                  حفظ المثال
                </Button>
              </div>
            </div>
          </div>

          {/* قائمة الأمثلة */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">
                الأمثلة التدريبية ({(examples as any[]).length})
              </h3>
              <Button variant="ghost" size="sm" onClick={() => refetchExamples()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            {(examples as any[]).map((ex: any) => (
              <div
                key={ex.id}
                className={`flex items-start gap-3 p-4 rounded-xl border ${
                  ex.label === "interested"
                    ? "bg-green-500/5 border-green-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {ex.label === "interested" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">"{ex.message}"</p>
                  {ex.notes && <p className="text-xs text-muted-foreground mt-1">{ex.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ex.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive/60 hover:text-destructive h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => deleteExample.mutate({ id: ex.id })}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {(examples as any[]).length === 0 && (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد أمثلة تدريبية بعد</p>
                <p className="text-xs mt-1">أضف أمثلة لتحسين دقة الذكاء الاصطناعي</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== تبويب الاختبار ===== */}
      {activeTab === "test" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-primary" />
              اختبار كشف الاهتمام
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              أدخل رسالة عميل لمعرفة درجة اهتمامه وكيف يحللها النظام.
            </p>
            <div className="space-y-3">
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="مثال: كم سعر الكيلو؟ أبي أطلب..."
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={() => testMsg.mutate({ message: testMessage })}
                disabled={!testMessage.trim() || testMsg.isPending}
                className="w-full"
              >
                {testMsg.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Sparkles className="w-4 h-4 ml-2" />
                )}
                تحليل الرسالة
              </Button>
            </div>
          </div>

          {/* نتيجة الاختبار */}
          {testResult && (
            <div
              className={`rounded-xl border p-5 space-y-4 ${
                testResult.isInterested
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              {/* الحكم النهائي */}
              <div className="flex items-center gap-3">
                {testResult.isInterested ? (
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
                <div>
                  <p className="text-lg font-bold">
                    {testResult.isInterested ? "العميل مهتم بالشراء" : "العميل غير مهتم"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    درجة الاهتمام الإجمالية: {testResult.finalScore}%
                  </p>
                </div>
              </div>

              {/* تفاصيل الدرجات */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold">{testResult.keywordsScore}%</p>
                  <p className="text-xs text-muted-foreground">درجة الكلمات المفتاحية</p>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold flex items-center justify-center gap-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    {testResult.aiScore !== null ? `${testResult.aiScore}%` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">درجة الذكاء الاصطناعي</p>
                </div>
              </div>

              {/* الكلمات المكتشفة */}
              {testResult.foundKeywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">الكلمات المكتشفة:</p>
                  <div className="flex flex-wrap gap-2">
                    {testResult.foundKeywords.map((kw) => (
                      <Badge key={kw.keyword} className={`${CATEGORY_CONFIG[kw.category]?.color || ""} border text-xs`}>
                        {kw.keyword} (+{kw.weight})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* تحليل AI */}
              {testResult.aiReason && (
                <div className="bg-background/50 rounded-lg p-3">
                  <p className="text-xs font-medium flex items-center gap-1 mb-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    تحليل الذكاء الاصطناعي:
                  </p>
                  <p className="text-sm text-muted-foreground">{testResult.aiReason}</p>
                </div>
              )}

              {/* إضافة كمثال تدريبي */}
              <div className="flex gap-2 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground flex-1">هل التحليل صحيح؟ أضفه كمثال تدريبي:</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-green-500/30 text-green-400"
                  onClick={() => addExample.mutate({ message: testMessage, label: "interested" })}
                >
                  مهتم ✓
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-500/30 text-red-400"
                  onClick={() => addExample.mutate({ message: testMessage, label: "not_interested" })}
                >
                  غير مهتم ✗
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog تأكيد الحذف */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الكلمة المفتاحية</AlertDialogTitle>
            <AlertDialogDescription>
              هل تريد حذف كلمة "{deleteTarget?.keyword}"؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteKeyword.mutate({ id: deleteTarget.id })}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
