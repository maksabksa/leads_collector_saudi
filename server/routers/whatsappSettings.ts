/**
 * إعدادات واتساب: التأخير، التنبيهات، الرد التلقائي، المحادثات
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import {
  whatsappSettings,
  autoReplyRules,
  whatsappChats,
  whatsappChatMessages,
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

  // قائمة المحادثات
  listChats: protectedProcedure
    .input(
      z.object({
        accountId: z.string().default("default"),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(whatsappChats.accountId, input.accountId)];
      if (!input.includeArchived) {
        conditions.push(eq(whatsappChats.isArchived, false));
      }

      return db
        .select()
        .from(whatsappChats)
        .where(and(...conditions))
        .orderBy(desc(whatsappChats.lastMessageAt));
    }),

  // رسائل محادثة معينة
  getChatMessages: protectedProcedure
    .input(z.object({ chatId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.chatId, input.chatId))
        .orderBy(desc(whatsappChatMessages.sentAt))
        .limit(100);
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
});
