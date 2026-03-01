/**
 * Unified Inbox Router
 * يجمع رسائل واتساب + إنستجرام + تيك توك + سناب شات في مكان واحد
 * مثل Meta Business Suite
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  socialAccounts,
  socialConversations,
  socialMessages,
  whatsappChats,
  whatsappChatMessages,
  platformCredentials,
} from "../../drizzle/schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ===== SOCIAL ACCOUNTS MANAGEMENT =====
const socialAccountsRouter = router({
  // جلب جميع الحسابات المربوطة
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(socialAccounts).orderBy(desc(socialAccounts.createdAt));
  }),

  // ربط حساب جديد
  connect: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "snapchat"]),
      accessToken: z.string(),
      accountId: z.string(),
      username: z.string(),
      displayName: z.string().optional(),
      profilePicUrl: z.string().optional(),
      pageId: z.string().optional(),
      followersCount: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في قاعدة البيانات" });

      // تحقق من عدم وجود حساب مكرر
      const existing = await db.select().from(socialAccounts)
        .where(and(
          eq(socialAccounts.platform, input.platform),
          eq(socialAccounts.accountId, input.accountId)
        )).limit(1);

      if (existing.length > 0) {
        await db.update(socialAccounts)
          .set({
            accessToken: input.accessToken,
            username: input.username,
            displayName: input.displayName,
            profilePicUrl: input.profilePicUrl,
            status: "connected",
            isActive: true,
            followersCount: input.followersCount ?? 0,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing[0].id));
        return { id: existing[0].id, updated: true };
      }

      await db.insert(socialAccounts).values({
        platform: input.platform,
        accountId: input.accountId,
        username: input.username,
        displayName: input.displayName,
        profilePicUrl: input.profilePicUrl,
        accessToken: input.accessToken,
        pageId: input.pageId,
        status: "connected",
        isActive: true,
        followersCount: input.followersCount ?? 0,
      });

      const inserted = await db.select().from(socialAccounts)
        .where(and(
          eq(socialAccounts.platform, input.platform),
          eq(socialAccounts.accountId, input.accountId)
        )).limit(1);

      return { id: inserted[0]?.id ?? 0, updated: false };
    }),

  // قطع الاتصال بحساب
  disconnect: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(socialAccounts)
        .set({ status: "disconnected", isActive: false, accessToken: null, updatedAt: new Date() })
        .where(eq(socialAccounts.id, input.id));
      return { success: true };
    }),

  // حذف حساب
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(socialAccounts).where(eq(socialAccounts.id, input.id));
      return { success: true };
    }),

  // توليد رابط OAuth للمنصة
  getOAuthUrl: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "snapchat"]),
      redirectUri: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const state = Buffer.from(JSON.stringify({
        platform: input.platform,
        ts: Date.now(),
      })).toString("base64");

      // جلب المفاتيح من قاعدة البيانات أولاً
      let dbCreds: { appId: string | null; appSecret: string | null } | null = null;
      if (db) {
        const rows = await db.select().from(platformCredentials)
          .where(eq(platformCredentials.platform, input.platform))
          .limit(1);
        if (rows[0]) dbCreds = { appId: rows[0].appId, appSecret: rows[0].appSecret };
      }

      let url = "";
      switch (input.platform) {
        case "instagram": {
          const appId = dbCreds?.appId || process.env.INSTAGRAM_APP_ID || "";
          if (!appId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "يرجى حفظ Instagram App ID أولاً" });
          const scopes = [
            "instagram_basic",
            "instagram_manage_messages",
            "pages_show_list",
            "pages_read_engagement",
            "public_profile",
          ].join(",");
          url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(input.redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
          break;
        }
        case "tiktok": {
          const clientKey = dbCreds?.appId || process.env.TIKTOK_CLIENT_KEY || "";
          if (!clientKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "يرجى حفظ TikTok Client Key أولاً" });
          const scopes = "user.info.basic,video.list";
          url = `https://www.tiktok.com/v2/auth/authorize?client_key=${clientKey}&scope=${scopes}&response_type=code&redirect_uri=${encodeURIComponent(input.redirectUri)}&state=${state}`;
          break;
        }
        case "snapchat": {
          const clientId = dbCreds?.appId || process.env.SNAPCHAT_CLIENT_ID || "";
          if (!clientId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "يرجى حفظ Snapchat Client ID أولاً" });
          const scopes = "snapchat-marketing-api";
          url = `https://accounts.snapchat.com/login/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(input.redirectUri)}&response_type=code&scope=${scopes}&state=${state}`;
          break;
        }
      }

      return { url, state };
    }),

  // استبدال OAuth code بـ access token
  exchangeCode: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "snapchat"]),
      code: z.string(),
      redirectUri: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let accountData: {
        accountId: string;
        username: string;
        displayName?: string;
        accessToken: string;
        profilePicUrl?: string;
        pageId?: string;
        followersCount?: number;
      } | null = null;

      // جلب المفاتيح من قاعدة البيانات أولاً
      let dbCreds2: { appId: string | null; appSecret: string | null } | null = null;
      {
        const rows = await db.select().from(platformCredentials)
          .where(eq(platformCredentials.platform, input.platform))
          .limit(1);
        if (rows[0]) dbCreds2 = { appId: rows[0].appId, appSecret: rows[0].appSecret };
      }

      if (input.platform === "instagram") {
        const appId = dbCreds2?.appId || process.env.INSTAGRAM_APP_ID || "";
        const appSecret = dbCreds2?.appSecret || process.env.INSTAGRAM_APP_SECRET || "";

        if (!appId || !appSecret) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "يرجى حفظ Instagram App ID وApp Secret في صفحة حسابات التواصل أولاً",
          });
        }

        // استبدال الـ code بـ access token
        const tokenRes = await fetch(
          `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${input.code}&redirect_uri=${encodeURIComponent(input.redirectUri)}`
        );
        const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };

        if (!tokenData.access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: tokenData.error?.message || "فشل الحصول على التوكن",
          });
        }

        // جلب صفحات Facebook المرتبطة
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`
        );
        const pagesData = await pagesRes.json() as {
          data?: Array<{ id: string; name: string; access_token: string }>;
        };

        const page = pagesData.data?.[0];
        if (!page) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "لم يتم العثور على صفحة Facebook مرتبطة بحساب إنستجرام Business",
          });
        }

        // جلب حساب إنستجرام Business
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        const igData = await igRes.json() as {
          instagram_business_account?: { id: string };
        };

        const igAccountId = igData.instagram_business_account?.id;
        if (!igAccountId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "الصفحة غير مرتبطة بحساب إنستجرام Business. يرجى ربط حساب إنستجرام بصفحة Facebook",
          });
        }

        // جلب بيانات حساب إنستجرام
        const igProfileRes = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,name,profile_picture_url,followers_count&access_token=${page.access_token}`
        );
        const igProfile = await igProfileRes.json() as {
          username?: string;
          name?: string;
          profile_picture_url?: string;
          followers_count?: number;
        };

        accountData = {
          accountId: igAccountId,
          username: igProfile.username || igAccountId,
          displayName: igProfile.name,
          accessToken: page.access_token,
          profilePicUrl: igProfile.profile_picture_url,
          pageId: page.id,
          followersCount: igProfile.followers_count,
        };
      } else if (input.platform === "tiktok") {
        const clientKey = dbCreds2?.appId || process.env.TIKTOK_CLIENT_KEY || "";
        const clientSecret = dbCreds2?.appSecret || process.env.TIKTOK_CLIENT_SECRET || "";

        if (!clientKey || !clientSecret) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "يرجى حفظ TikTok Client Key وClient Secret في صفحة حسابات التواصل أولاً",
          });
        }

        const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: clientKey,
            client_secret: clientSecret,
            code: input.code,
            grant_type: "authorization_code",
            redirect_uri: input.redirectUri,
          }),
        });
        const tokenData = await tokenRes.json() as {
          data?: { access_token: string; open_id: string };
          error?: string;
        };

        if (!tokenData.data?.access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: tokenData.error || "فشل الحصول على توكن تيك توك",
          });
        }

        // جلب بيانات المستخدم
        const userRes = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username",
          { headers: { Authorization: `Bearer ${tokenData.data.access_token}` } }
        );
        const userData = await userRes.json() as {
          data?: { user?: { open_id: string; display_name: string; username: string; avatar_url: string } };
        };

        const user = userData.data?.user;
        accountData = {
          accountId: tokenData.data.open_id,
          username: user?.username || tokenData.data.open_id,
          displayName: user?.display_name,
          accessToken: tokenData.data.access_token,
          profilePicUrl: user?.avatar_url,
        };
      } else if (input.platform === "snapchat") {
        const clientId = dbCreds2?.appId || process.env.SNAPCHAT_CLIENT_ID || "";
        const clientSecret = dbCreds2?.appSecret || process.env.SNAPCHAT_CLIENT_SECRET || "";

        if (!clientId || !clientSecret) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "يرجى حفظ Snapchat Client ID وClient Secret في صفحة حسابات التواصل أولاً",
          });
        }

        const tokenRes = await fetch("https://accounts.snapchat.com/login/oauth2/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: new URLSearchParams({
            code: input.code,
            grant_type: "authorization_code",
            redirect_uri: input.redirectUri,
          }),
        });
        const tokenData = await tokenRes.json() as {
          access_token?: string;
          error?: string;
        };

        if (!tokenData.access_token) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: tokenData.error || "فشل الحصول على توكن سناب شات",
          });
        }

        // جلب بيانات المستخدم
        const userRes = await fetch("https://adsapi.snapchat.com/v1/me", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userRes.json() as {
          me?: { id: string; display_name: string; email: string };
        };

        accountData = {
          accountId: userData.me?.id || "snapchat_user",
          username: userData.me?.email || "snapchat_user",
          displayName: userData.me?.display_name,
          accessToken: tokenData.access_token,
        };
      }

      if (!accountData) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل جلب بيانات الحساب" });
      }

      // حفظ الحساب في قاعدة البيانات
      const existing = await db.select().from(socialAccounts)
        .where(and(
          eq(socialAccounts.platform, input.platform),
          eq(socialAccounts.accountId, accountData.accountId)
        )).limit(1);

      if (existing.length > 0) {
        await db.update(socialAccounts)
          .set({
            accessToken: accountData.accessToken,
            username: accountData.username,
            displayName: accountData.displayName,
            profilePicUrl: accountData.profilePicUrl,
            pageId: accountData.pageId,
            status: "connected",
            isActive: true,
            followersCount: accountData.followersCount ?? 0,
            updatedAt: new Date(),
          })
          .where(eq(socialAccounts.id, existing[0].id));
        return { success: true, account: { ...accountData, id: existing[0].id }, updated: true };
      }

      await db.insert(socialAccounts).values({
        platform: input.platform,
        accountId: accountData.accountId,
        username: accountData.username,
        displayName: accountData.displayName,
        profilePicUrl: accountData.profilePicUrl,
        accessToken: accountData.accessToken,
        pageId: accountData.pageId,
        status: "connected",
        isActive: true,
        followersCount: accountData.followersCount ?? 0,
      });

      return { success: true, account: accountData, updated: false };
    }),
});

// ===== CONVERSATIONS MANAGEMENT =====
const conversationsRouter = router({
  // جلب جميع المحادثات (مجمعة من كل المنصات)
  list: protectedProcedure
    .input(z.object({
      platform: z.enum(["all", "instagram", "tiktok", "snapchat", "whatsapp"]).default("all"),
      status: z.enum(["all", "open", "closed", "pending"]).default("all"),
      unreadOnly: z.boolean().default(false),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { conversations: [], totalUnread: 0, total: 0 };

      // جلب محادثات المنصات الاجتماعية
      const socialConditions = [];
      if (input.platform !== "all" && input.platform !== "whatsapp") {
        socialConditions.push(eq(socialConversations.platform, input.platform as "instagram" | "tiktok" | "snapchat"));
      }
      if (input.status !== "all") {
        socialConditions.push(eq(socialConversations.status, input.status as "open" | "closed" | "pending"));
      }
      if (input.unreadOnly) {
        socialConditions.push(eq(socialConversations.isRead, false));
      }
      if (input.search) {
        socialConditions.push(
          or(
            like(socialConversations.senderUsername, `%${input.search}%`),
            like(socialConversations.senderDisplayName, `%${input.search}%`),
            like(socialConversations.lastMessagePreview, `%${input.search}%`)
          )
        );
      }

      const socialConvs = (input.platform === "whatsapp") ? [] :
        await db.select().from(socialConversations)
          .where(socialConditions.length > 0 ? and(...socialConditions) : undefined)
          .orderBy(desc(socialConversations.lastMessageAt))
          .limit(input.platform === "all" ? Math.floor(input.limit / 2) : input.limit)
          .offset(input.offset);

      // جلب محادثات واتساب
      const waConditions = [];
      if (input.search) {
        waConditions.push(
          or(
            like(whatsappChats.phone, `%${input.search}%`),
            like(whatsappChats.contactName, `%${input.search}%`)
          )
        );
      }

      const waConvs = (input.platform !== "all" && input.platform !== "whatsapp") ? [] :
        await db.select({
          id: whatsappChats.id,
          platform: sql<string>`'whatsapp'`,
          senderUsername: whatsappChats.phone,
          senderDisplayName: whatsappChats.contactName,
          senderProfilePic: sql<string | null>`NULL`,
          lastMessagePreview: whatsappChats.lastMessage,
          lastMessageAt: whatsappChats.lastMessageAt,
          unreadCount: whatsappChats.unreadCount,
          isRead: sql<boolean>`${whatsappChats.unreadCount} = 0`,
          isArchived: whatsappChats.isArchived,
          status: sql<string>`'open'`,
          leadId: whatsappChats.leadId,
          accountId: whatsappChats.accountId,
          aiAutoReply: whatsappChats.aiAutoReplyEnabled,
          socialAccountId: sql<number>`0`,
          externalConversationId: sql<string | null>`NULL`,
          senderExternalId: whatsappChats.phone,
          assignedTo: sql<number | null>`NULL`,
          createdAt: whatsappChats.createdAt,
          updatedAt: whatsappChats.updatedAt,
        }).from(whatsappChats)
          .where(waConditions.length > 0 ? and(...waConditions) : undefined)
          .orderBy(desc(whatsappChats.lastMessageAt))
          .limit(input.platform === "all" ? Math.floor(input.limit / 2) : input.limit)
          .offset(input.offset);

      // دمج وترتيب حسب آخر رسالة
      const allConvs = [
        ...socialConvs.map(c => ({ ...c, source: "social" as const })),
        ...waConvs.map(c => ({ ...c, source: "whatsapp" as const })),
      ].sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      const totalUnread = allConvs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

      return {
        conversations: allConvs,
        totalUnread,
        total: allConvs.length,
      };
    }),

  // جلب رسائل محادثة معينة
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      platform: z.enum(["instagram", "tiktok", "snapchat", "whatsapp"]),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.platform === "whatsapp") {
        const messages = await db.select().from(whatsappChatMessages)
          .where(eq(whatsappChatMessages.chatId, input.conversationId))
          .orderBy(desc(whatsappChatMessages.sentAt))
          .limit(input.limit)
          .offset(input.offset);
        return messages.map(m => ({
          id: m.id,
          direction: m.direction,
          content: m.message,
          messageType: "text" as const,
          status: m.status,
          sentAt: m.sentAt,
          senderType: m.direction === "incoming" ? "customer" : "agent",
          platform: "whatsapp" as const,
        }));
      }

      const messages = await db.select().from(socialMessages)
        .where(eq(socialMessages.conversationId, input.conversationId))
        .orderBy(desc(socialMessages.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      // تعليم المحادثة كمقروءة
      await db.update(socialConversations)
        .set({ isRead: true, unreadCount: 0 })
        .where(eq(socialConversations.id, input.conversationId));

      return messages;
    }),

  // إرسال رسالة
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      platform: z.enum(["instagram", "tiktok", "snapchat", "whatsapp"]),
      content: z.string().min(1),
      whatsappAccountId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (input.platform === "whatsapp") {
        const chat = await db.select().from(whatsappChats)
          .where(eq(whatsappChats.id, input.conversationId))
          .limit(1);

        if (!chat[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة" });

        const accountId = input.whatsappAccountId || chat[0].accountId;
        try {
          const response = await fetch(`http://localhost:3001/api/whatsapp/${accountId}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: chat[0].phone, message: input.content }),
          });
          if (!response.ok) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "فشل إرسال الرسالة عبر واتساب" });
          }
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر الاتصال بخادم واتساب" });
        }
        return { success: true, platform: "whatsapp" };
      }

      // المنصات الأخرى
      const conv = await db.select().from(socialConversations)
        .where(eq(socialConversations.id, input.conversationId))
        .limit(1);

      if (!conv[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة" });

      const account = await db.select().from(socialAccounts)
        .where(eq(socialAccounts.id, conv[0].socialAccountId))
        .limit(1);

      if (!account[0] || !account[0].accessToken) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "الحساب غير مربوط أو التوكن منتهي" });
      }

      let sendSuccess = false;
      let errorMsg = "";

      if (input.platform === "instagram") {
        try {
          const igResponse = await fetch("https://graph.facebook.com/v19.0/me/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${account[0].accessToken}`,
            },
            body: JSON.stringify({
              recipient: { id: conv[0].senderExternalId },
              message: { text: input.content },
            }),
          });
          sendSuccess = igResponse.ok;
          if (!igResponse.ok) {
            const err = await igResponse.json() as { error?: { message: string } };
            errorMsg = err?.error?.message || "فشل الإرسال";
          }
        } catch (e) {
          errorMsg = String(e);
        }
      } else {
        // تيك توك وسناب شات - حفظ كمحاولة إرسال (لا يوجد API رسائل مباشر)
        sendSuccess = true;
      }

      await db.insert(socialMessages).values({
        conversationId: input.conversationId,
        platform: input.platform as "instagram" | "tiktok" | "snapchat",
        direction: "outbound",
        senderType: "agent",
        messageType: "text",
        content: input.content,
        status: sendSuccess ? "sent" : "failed",
        errorMessage: errorMsg || undefined,
        sentAt: new Date(),
      });

      await db.update(socialConversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: input.content.substring(0, 100),
          updatedAt: new Date(),
        })
        .where(eq(socialConversations.id, input.conversationId));

      if (!sendSuccess && input.platform === "instagram") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `فشل إرسال الرسالة: ${errorMsg}` });
      }

      return { success: true };
    }),

  // تعليم محادثة كمقروءة
  markAsRead: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      platform: z.enum(["instagram", "tiktok", "snapchat", "whatsapp"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      if (input.platform === "whatsapp") {
        await db.update(whatsappChats).set({ unreadCount: 0 }).where(eq(whatsappChats.id, input.conversationId));
      } else {
        await db.update(socialConversations).set({ isRead: true, unreadCount: 0 }).where(eq(socialConversations.id, input.conversationId));
      }
      return { success: true };
    }),

  // تفعيل/تعطيل الرد التلقائي
  toggleAiReply: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      platform: z.enum(["instagram", "tiktok", "snapchat", "whatsapp"]),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      if (input.platform === "whatsapp") {
        await db.update(whatsappChats).set({ aiAutoReplyEnabled: input.enabled }).where(eq(whatsappChats.id, input.conversationId));
      } else {
        await db.update(socialConversations).set({ aiAutoReply: input.enabled }).where(eq(socialConversations.id, input.conversationId));
      }
      return { success: true };
    }),

  // توليد رد ذكي
  generateAiReply: protectedProcedure
    .input(z.object({
      lastMessages: z.array(z.object({
        direction: z.string(),
        content: z.string(),
      })).max(10),
    }))
    .mutation(async ({ input }) => {
      const context = input.lastMessages
        .map(m => `${m.direction === "inbound" ? "العميل" : "أنت"}: ${m.content}`)
        .join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "أنت مساعد مبيعات احترافي سعودي. رد على رسائل العملاء بأسلوب ودي ومهني باللغة العربية. اجعل الرد مختصراً وطبيعياً (2-3 جمل).",
          },
          { role: "user", content: `المحادثة:\n${context}\n\nاكتب رداً مناسباً:` },
        ],
      });

      const reply = response.choices?.[0]?.message?.content || "";
      return { reply };
    }),

  // إحصائيات الـ Inbox
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalConversations: 0, unreadConversations: 0, openConversations: 0, connectedAccounts: 0, totalAccounts: 0 };

    const [socialStats] = await db.select({
      totalConvs: sql<number>`COUNT(*)`,
      unreadConvs: sql<number>`SUM(CASE WHEN ${socialConversations.isRead} = 0 THEN 1 ELSE 0 END)`,
      openConvs: sql<number>`SUM(CASE WHEN ${socialConversations.status} = 'open' THEN 1 ELSE 0 END)`,
    }).from(socialConversations);

    const [waStats] = await db.select({
      totalChats: sql<number>`COUNT(*)`,
      unreadChats: sql<number>`SUM(CASE WHEN ${whatsappChats.unreadCount} > 0 THEN 1 ELSE 0 END)`,
    }).from(whatsappChats);

    const [accountStats] = await db.select({
      total: sql<number>`COUNT(*)`,
      connected: sql<number>`SUM(CASE WHEN ${socialAccounts.status} = 'connected' THEN 1 ELSE 0 END)`,
    }).from(socialAccounts);

    return {
      totalConversations: (socialStats?.totalConvs || 0) + (waStats?.totalChats || 0),
      unreadConversations: (socialStats?.unreadConvs || 0) + (waStats?.unreadChats || 0),
      openConversations: socialStats?.openConvs || 0,
      connectedAccounts: accountStats?.connected || 0,
      totalAccounts: accountStats?.total || 0,
    };
  }),
});

// ===== Instagram Webhook Handler =====
export const instagramWebhookHandler = async (body: Record<string, unknown>) => {
  const db = await getDb();
  if (!db) return;
  try {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    if (!entry) return;
    const messagingArr = (entry.messaging as Array<Record<string, unknown>>)?.[0];
    if (!messagingArr) return;

    const senderId = String((messagingArr.sender as Record<string, unknown>)?.id || "");
    const recipientId = String((messagingArr.recipient as Record<string, unknown>)?.id || "");
    const message = messagingArr.message as Record<string, unknown> | undefined;
    if (!message) return;

    const messageText = String(message.text || "");
    const messageId = String(message.mid || "");

    const account = await db.select().from(socialAccounts)
      .where(and(eq(socialAccounts.platform, "instagram"), eq(socialAccounts.accountId, recipientId)))
      .limit(1);
    if (!account[0]) return;

    let conversation = await db.select().from(socialConversations)
      .where(and(eq(socialConversations.socialAccountId, account[0].id), eq(socialConversations.senderExternalId, senderId)))
      .limit(1);

    if (!conversation[0]) {
      await db.insert(socialConversations).values({
        socialAccountId: account[0].id,
        platform: "instagram",
        senderExternalId: senderId,
        senderUsername: senderId,
        lastMessageAt: new Date(),
        lastMessagePreview: messageText.substring(0, 100),
        unreadCount: 1,
        isRead: false,
      });
      conversation = await db.select().from(socialConversations)
        .where(and(eq(socialConversations.socialAccountId, account[0].id), eq(socialConversations.senderExternalId, senderId)))
        .limit(1);
    } else {
      await db.update(socialConversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: messageText.substring(0, 100),
          unreadCount: sql`${socialConversations.unreadCount} + 1`,
          isRead: false,
          updatedAt: new Date(),
        })
        .where(eq(socialConversations.id, conversation[0].id));
    }

    if (!conversation[0]) return;

    await db.insert(socialMessages).values({
      conversationId: conversation[0].id,
      platform: "instagram",
      externalMessageId: messageId,
      direction: "inbound",
      senderType: "customer",
      messageType: "text",
      content: messageText,
      status: "delivered",
      sentAt: new Date(),
    });
  } catch (e) {
    console.error("[InstagramWebhook] Error:", e);
  }
};

// ===== PLATFORM CREDENTIALS MANAGEMENT =====
const platformCredentialsRouter = router({
  // جلب مفاتيح API لمنصة معينة
  get: protectedProcedure
    .input(z.object({ platform: z.enum(["instagram", "tiktok", "snapchat"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(platformCredentials)
        .where(eq(platformCredentials.platform, input.platform))
        .limit(1);
      if (!result[0]) return null;
      // إخفاء الـ secret جزئياً للأمان
      const cred = result[0];
      return {
        ...cred,
        appSecret: cred.appSecret ? "***" + cred.appSecret.slice(-4) : null,
        _hasSecret: !!cred.appSecret,
      };
    }),

  // جلب جميع مفاتيح API
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const results = await db.select().from(platformCredentials);
    return results.map(cred => ({
      ...cred,
      appSecret: cred.appSecret ? "***" + cred.appSecret.slice(-4) : null,
      _hasSecret: !!cred.appSecret,
    }));
  }),

  // حفظ مفاتيح API
  save: protectedProcedure
    .input(z.object({
      platform: z.enum(["instagram", "tiktok", "snapchat"]),
      appId: z.string().optional(),
      appSecret: z.string().optional(),
      extraField1: z.string().optional(),
      extraField2: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select().from(platformCredentials)
        .where(eq(platformCredentials.platform, input.platform))
        .limit(1);

      const isConfigured = !!(input.appId && input.appSecret);

      if (existing.length > 0) {
        const updateData: Record<string, unknown> = {
          isConfigured,
          updatedAt: new Date(),
        };
        if (input.appId !== undefined) updateData.appId = input.appId;
        // فقط تحديث الـ secret إذا لم يكن "***..."
        if (input.appSecret !== undefined && !input.appSecret.startsWith("***")) {
          updateData.appSecret = input.appSecret;
        }
        if (input.extraField1 !== undefined) updateData.extraField1 = input.extraField1;
        if (input.extraField2 !== undefined) updateData.extraField2 = input.extraField2;

        await db.update(platformCredentials)
          .set(updateData)
          .where(eq(platformCredentials.id, existing[0].id));
      } else {
        await db.insert(platformCredentials).values({
          platform: input.platform,
          appId: input.appId,
          appSecret: input.appSecret,
          extraField1: input.extraField1,
          extraField2: input.extraField2,
          isConfigured,
        });
      }

      return { success: true, isConfigured };
    }),

  // حذف مفاتيح API
  delete: protectedProcedure
    .input(z.object({ platform: z.enum(["instagram", "tiktok", "snapchat"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(platformCredentials)
        .where(eq(platformCredentials.platform, input.platform));
      return { success: true };
    }),
});

export const unifiedInboxRouter = router({
  accounts: socialAccountsRouter,
  conversations: conversationsRouter,
  credentials: platformCredentialsRouter,
});
