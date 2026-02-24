/**
 * إعدادات واتساب: التأخير، التنبيهات، الرد التلقائي، المحادثات
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, like, sql, gte } from "drizzle-orm";
import {
  whatsappSettings,
  autoReplyRules,
  whatsappChats,
  whatsappChatMessages,
  whatsappAccounts,
  users,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";

export const whatsappSettingsRouter = router({
  // جلب إعدادات حساب واتساب
  getSettings: protectedProcedure
    .input(z.object({ accountId: z.string().default("default") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [settings] = await db
        .select()
        .from(whatsappSettings)
        .where(eq(whatsappSettings.accountId, input.accountId))
        .limit(1);

      return settings || null;
    }),

  // تحديث إعدادات واتساب
  updateSettings: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        messageDelay: z.number().min(3000).max(60000).optional(),
        notificationThreshold: z.number().min(1).max(1000).optional(),
        autoReplyEnabled: z.boolean().optional(),
        accountLabel: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db
        .select()
        .from(whatsappSettings)
        .where(eq(whatsappSettings.accountId, input.accountId))
        .limit(1);

      const updateData: Record<string, unknown> = {};
      if (input.messageDelay !== undefined) updateData.messageDelay = input.messageDelay;
      if (input.notificationThreshold !== undefined) updateData.notificationThreshold = input.notificationThreshold;
      if (input.autoReplyEnabled !== undefined) updateData.autoReplyEnabled = input.autoReplyEnabled;
      if (input.accountLabel !== undefined) updateData.accountLabel = input.accountLabel;

      if (existing) {
        await db.update(whatsappSettings).set(updateData).where(eq(whatsappSettings.accountId, input.accountId));
      } else {
        await db.insert(whatsappSettings).values({
          accountId: input.accountId,
          accountLabel: input.accountLabel || "الحساب الرئيسي",
          messageDelay: input.messageDelay || 10000,
          notificationThreshold: input.notificationThreshold || 50,
          autoReplyEnabled: input.autoReplyEnabled || false,
        });
      }

      return { success: true };
    }),

  // تحديث عداد الرسائل المرسلة (يُستدعى بعد كل إرسال مجمع)
  incrementMessageCount: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        count: z.number().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { notificationTriggered: false };

      const [settings] = await db
        .select()
        .from(whatsappSettings)
        .where(eq(whatsappSettings.accountId, input.accountId))
        .limit(1);

      if (!settings) return { notificationTriggered: false };

      const newTotal = settings.totalMessagesSent + input.count;
      const newToday = settings.messagesSentToday + input.count;

      await db
        .update(whatsappSettings)
        .set({ totalMessagesSent: newTotal, messagesSentToday: newToday })
        .where(eq(whatsappSettings.accountId, input.accountId));

      // التحقق من عتبة التنبيه
      const prevMilestone = Math.floor(settings.totalMessagesSent / settings.notificationThreshold);
      const newMilestone = Math.floor(newTotal / settings.notificationThreshold);

      if (newMilestone > prevMilestone) {
        await notifyOwner({
          title: `تنبيه واتساب: وصلت ${newTotal} رسالة`,
          content: `تم إرسال ${newTotal} رسالة عبر حساب "${settings.accountLabel}"\nرسائل اليوم: ${newToday}`,
        });
        return { notificationTriggered: true, totalSent: newTotal };
      }

      return { notificationTriggered: false, totalSent: newTotal };
    }),

  // ===== قواعد الرد التلقائي =====

  // قائمة قواعد الرد التلقائي
  listAutoReplyRules: protectedProcedure
    .input(z.object({ accountId: z.string().default("default") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(autoReplyRules)
        .where(eq(autoReplyRules.accountId, input.accountId))
        .orderBy(desc(autoReplyRules.createdAt));
    }),

  // إضافة قاعدة رد تلقائي
  addAutoReplyRule: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        triggerKeywords: z.array(z.string()).min(1),
        replyTemplate: z.string().min(1),
        useAI: z.boolean().default(false),
        aiContext: z.string().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(autoReplyRules).values({
        accountId: input.accountId,
        triggerKeywords: input.triggerKeywords,
        replyTemplate: input.replyTemplate,
        useAI: input.useAI,
        aiContext: input.aiContext,
        isActive: input.isActive,
      });

      return { success: true, id: (result as { insertId: number }).insertId };
    }),

  // تحديث قاعدة رد تلقائي
  updateAutoReplyRule: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        triggerKeywords: z.array(z.string()).optional(),
        replyTemplate: z.string().optional(),
        useAI: z.boolean().optional(),
        aiContext: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...updateData } = input;
      const filtered = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );

      await db.update(autoReplyRules).set(filtered).where(eq(autoReplyRules.id, id));
      return { success: true };
    }),

  // حذف قاعدة رد تلقائي
  deleteAutoReplyRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(autoReplyRules).where(eq(autoReplyRules.id, input.id));
      return { success: true };
    }),

  // توليد رد تلقائي بالذكاء الاصطناعي
  generateAutoReply: protectedProcedure
    .input(
      z.object({
        incomingMessage: z.string(),
        accountId: z.string().default("default"),
        contactName: z.string().optional(),
        businessContext: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // البحث عن قاعدة مطابقة
      const rules = await db
        .select()
        .from(autoReplyRules)
        .where(
          and(
            eq(autoReplyRules.accountId, input.accountId),
            eq(autoReplyRules.isActive, true)
          )
        );

      const msgLower = input.incomingMessage.toLowerCase();
      let matchedRule = null;

      for (const rule of rules) {
        const keywords = rule.triggerKeywords as string[];
        if (keywords.some((kw) => msgLower.includes(kw.toLowerCase()))) {
          matchedRule = rule;
          break;
        }
      }

      if (!matchedRule) {
        return { matched: false, reply: null };
      }

      // تحديث عداد المطابقات
      await db
        .update(autoReplyRules)
        .set({ matchCount: matchedRule.matchCount + 1 })
        .where(eq(autoReplyRules.id, matchedRule.id));

      let reply = matchedRule.replyTemplate;

      // استخدام الذكاء الاصطناعي إذا كان مفعلاً
      if (matchedRule.useAI) {
        const aiResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت مساعد تجاري سعودي محترف. ${matchedRule.aiContext || ""}
              
مهمتك: الرد على رسائل العملاء بشكل ودي ومهني باللغة العربية.
قالب الرد الأساسي: ${matchedRule.replyTemplate}
${input.businessContext ? `سياق العمل: ${input.businessContext}` : ""}`,
            },
            {
              role: "user",
              content: `رسالة العميل${input.contactName ? ` (${input.contactName})` : ""}: "${input.incomingMessage}"
              
اكتب رداً مناسباً بناءً على القالب والسياق. الرد يجب أن يكون طبيعياً وغير آلي.`,
            },
          ],
        });

        reply =
          (aiResponse.choices[0]?.message?.content as string) ||
          matchedRule.replyTemplate;
      }

      return { matched: true, reply, ruleId: matchedRule.id };
    }),

  // ===== المحادثات =====

  // قائمة المحادثات (كل الحسابات أو حساب محدد)
  listChats: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("all"),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // جلب حسابات واتساب لإضافة معلوماتها
      const accounts = await db.select().from(whatsappAccounts);
      const accountMap = new Map(accounts.map(a => [a.accountId, a]));

      // بناء الشروط
      const conditions: Parameters<typeof and>[0][] = [];
      if (input.accountId !== "all") {
        conditions.push(eq(whatsappChats.accountId, input.accountId));
      }
      if (!input.includeArchived) {
        conditions.push(eq(whatsappChats.isArchived, false));
      }

      const chats = await db
        .select()
        .from(whatsappChats)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(whatsappChats.lastMessageAt));

      // إضافة معلومات الحساب لكل محادثة
      return chats.map(chat => {
        const account = accountMap.get(chat.accountId);
        return {
          ...chat,
          senderAccountLabel: account?.label ?? chat.accountId,
          senderPhoneNumber: account?.phoneNumber ?? chat.accountId,
        };
      });
    }),

  // رسائل محادثة معينة مع معلومات الحساب المرسل
  getChatMessages: protectedProcedure
    .input(z.object({ chatId: z.number().int().min(0) }))
    .query(async ({ input }) => {
      if (!input.chatId || input.chatId <= 0) return [];
      const db = await getDb();
      if (!db) return [];

      const msgs = await db
        .select()
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.chatId, input.chatId))
        .orderBy(desc(whatsappChatMessages.sentAt))
        .limit(200);

      // جلب حسابات واتساب لإضافة label
      const accounts = await db.select().from(whatsappAccounts);
      const accountMap = new Map(accounts.map(a => [a.accountId, a]));

      return msgs.map(msg => {
        const account = accountMap.get(msg.accountId);
        return {
          ...msg,
          senderAccountLabel: account?.label ?? msg.accountId,
          senderPhoneNumber: account?.phoneNumber ?? msg.accountId,
        };
      });
    }),

  // أرشفة محادثة
  archiveChat: protectedProcedure
    .input(z.object({ chatId: z.number(), archived: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(whatsappChats)
        .set({ isArchived: input.archived })
        .where(eq(whatsappChats.id, input.chatId));

      return { success: true };
    }),

  // ===== إدارة المحادثات المتقدمة =====

  // إرسال رسالة من الشات مباشرة (نص أو وسائط)
  sendChatMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.number().optional(),
        accountId: z.string().default("default"),
        phone: z.string(),
        contactName: z.string().optional(),
        message: z.string().default(""),
        leadId: z.number().optional(),
        // وسائط اختيارية
        mediaBase64: z.string().optional(),
        mimetype: z.string().optional(),
        mediaFilename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let uploadedMediaUrl: string | undefined;
      let resolvedMediaType: string | undefined;

      if (input.mediaBase64 && input.mimetype) {
        // إرسال وسائط عبر واتساب
        const { sendWhatsAppMedia } = await import("../whatsappAutomation");
        const sendResult = await sendWhatsAppMedia(
          input.phone,
          input.mediaBase64,
          input.mimetype,
          input.mediaFilename || "file",
          input.message,
          input.accountId
        );
        if (!sendResult.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: sendResult.error ?? `فشل إرسال الوسائط - تأكد من ربط الحساب`,
          });
        }
        // رفع الوسائط إلى S3
        try {
          const { storagePut } = await import("../storage");
          const ext = input.mimetype.split("/")[1]?.split(";")[0] || "bin";
          const key = `wa-media/${input.accountId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const buffer = Buffer.from(input.mediaBase64, "base64");
          const { url } = await storagePut(key, buffer, input.mimetype);
          uploadedMediaUrl = url;
          resolvedMediaType = input.mimetype.startsWith("image") ? "image"
            : input.mimetype.startsWith("video") ? "video"
            : input.mimetype.startsWith("audio") ? "audio"
            : "document";
        } catch (e) {
          console.error("خطأ رفع وسائط صادرة:", e);
        }
      } else {
        // إرسال نص عادي
        if (!input.message) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "الرسالة فارغة" });
        }
        // محاولة الإرسال عبر واتساب - إذا فشل يتم حفظ الرسالة بحالة failed فقط
        try {
          const { sendWhatsAppMessage } = await import("../whatsappAutomation");
          const sendResult = await sendWhatsAppMessage(input.phone, input.message, input.accountId);
          if (!sendResult.success) {
            console.warn(`[واتساب] فشل الإرسال - سيتم حفظ الرسالة بحالة failed: ${sendResult.error}`);
          }
        } catch (err) {
          console.warn(`[واتساب] خطأ في الإرسال - سيتم حفظ الرسالة محلياً:`, err);
        }
      }

      // البحث عن محادثة موجودة أو إنشاء جديدة
      let chatId = input.chatId;
      const lastMsg = uploadedMediaUrl ? (input.message || `📎 ${input.mediaFilename || "ملف"}`) : input.message;
      if (!chatId) {
        let [chat] = await db
          .select()
          .from(whatsappChats)
          .where(
            and(
              eq(whatsappChats.accountId, input.accountId),
              eq(whatsappChats.phone, input.phone)
            )
          )
          .limit(1);

        if (!chat) {
          const [result] = await db.insert(whatsappChats).values({
            accountId: input.accountId,
            phone: input.phone,
            contactName: input.contactName,
            leadId: input.leadId,
            lastMessage: lastMsg,
            lastMessageAt: new Date(),
            unreadCount: 0,
          });
          chatId = (result as { insertId: number }).insertId;
        } else {
          chatId = chat.id;
        }
      }

      // تحديث آخر رسالة في المحادثة
      await db
        .update(whatsappChats)
        .set({ lastMessage: lastMsg, lastMessageAt: new Date() })
        .where(eq(whatsappChats.id, chatId));

      // تسجيل الرسالة
      await db.insert(whatsappChatMessages).values({
        chatId,
        accountId: input.accountId,
        direction: "outgoing",
        message: input.message,
        mediaUrl: uploadedMediaUrl,
        mediaType: resolvedMediaType,
        mediaFilename: input.mediaFilename,
        status: "sent",
      });

      return { success: true, chatId };
    }),

  // تعليم المحادثة كمقروءة
  markChatAsRead: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(whatsappChats)
        .set({ unreadCount: 0 })
        .where(eq(whatsappChats.id, input.chatId));

      return { success: true };
    }),

  // حذف محادثة
  deleteChat: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(whatsappChatMessages).where(eq(whatsappChatMessages.chatId, input.chatId));
      await db.delete(whatsappChats).where(eq(whatsappChats.id, input.chatId));

      return { success: true };
    }),

  // البحث في المحادثات
  searchChats: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        query: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(whatsappChats)
        .where(
          and(
            eq(whatsappChats.accountId, input.accountId),
            like(whatsappChats.contactName, `%${input.query}%`)
          )
        )
        .orderBy(desc(whatsappChats.lastMessageAt))
        .limit(20);
    }),

  // إحصائيات المحادثات (كل الحسابات)
  getChatStats: protectedProcedure
    .input(z.object({ accountId: z.string().default("all") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0, unread: 0, archived: 0 };

      const baseCondition = input.accountId !== "all"
        ? eq(whatsappChats.accountId, input.accountId)
        : undefined;

      const [totalRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(whatsappChats)
        .where(baseCondition);

      const [unreadRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(whatsappChats)
        .where(
          baseCondition
            ? and(baseCondition, sql`${whatsappChats.unreadCount} > 0`)
            : sql`${whatsappChats.unreadCount} > 0`
        );

      const [archivedRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(whatsappChats)
        .where(
          baseCondition
            ? and(baseCondition, eq(whatsappChats.isArchived, true))
            : eq(whatsappChats.isArchived, true)
        );

      return {
        total: Number(totalRow?.count ?? 0),
        unread: Number(unreadRow?.count ?? 0),
        archived: Number(archivedRow?.count ?? 0),
      };
    }),

  // تسجيل رسالة واردة في المحادثة
  recordIncomingMessage: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        phone: z.string(),
        contactName: z.string().optional(),
        message: z.string(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // البحث عن المحادثة أو إنشاء واحدة جديدة
      let [chat] = await db
        .select()
        .from(whatsappChats)
        .where(
          and(
            eq(whatsappChats.accountId, input.accountId),
            eq(whatsappChats.phone, input.phone)
          )
        )
        .limit(1);

      if (!chat) {
        const [result] = await db.insert(whatsappChats).values({
          accountId: input.accountId,
          phone: input.phone,
          contactName: input.contactName,
          leadId: input.leadId,
          lastMessage: input.message,
          lastMessageAt: new Date(),
          unreadCount: 1,
        });
        const insertId = (result as { insertId: number }).insertId;
        [chat] = await db.select().from(whatsappChats).where(eq(whatsappChats.id, insertId)).limit(1);
      } else {
        await db
          .update(whatsappChats)
          .set({
            lastMessage: input.message,
            lastMessageAt: new Date(),
            unreadCount: chat.unreadCount + 1,
          })
          .where(eq(whatsappChats.id, chat.id));
      }

      // تسجيل الرسالة
      await db.insert(whatsappChatMessages).values({
        chatId: chat.id,
        accountId: input.accountId,
        direction: "incoming",
        message: input.message,
        status: "read",
      });

      return { success: true, chatId: chat.id };
    }),

  // اقتراح رد AI ذكي بناءً على سياق المحادثة
  suggestAiReply: protectedProcedure
    .input(z.object({
      chatId: z.number(),
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
      count: z.number().default(3),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { suggestions: [], intentAnalysis: null };
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.chatId, input.chatId))
        .orderBy(desc(whatsappChatMessages.sentAt))
        .limit(10);
      const chat = await db.select().from(whatsappChats).where(eq(whatsappChats.id, input.chatId)).limit(1);
      const chatInfo = chat[0];
      const toneMap = { formal: "رسمي ومحترف", friendly: "ودي ومريح", direct: "مباشر ومختصر" };
      const conversationHistory = messages
        .reverse()
        .map(m => `${m.direction === "outgoing" ? "نحن" : "العميل"}: ${m.message || "[ملف]"}`)
        .join("\n");
      const systemPrompt = [
        "أنت مساعد مبيعات ذكي متخصص في السوق السعودي.",
        "العميل: " + (chatInfo?.contactName || "غير محدد") + " | الرقم: " + (chatInfo?.phone || ""),
        "أسلوب الرد: " + toneMap[input.tone],
        "مهمتك: اقتراح " + input.count + " ردود مختلفة بالعربية وتحليل نية العميل.",
        'أعط الرد JSON بهذا الشكل فقط: {"suggestions":["رد 1","رد 2","رد 3"],"intentAnalysis":{"intent":"price_inquiry","urgency":"medium","sentiment":"positive","suggestedAction":"وصف الخطوة","interestScore":75}}',
      ].join("\n");
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `سجل المحادثة:\n${conversationHistory}\n\nاقترح ردودًا مناسبة بالعربية.` },
          ],
          response_format: { type: "json_object" },
        });
        const content = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(content as string);
        return {
          suggestions: (parsed.suggestions as string[]) || [],
          intentAnalysis: parsed.intentAnalysis || null,
        };
      } catch {
        return { suggestions: [], intentAnalysis: null };
      }
    }),

  // جلب إجمالي الرسائل غير المقروءة عبر جميع المحادثات
  getTotalUnread: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { total: 0 };
      const result = await db
        .select({ total: sql<number>`COALESCE(SUM(${whatsappChats.unreadCount}), 0)` })
        .from(whatsappChats)
        .where(eq(whatsappChats.isArchived, false));
      return { total: Number(result[0]?.total ?? 0) };
    }),

  // ===== إحصائيات الإرسال اليومي لكل رقم واتساب =====
  getDailyStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7), // عدد الأيام للتقرير
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { accounts: [], dailyBreakdown: [], totals: { sent: 0, received: 0, chats: 0 } };

      const accounts = await db.select().from(whatsappAccounts);
      const accountMap = new Map(accounts.map(a => [a.accountId, a]));

      // حساب تاريخ البداية
       const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);
      // تحويل التاريخ إلى صيغة MySQL الصحيحة
      const startDateStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
      // إحصائيات كل حساب (إجمالي)
      const accountStats = await db
        .select({
          accountId: whatsappChatMessages.accountId,
          direction: whatsappChatMessages.direction,
          count: sql<number>`COUNT(*)`,
        })
        .from(whatsappChatMessages)
        .where(sql`${whatsappChatMessages.sentAt} >= ${startDateStr}`)
        .groupBy(whatsappChatMessages.accountId, whatsappChatMessages.direction);
      // تجميع الإحصائيات لكل حسابب
      const accountStatsMap = new Map<string, { sent: number; received: number; label: string; phoneNumber: string }>();
      for (const row of accountStats) {
        const acc = accountMap.get(row.accountId);
        const label = acc?.label ?? row.accountId;
        const phoneNumber = acc?.phoneNumber ?? row.accountId;
        if (!accountStatsMap.has(row.accountId)) {
          accountStatsMap.set(row.accountId, { sent: 0, received: 0, label, phoneNumber });
        }
        const stat = accountStatsMap.get(row.accountId)!;
        if (row.direction === 'outgoing') stat.sent += Number(row.count);
        else stat.received += Number(row.count);
      }

      // إحصائيات يومية (آخر N يوم)
      const dailyStats = await db
        .select({
          accountId: whatsappChatMessages.accountId,
          direction: whatsappChatMessages.direction,
          day: sql<string>`DATE(${whatsappChatMessages.sentAt})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(whatsappChatMessages)
        .where(sql`${whatsappChatMessages.sentAt} >= ${startDateStr}`)
        .groupBy(
          whatsappChatMessages.accountId,
          whatsappChatMessages.direction,
          sql`DATE(${whatsappChatMessages.sentAt})`
        )
        .orderBy(sql`DATE(${whatsappChatMessages.sentAt})`);

      // تجميع البيانات اليومية
      const dayMap = new Map<string, { day: string; sent: number; received: number; byAccount: Record<string, { sent: number; received: number }> }>();
      for (const row of dailyStats) {
        const day = row.day;
        if (!dayMap.has(day)) {
          dayMap.set(day, { day, sent: 0, received: 0, byAccount: {} });
        }
        const dayData = dayMap.get(day)!;
        if (!dayData.byAccount[row.accountId]) {
          dayData.byAccount[row.accountId] = { sent: 0, received: 0 };
        }
        if (row.direction === 'outgoing') {
          dayData.sent += Number(row.count);
          dayData.byAccount[row.accountId].sent += Number(row.count);
        } else {
          dayData.received += Number(row.count);
          dayData.byAccount[row.accountId].received += Number(row.count);
        }
      }

      // إحصائيات المحادثات لكل حساب
      const chatStats = await db
        .select({
          accountId: whatsappChats.accountId,
          total: sql<number>`COUNT(*)`,
          active: sql<number>`SUM(CASE WHEN ${whatsappChats.isArchived} = 0 THEN 1 ELSE 0 END)`,
          unread: sql<number>`SUM(${whatsappChats.unreadCount})`,
        })
        .from(whatsappChats)
        .groupBy(whatsappChats.accountId);

      const chatStatsMap = new Map(chatStats.map(r => [r.accountId, r]));

      // بناء قائمة الحسابات مع كل إحصائياتها
      const allAccountIds = new Set([
        ...Array.from(accountStatsMap.keys()),
        ...accounts.map(a => a.accountId),
      ]);

      const accountsResult = Array.from(allAccountIds).map(accountId => {
        const acc = accountMap.get(accountId);
        const stats = accountStatsMap.get(accountId) ?? { sent: 0, received: 0, label: acc?.label ?? accountId, phoneNumber: acc?.phoneNumber ?? accountId };
        const chats = chatStatsMap.get(accountId);
        const replyRate = stats.received > 0 ? Math.round((stats.sent / stats.received) * 100) : 0;
        return {
          accountId,
          label: stats.label,
          phoneNumber: stats.phoneNumber,
          sent: stats.sent,
          received: stats.received,
          replyRate,
          totalChats: Number(chats?.total ?? 0),
          activeChats: Number(chats?.active ?? 0),
          unreadMessages: Number(chats?.unread ?? 0),
          isConnected: acc !== undefined,
        };
      });

      const totals = {
        sent: accountsResult.reduce((s, a) => s + a.sent, 0),
        received: accountsResult.reduce((s, a) => s + a.received, 0),
        chats: accountsResult.reduce((s, a) => s + a.totalChats, 0),
      };

      return {
        accounts: accountsResult,
        dailyBreakdown: Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day)),
        totals,
        periodDays: input.days,
      };
    }),

  // إحصائيات سريعة لكل حساب (للفلتر في قائمة المحادثات)
  getAccountQuickStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const accounts = await db.select().from(whatsappAccounts);
      const chatStats = await db
        .select({
          accountId: whatsappChats.accountId,
          total: sql<number>`COUNT(*)`,
          unread: sql<number>`SUM(${whatsappChats.unreadCount})`,
        })
        .from(whatsappChats)
        .where(eq(whatsappChats.isArchived, false))
        .groupBy(whatsappChats.accountId);

      const statsMap = new Map(chatStats.map(r => [r.accountId, r]));

      return accounts.map(acc => ({
        accountId: acc.accountId,
        label: acc.label,
        phoneNumber: acc.phoneNumber,
        totalChats: Number(statsMap.get(acc.accountId)?.total ?? 0),
        unreadChats: Number(statsMap.get(acc.accountId)?.unread ?? 0),
      }));
    }),

  // تحديث حالة الرسالة (علامات القراءة)
  updateMessageStatus: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      status: z.enum(["sent", "delivered", "read", "failed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(whatsappChatMessages)
        .set({ status: input.status })
        .where(eq(whatsappChatMessages.id, input.messageId));
      return { success: true };
    }),

  // تعيين موظف لمحادثة
  assignChatToEmployee: protectedProcedure
    .input(z.object({
      chatId: z.number(),
      userId: z.number().nullable(),
      userName: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(whatsappChats)
        .set({
          assignedUserId: input.userId,
          assignedUserName: input.userName,
          handledBy: input.userId ? "human" : "ai",
        })
        .where(eq(whatsappChats.id, input.chatId));
      return { success: true };
    }),

  // جلب الموظفين للتعيين
  getEmployeeList: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        defaultWhatsappAccountId: users.defaultWhatsappAccountId,
      }).from(users);
    }),

  // تحليل أداء الموظفين
  getEmployeePerformance: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const allEmployees = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
      }).from(users);
      const chatStats = await db.select({
        assignedUserId: whatsappChats.assignedUserId,
        totalChats: sql<number>`COUNT(*)`,
        closedChats: sql<number>`SUM(CASE WHEN ${whatsappChats.closedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        missedOpportunities: sql<number>`SUM(CASE WHEN ${whatsappChats.opportunityMissed} = 1 THEN 1 ELSE 0 END)`,
        positiveChats: sql<number>`SUM(CASE WHEN ${whatsappChats.sentiment} = 'positive' THEN 1 ELSE 0 END)`,
        negativeChats: sql<number>`SUM(CASE WHEN ${whatsappChats.sentiment} = 'negative' THEN 1 ELSE 0 END)`,
        avgMessages: sql<number>`AVG(${whatsappChats.totalMessages})`,
      })
      .from(whatsappChats)
      .where(and(
        sql`${whatsappChats.assignedUserId} IS NOT NULL`,
        sql`${whatsappChats.createdAt} >= ${since}`,
      ))
      .groupBy(whatsappChats.assignedUserId);
      const statsMap = new Map(chatStats.map(r => [r.assignedUserId, r]));
      return allEmployees.map(emp => {
        const stats = statsMap.get(emp.id);
        const total = Number(stats?.totalChats ?? 0);
        const closed = Number(stats?.closedChats ?? 0);
        const missed = Number(stats?.missedOpportunities ?? 0);
        const positive = Number(stats?.positiveChats ?? 0);
        const negative = Number(stats?.negativeChats ?? 0);
        const closeRate = total > 0 ? Math.round((closed / total) * 100) : 0;
        const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;
        const performanceScore = total > 0
          ? Math.min(100, Math.max(0, closeRate - missRate + (positive - negative) * 5))
          : 0;
        return {
          id: emp.id,
          name: emp.name ?? "موظف",
          email: emp.email,
          totalChats: total,
          closedChats: closed,
          missedOpportunities: missed,
          positiveChats: positive,
          negativeChats: negative,
          closeRate,
          missRate,
          performanceScore,
          avgMessages: Math.round(Number(stats?.avgMessages ?? 0)),
        };
      });
    }),

  // تحليل محادثة بالذكاء الاصطناعي
  analyzeChatWithAI: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const messages = await db.select()
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.chatId, input.chatId))
        .orderBy(whatsappChatMessages.sentAt)
        .limit(50);
      if (messages.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "لا توجد رسائل" });
      const conversation = messages.map(m =>
        `[${m.direction === "outgoing" ? "موظف" : "عميل"}]: ${m.message}`
      ).join("\n");
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `أنت محلل محادثات متخصص. حلل وأخرج JSON:
{
  "sentiment": "positive|neutral|negative",
  "opportunityMissed": true|false,
  "weakPoints": ["نقطة ضعف"],
  "strengths": ["نقطة قوة"],
  "missedOpportunities": ["فرصة ضائعة"],
  "recommendations": ["توصية"],
  "summary": "ملخص",
  "closingProbability": 0
}`,
          },
          { role: "user", content: conversation },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "chat_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                sentiment: { type: "string" },
                opportunityMissed: { type: "boolean" },
                weakPoints: { type: "array", items: { type: "string" } },
                strengths: { type: "array", items: { type: "string" } },
                missedOpportunities: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
                closingProbability: { type: "number" },
              },
              required: ["sentiment", "opportunityMissed", "weakPoints", "strengths", "missedOpportunities", "recommendations", "summary", "closingProbability"],
              additionalProperties: false,
            },
          },
        },
      });
      const analysis = JSON.parse(result.choices[0].message.content as string);
      await db.update(whatsappChats)
        .set({
          sentiment: analysis.sentiment as "positive" | "neutral" | "negative" | "unknown",
          opportunityMissed: analysis.opportunityMissed,
        })
        .where(eq(whatsappChats.id, input.chatId));
      return analysis;
    }),

  // تقرير شامل للمحادثات
  getConversationReport: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
      accountId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      const conditions: Parameters<typeof and>[0][] = [sql`${whatsappChats.createdAt} >= ${since}`];
      if (input.accountId) conditions.push(eq(whatsappChats.accountId, input.accountId));
      const stats = await db.select({
        totalChats: sql<number>`COUNT(*)`,
        closedChats: sql<number>`SUM(CASE WHEN ${whatsappChats.closedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        aiHandled: sql<number>`SUM(CASE WHEN ${whatsappChats.handledBy} = 'ai' THEN 1 ELSE 0 END)`,
        humanHandled: sql<number>`SUM(CASE WHEN ${whatsappChats.handledBy} = 'human' THEN 1 ELSE 0 END)`,
        missedOpportunities: sql<number>`SUM(CASE WHEN ${whatsappChats.opportunityMissed} = 1 THEN 1 ELSE 0 END)`,
        positiveChats: sql<number>`SUM(CASE WHEN ${whatsappChats.sentiment} = 'positive' THEN 1 ELSE 0 END)`,
        neutralChats: sql<number>`SUM(CASE WHEN ${whatsappChats.sentiment} = 'neutral' THEN 1 ELSE 0 END)`,
        negativeChats: sql<number>`SUM(CASE WHEN ${whatsappChats.sentiment} = 'negative' THEN 1 ELSE 0 END)`,
        avgMessages: sql<number>`AVG(${whatsappChats.totalMessages})`,
      })
      .from(whatsappChats)
      .where(and(...conditions));
      const abandoned = await db.select({
        id: whatsappChats.id,
        phone: whatsappChats.phone,
        contactName: whatsappChats.contactName,
        lastMessageAt: whatsappChats.lastMessageAt,
        accountId: whatsappChats.accountId,
      })
      .from(whatsappChats)
      .where(and(
        eq(whatsappChats.isArchived, false),
        sql`${whatsappChats.lastMessageAt} < DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        sql`${whatsappChats.closedAt} IS NULL`,
      ))
      .limit(20);
      const s = stats[0];
      const total = Number(s?.totalChats ?? 0);
      return {
        totalChats: total,
        closedChats: Number(s?.closedChats ?? 0),
        aiHandled: Number(s?.aiHandled ?? 0),
        humanHandled: Number(s?.humanHandled ?? 0),
        missedOpportunities: Number(s?.missedOpportunities ?? 0),
        positiveChats: Number(s?.positiveChats ?? 0),
        neutralChats: Number(s?.neutralChats ?? 0),
        negativeChats: Number(s?.negativeChats ?? 0),
        avgMessages: Math.round(Number(s?.avgMessages ?? 0)),
        closeRate: total > 0 ? Math.round((Number(s?.closedChats) / total) * 100) : 0,
        abandonedChats: abandoned,
      };
    }),

  // إغلاق محادثة
  closeChat: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(whatsappChats)
        .set({ closedAt: new Date() })
        .where(eq(whatsappChats.id, input.chatId));
      return { success: true };
    }),
});
