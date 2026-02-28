import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // أولاً: نجرّب Manus OAuth
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // ثانياً: نجرّب Staff session (للموظفين)
  const staffMeQuery = trpc.staffAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    // نشغّله فقط إذا لم يكن Manus مسجّلاً
    enabled: !meQuery.data && !meQuery.isLoading,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const staffLogoutMutation = trpc.staffAuth.logout.useMutation({
    onSuccess: () => {
      utils.staffAuth.me.setData(undefined, null);
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // تسجيل خروج من كلا النظامَين
      await staffLogoutMutation.mutateAsync();
      await logoutMutation.mutateAsync().catch(() => {});
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
    } finally {
      utils.auth.me.setData(undefined, null);
      utils.staffAuth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      await utils.staffAuth.me.invalidate();
    }
  }, [logoutMutation, staffLogoutMutation, utils]);

  const state = useMemo(() => {
    // استخدم Manus user أولاً، ثم staff user
    const currentUser = meQuery.data ?? staffMeQuery.data ?? null;
    const isLoading = meQuery.isLoading || (staffMeQuery.fetchStatus !== "idle" && staffMeQuery.isLoading);

    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(currentUser)
    );

    return {
      user: currentUser,
      loading: isLoading || logoutMutation.isPending || staffLogoutMutation.isPending,
      error: meQuery.error ?? staffMeQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(currentUser),
      loginType: meQuery.data ? "manus" : (staffMeQuery.data ? "staff" : null),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    staffMeQuery.data,
    staffMeQuery.error,
    staffMeQuery.isLoading,
    staffMeQuery.fetchStatus,
    logoutMutation.error,
    logoutMutation.isPending,
    staffLogoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (state.loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/staff-login") return;
    if (window.location.pathname === "/accept-invitation") return;

    window.location.href = "/staff-login";
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    state.loading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => {
      meQuery.refetch();
      staffMeQuery.refetch();
    },
    logout,
  };
}
