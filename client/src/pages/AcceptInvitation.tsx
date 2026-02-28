import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, UserPlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AcceptInvitation() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // استخراج token من URL
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const acceptMutation = trpc.staffAuth.acceptInvitation.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("يرجى إدخال اسمك");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتَين");
      return;
    }
    if (!token) {
      setError("رابط الدعوة غير صحيح");
      return;
    }

    acceptMutation.mutate({ token, name, password });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800/80 border-slate-700 shadow-2xl w-full max-w-md text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">تم إنشاء حسابك بنجاح!</h2>
          <p className="text-slate-400">جاري تحويلك للنظام...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl mb-4 shadow-lg shadow-green-500/30">
            <UserPlus className="text-white h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">إنشاء حسابك</h1>
          <p className="text-slate-400 mt-1 text-sm">تمت دعوتك للانضمام إلى نظام مكسب</p>
        </div>

        <Card className="bg-slate-800/80 border-slate-700 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-xl text-center">أكمل إنشاء حسابك</CardTitle>
            <CardDescription className="text-slate-400 text-center text-sm">
              أدخل بياناتك لتفعيل الحساب
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!token && (
                <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>رابط الدعوة غير صحيح. تأكد من فتح الرابط المُرسَل إليك</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">اسمك الكامل</Label>
                <Input
                  type="text"
                  placeholder="مثال: محمد أحمد"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20"
                  disabled={acceptMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">كلمة المرور</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="8 أحرف على الأقل"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20 pr-10"
                    disabled={acceptMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">تأكيد كلمة المرور</Label>
                <Input
                  type="password"
                  placeholder="أعد إدخال كلمة المرور"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-500 focus:ring-green-500/20"
                  disabled={acceptMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-medium py-2.5 shadow-lg shadow-green-500/20 transition-all duration-200"
                disabled={acceptMutation.isPending || !token}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 ml-2" />
                    إنشاء الحساب والدخول
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
