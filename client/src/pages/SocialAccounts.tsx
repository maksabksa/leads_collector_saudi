import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Instagram, Link2, Link2Off, Trash2, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, ExternalLink,
  Users, MessageCircle, TrendingUp
} from "lucide-react";

// أيقونات المنصات
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
  </svg>
);

const SnapchatIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12.166 2c.93 0 4.369.26 5.975 3.607.522 1.1.397 2.957.298 4.42l-.008.13c-.01.148-.02.29-.027.425.3.15.878.337 1.73.18.12-.022.245-.034.37-.034.48 0 .9.2 1.07.52.22.42.06.93-.46 1.32-.07.05-.19.12-.35.2-.5.24-1.26.6-1.5 1.28-.06.17-.05.33.03.54l.01.02c.27.65 1.1 2.64-.26 3.54-.36.24-.78.35-1.26.35-.4 0-.84-.08-1.32-.24-.48-.16-.93-.24-1.35-.24-.46 0-.85.1-1.17.3-.52.32-1.03.97-1.5 1.57-.47.6-.96 1.22-1.6 1.6-.52.3-1.1.46-1.72.46-.62 0-1.2-.16-1.72-.46-.64-.38-1.13-1-1.6-1.6-.47-.6-.98-1.25-1.5-1.57-.32-.2-.71-.3-1.17-.3-.42 0-.87.08-1.35.24-.48.16-.92.24-1.32.24-.48 0-.9-.11-1.26-.35-1.36-.9-.53-2.89-.26-3.54l.01-.02c.08-.21.09-.37.03-.54-.24-.68-1-.04-1.5-1.28-.07-.18-.2-.37-.35-.47-.52-.39-.68-.9-.46-1.32.17-.32.59-.52 1.07-.52.125 0 .25.012.37.034.852.157 1.43-.03 1.73-.18-.007-.135-.017-.277-.027-.425l-.008-.13c-.099-1.463-.224-3.32.298-4.42C7.797 2.26 11.236 2 12.166 2z"/>
  </svg>
);

const PLATFORMS = [
  {
    id: "instagram" as const,
    name: "إنستجرام",
    description: "ربط حساب Instagram Business لاستقبال وإرسال الرسائل المباشرة",
    icon: <Instagram className="w-8 h-8" />,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    requirements: ["حساب Instagram Business أو Creator", "صفحة Facebook مرتبطة", "App ID وApp Secret من Meta Developers"],
    oauthSupported: true,
  },
  {
    id: "tiktok" as const,
    name: "تيك توك",
    description: "ربط حساب TikTok Business لعرض التعليقات والتفاعل مع الجمهور",
    icon: <TikTokIcon />,
    color: "from-gray-800 to-gray-600",
    bgColor: "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950/30 dark:to-slate-950/30",
    borderColor: "border-gray-200 dark:border-gray-800",
    badgeColor: "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300",
    requirements: ["حساب TikTok Business", "Client Key وClient Secret من TikTok Developers"],
    oauthSupported: true,
  },
  {
    id: "snapchat" as const,
    name: "سناب شات",
    description: "ربط حساب Snapchat Business لإدارة التفاعلات والرسائل",
    icon: <SnapchatIcon />,
    color: "from-yellow-400 to-yellow-500",
    bgColor: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    badgeColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    requirements: ["حساب Snapchat Business", "Client ID وClient Secret من Snap Kit"],
    oauthSupported: true,
  },
];

export default function SocialAccounts() {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [showManualDialog, setShowManualDialog] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState({ accountId: "", username: "", accessToken: "" });

  const { data: accounts, refetch } = trpc.inbox.accounts.list.useQuery();

  const connectMutation = trpc.inbox.accounts.connect.useMutation({
    onSuccess: () => {
      toast.success("تم الربط بنجاح", { description: "تم ربط الحساب وهو جاهز للاستخدام" });
      refetch();
      setShowManualDialog(null);
      setManualToken({ accountId: "", username: "", accessToken: "" });
    },
    onError: (err) => {
      toast.error("فشل الربط", { description: err.message });
    },
  });

  const disconnectMutation = trpc.inbox.accounts.disconnect.useMutation({
    onSuccess: () => {
      toast.success("تم قطع الاتصال");
      refetch();
    },
  });

  const deleteMutation = trpc.inbox.accounts.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف الحساب");
      refetch();
    },
  });

  const { data: oauthData } = trpc.inbox.accounts.getOAuthUrl.useQuery(
    {
      platform: (connectingPlatform as "instagram" | "tiktok" | "snapchat") || "instagram",
      redirectUri: `${window.location.origin}/social-callback`,
    },
    { enabled: !!connectingPlatform }
  );

  const exchangeCodeMutation = trpc.inbox.accounts.exchangeCode.useMutation({
    onSuccess: () => {
      toast.success("تم ربط الحساب بنجاح");
      refetch();
    },
    onError: (err) => {
      toast.error("فشل الربط", { description: err.message });
    },
  });

  // معالجة OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      window.history.replaceState({}, "", window.location.pathname);
      try {
        const stateData = JSON.parse(atob(state));
        const platform = stateData.platform as "instagram" | "tiktok" | "snapchat";
        exchangeCodeMutation.mutate({
          platform,
          code,
          redirectUri: `${window.location.origin}/social-callback`,
        });
      } catch {
        // ignore
      }
    }
  }, []);

  const handleOAuthConnect = (platform: string) => {
    if (!oauthData?.url || connectingPlatform !== platform) {
      setConnectingPlatform(platform);
      return;
    }
    window.open(oauthData.url, "_blank", "width=600,height=700");
  };

  const handleManualConnect = (platform: "instagram" | "tiktok" | "snapchat") => {
    if (!manualToken.accountId || !manualToken.username || !manualToken.accessToken) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    connectMutation.mutate({
      platform,
      accountId: manualToken.accountId,
      username: manualToken.username,
      accessToken: manualToken.accessToken,
    });
  };

  const getAccountForPlatform = (platformId: string) =>
    accounts?.filter(a => a.platform === platformId) || [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">حسابات التواصل الاجتماعي</h1>
            <p className="text-muted-foreground mt-1">
              اربط حساباتك على المنصات المختلفة لإدارة جميع رسائلك من مكان واحد
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              {accounts?.filter(a => a.status === "connected").length || 0} مربوط
            </Badge>
          </div>
        </div>

        {/* Platform Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLATFORMS.map((platform) => {
            const platformAccounts = getAccountForPlatform(platform.id);
            const connectedAccount = platformAccounts.find(a => a.status === "connected");
            const isConnected = !!connectedAccount;

            return (
              <Card key={platform.id} className={`border-2 transition-all ${isConnected ? platform.borderColor : "border-border"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-white shadow-lg`}>
                      {platform.icon}
                    </div>
                    <Badge
                      variant={isConnected ? "default" : "outline"}
                      className={isConnected ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200" : ""}
                    >
                      {isConnected ? (
                        <><CheckCircle2 className="w-3 h-3 ml-1" />مربوط</>
                      ) : (
                        <><XCircle className="w-3 h-3 ml-1" />غير مربوط</>
                      )}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{platform.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {platform.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* معلومات الحساب المربوط */}
                  {connectedAccount && (
                    <div className={`p-3 rounded-xl ${platform.bgColor} space-y-2`}>
                      <div className="flex items-center gap-2">
                        {connectedAccount.profilePicUrl ? (
                          <img
                            src={connectedAccount.profilePicUrl}
                            alt={connectedAccount.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${platform.color} flex items-center justify-center text-white text-xs font-bold`}>
                            {connectedAccount.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">@{connectedAccount.username}</p>
                          {connectedAccount.displayName && (
                            <p className="text-xs text-muted-foreground">{connectedAccount.displayName}</p>
                          )}
                        </div>
                      </div>
                      {(connectedAccount.followersCount ?? 0) > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{connectedAccount.followersCount?.toLocaleString("ar-SA")} متابع</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* متطلبات الربط */}
                  {!isConnected && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">المتطلبات:</p>
                      {platform.requirements.map((req, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                          <span>{req}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* أزرار الإجراءات */}
                  {isConnected ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => disconnectMutation.mutate({ id: connectedAccount.id })}
                        disabled={disconnectMutation.isPending}
                      >
                        <Link2Off className="w-4 h-4" />
                        قطع الاتصال
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate({ id: connectedAccount.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* زر الربط السريع عبر OAuth */}
                      <Button
                        className={`w-full gap-2 bg-gradient-to-r ${platform.color} text-white hover:opacity-90`}
                        onClick={() => handleOAuthConnect(platform.id)}
                      >
                        <Link2 className="w-4 h-4" />
                        ربط عبر {platform.name}
                        <ExternalLink className="w-3 h-3" />
                      </Button>

                      {/* زر الربط اليدوي */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 text-muted-foreground"
                        onClick={() => setShowManualDialog(platform.id)}
                      >
                        ربط يدوي بـ Access Token
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* إرشادات الربط */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-blue-800 dark:text-blue-200">كيفية الربط الصحيح</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  لربط إنستجرام: تحتاج حساب Business مرتبط بصفحة Facebook. اذهب إلى الإعدادات ← إنستجرام لإضافة App ID وApp Secret أولاً.
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  لربط تيك توك وسناب شات: تحتاج حساب Business Developer. يمكنك الربط اليدوي بـ Access Token مؤقتاً.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* جميع الحسابات المربوطة */}
        {(accounts?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">جميع الحسابات المربوطة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accounts?.map((account) => {
                  const platform = PLATFORMS.find(p => p.id === account.platform);
                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${platform?.color || "from-gray-400 to-gray-500"} flex items-center justify-center text-white`}>
                          {platform?.icon}
                        </div>
                        <div>
                          <p className="font-medium text-sm">@{account.username}</p>
                          <p className="text-xs text-muted-foreground">{platform?.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={account.status === "connected"
                            ? "text-green-600 border-green-300 bg-green-50"
                            : "text-red-600 border-red-300 bg-red-50"
                          }
                        >
                          {account.status === "connected" ? "متصل" : "منقطع"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                          onClick={() => deleteMutation.mutate({ id: account.id })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog الربط اليدوي */}
      <Dialog open={!!showManualDialog} onOpenChange={() => setShowManualDialog(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              ربط يدوي - {PLATFORMS.find(p => p.id === showManualDialog)?.name}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الحساب يدوياً إذا كنت تملك Access Token
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>معرف الحساب (Account ID)</Label>
              <Input
                placeholder="مثال: 123456789"
                value={manualToken.accountId}
                onChange={e => setManualToken(prev => ({ ...prev, accountId: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المستخدم (Username)</Label>
              <Input
                placeholder="مثال: my_business_account"
                value={manualToken.username}
                onChange={e => setManualToken(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="أدخل الـ Access Token"
                value={manualToken.accessToken}
                onChange={e => setManualToken(prev => ({ ...prev, accessToken: e.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => handleManualConnect(showManualDialog as "instagram" | "tiktok" | "snapchat")}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? (
                <><RefreshCw className="w-4 h-4 ml-2 animate-spin" />جاري الربط...</>
              ) : (
                <><Link2 className="w-4 h-4 ml-2" />ربط الحساب</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
