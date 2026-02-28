import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, UserPlus, Mail, Shield, Trash2, Copy, CheckCircle, Clock, XCircle, RefreshCw, Smartphone } from "lucide-react";

const PERMISSIONS_LABELS: Record<string, string> = {
  "leads.view": "عرض العملاء",
  "leads.add": "إضافة عملاء",
  "leads.edit": "تعديل العملاء",
  "leads.delete": "حذف العملاء",
  "whatsapp.send": "إرسال واتساب",
  "whatsapp.settings": "إعدادات واتساب",
  "search.use": "استخدام البحث",
  "analytics.view": "عرض التحليلات",
  "templates.manage": "إدارة القوالب",
};

const ALL_PERMISSIONS = Object.keys(PERMISSIONS_LABELS);

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "في الانتظار", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  accepted: { label: "مقبولة", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: <CheckCircle className="h-3 w-3" /> },
  expired: { label: "منتهية", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: <XCircle className="h-3 w-3" /> },
  revoked: { label: "ملغاة", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: <XCircle className="h-3 w-3" /> },
};

export default function UsersManagement() {
  const { user } = useAuth();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [invitePermissions, setInvitePermissions] = useState<string[]>(["leads.view", "search.use"]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: number; permissions: string[]; role: string; defaultWhatsappAccountId?: string | null } | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: invitations, isLoading: loadingInvitations } = trpc.invitations.listInvitations.useQuery();
  const { data: allUsers, isLoading: loadingUsers } = trpc.invitations.listUsers.useQuery();
  const { data: waAccounts } = trpc.waAccounts.listAccounts.useQuery();

  const sendInvitation = trpc.invitations.sendInvitation.useMutation({
    onSuccess: (data) => {
      toast.success("تم إرسال الدعوة", { description: `رابط الدعوة: ${data.inviteUrl}` });
      setInviteDialogOpen(false);
      setInviteEmail("");
      utils.invitations.listInvitations.invalidate();

      // نسخ الرابط تلقائياً
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      setCopiedLink(data.inviteUrl);
    },
    onError: (err) => toast.error("خطأ", { description: err.message }),
  });

  const revokeInvitation = trpc.invitations.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("تم إلغاء الدعوة");
      utils.invitations.listInvitations.invalidate();
    },
  });

  const updatePermissions = trpc.invitations.updateUserPermissions.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات");
      setEditingUser(null);
      utils.invitations.listUsers.invalidate();
    },
  });

  const setDefaultWa = trpc.invitations.setDefaultWhatsappAccount.useMutation({
    onSuccess: () => {
      utils.invitations.listUsers.invalidate();
    },
    onError: (err) => toast.error("خطأ في تعيين الحساب", { description: err.message }),
  });

  const togglePermission = (perm: string, current: string[], setter: (p: string[]) => void) => {
    if (current.includes(perm)) {
      setter(current.filter((p) => p !== perm));
    } else {
      setter([...current, perm]);
    }
  };

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    sendInvitation.mutate({
      email: inviteEmail,
      role: inviteRole,
      permissions: invitePermissions,
      origin: import.meta.env.VITE_APP_URL || window.location.origin,
    });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
    toast.success("تم نسخ الرابط");
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">هذه الصفحة للمدير فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            إدارة المستخدمين
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الفريق والصلاحيات</p>
        </div>
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              دعوة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                دعوة مستخدم جديد
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>الدور</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "user" | "admin")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم عادي</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">الصلاحيات</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`inv-${perm}`}
                        checked={invitePermissions.includes(perm)}
                        onCheckedChange={() => togglePermission(perm, invitePermissions, setInvitePermissions)}
                      />
                      <label htmlFor={`inv-${perm}`} className="text-sm cursor-pointer">
                        {PERMISSIONS_LABELS[perm]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSendInvite} disabled={sendInvitation.isPending || !inviteEmail} className="flex-1">
                  {sendInvitation.isPending ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : <Mail className="h-4 w-4 ml-2" />}
                  إرسال الدعوة
                </Button>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="users" dir="rtl">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            المستخدمون ({allUsers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <Mail className="h-4 w-4" />
            الدعوات ({invitations?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* تبويب المستخدمين */}
        <TabsContent value="users" className="mt-4">
          {loadingUsers ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-3">
              {allUsers?.map((u) => {
                const userWaAccount = waAccounts?.find(a => a.accountId === (u as any).defaultWhatsappAccountId);
                return (
                  <Card key={u.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{u.name || "بدون اسم"}</p>
                            <p className="text-sm text-muted-foreground">{u.email || "بدون إيميل"}</p>
                            <div className="flex items-center flex-wrap gap-2 mt-1">
                              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                                {u.role === "admin" ? "مدير" : "مستخدم"}
                              </Badge>
                              {(u as { permissions?: string[] }).permissions?.slice(0, 3).map((p) => (
                                <Badge key={p} variant="outline" className="text-xs">
                                  {PERMISSIONS_LABELS[p] || p}
                                </Badge>
                              ))}
                              {((u as { permissions?: string[] }).permissions?.length || 0) > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{((u as { permissions?: string[] }).permissions?.length || 0) - 3}
                                </Badge>
                              )}
                            </div>
                            {/* حساب واتساب الافتراضي */}
                            {waAccounts && waAccounts.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Smartphone className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                <span className="text-xs text-muted-foreground">واتساب الإرسال:</span>
                                <Select
                                  value={(u as any).defaultWhatsappAccountId || "none"}
                                  onValueChange={(val) => {
                                    setDefaultWa.mutate({
                                      userId: u.id,
                                      accountId: val === "none" ? null : val,
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs w-44 border-dashed">
                                    <SelectValue placeholder="غير محدد" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">غير محدد (الافتراضي)</SelectItem>
                                    {waAccounts.map(acc => (
                                      <SelectItem key={acc.accountId} value={acc.accountId}>
                                        {acc.label} — {acc.phoneNumber || acc.accountId}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {userWaAccount && (
                                  <span className="text-xs text-green-500">✓ {userWaAccount.label}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {u.id !== user?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setEditingUser({
                                id: u.id,
                                permissions: (u as { permissions?: string[] }).permissions || [],
                                role: u.role,
                                defaultWhatsappAccountId: (u as any).defaultWhatsappAccountId,
                              })
                            }
                          >
                            <Shield className="h-4 w-4 ml-1" />
                            تعديل الصلاحيات
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* تبويب الدعوات */}
        <TabsContent value="invitations" className="mt-4">
          {loadingInvitations ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : invitations?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد دعوات بعد</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations?.map((inv) => {
                const statusConfig = STATUS_CONFIG[inv.status] || STATUS_CONFIG.pending;
                const inviteUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/accept-invitation?token=${inv.token}`;
                return (
                  <Card key={inv.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{inv.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                                {statusConfig.icon}
                                {statusConfig.label}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {inv.role === "admin" ? "مدير" : "مستخدم"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                تنتهي: {new Date(inv.expiresAt).toLocaleDateString("ar-SA")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {inv.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyLink(inviteUrl)}
                                className="gap-1"
                              >
                                {copiedLink === inviteUrl ? (
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                نسخ الرابط
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => revokeInvitation.mutate({ id: inv.id })}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog تعديل صلاحيات مستخدم */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>تعديل الصلاحيات</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الدور</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(v) => setEditingUser({ ...editingUser, role: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم عادي</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* حساب واتساب الافتراضي في نافذة التعديل */}
              {waAccounts && waAccounts.length > 0 && (
                <div>
                  <Label className="mb-2 block flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    حساب واتساب الإرسال الافتراضي
                  </Label>
                  <Select
                    value={editingUser.defaultWhatsappAccountId || "none"}
                    onValueChange={(v) => setEditingUser({ ...editingUser, defaultWhatsappAccountId: v === "none" ? null : v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="غير محدد" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">غير محدد (الافتراضي للنظام)</SelectItem>
                      {waAccounts.map(acc => (
                        <SelectItem key={acc.accountId} value={acc.accountId}>
                          {acc.label} — {acc.phoneNumber || acc.accountId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    سيُستخدم هذا الحساب تلقائياً عند إرسال رسائل واتساب من قِبل هذا الموظف
                  </p>
                </div>
              )}
              <div>
                <Label className="mb-2 block">الصلاحيات</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 bg-muted/30">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${perm}`}
                        checked={editingUser.permissions.includes(perm)}
                        onCheckedChange={() =>
                          setEditingUser({
                            ...editingUser,
                            permissions: editingUser.permissions.includes(perm)
                              ? editingUser.permissions.filter((p) => p !== perm)
                              : [...editingUser.permissions, perm],
                          })
                        }
                      />
                      <label htmlFor={`edit-${perm}`} className="text-sm cursor-pointer">
                        {PERMISSIONS_LABELS[perm]}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    // حفظ الصلاحيات والدور
                    updatePermissions.mutate({
                      userId: editingUser.id,
                      permissions: editingUser.permissions,
                      role: editingUser.role as "user" | "admin",
                    });
                    // حفظ حساب واتساب الافتراضي إذا تغيّر
                    setDefaultWa.mutate({
                      userId: editingUser.id,
                      accountId: editingUser.defaultWhatsappAccountId || null,
                    });
                  }}
                  disabled={updatePermissions.isPending}
                  className="flex-1"
                >
                  {updatePermissions.isPending ? <RefreshCw className="h-4 w-4 animate-spin ml-2" /> : null}
                  حفظ التغييرات
                </Button>
                <Button variant="outline" onClick={() => setEditingUser(null)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
