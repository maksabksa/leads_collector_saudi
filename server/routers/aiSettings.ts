/**
 * إعدادات الذكاء الاصطناعي: OpenAI API Key, Assistant ID, System Prompt
 * والتحكم في الرد التلقائي على مستوى كل عميل أو الكل
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { aiSettings, whatsappChats } from "../../drizzle/schema";

// ===== مساعد: استدعاء OpenAI مباشرة =====
async function callOpenAI({
  apiKey,
  model,
  systemPrompt,
  userMessage,
  temperature,
  maxTokens,
}: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===== مساعد: استدعاء OpenAI Assistant =====
async function callOpenAIAssistant({
  apiKey,
  assistantId,
  userMessage,
}: {
  apiKey: string;
  assistantId: string;
  userMessage: string;
}): Promise<string> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "OpenAI-Beta": "assistants=v2",
  };

  // إنشاء thread
  const threadRes = await fetch("https://api.openai.com/v1/threads", {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  if (!threadRes.ok) throw new Error("فشل إنشاء Thread");
  const thread = await threadRes.json();

  // إضافة رسالة
  await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ role: "user", content: userMessage }),
  });

  // تشغيل الـ Assistant
  const runRes = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ assistant_id: assistantId }),
  });
  if (!runRes.ok) throw new Error("فشل تشغيل Assistant");
  const run = await runRes.json();

  // انتظار الاكتمال (polling)
  let attempts = 0;
  while (attempts < 30) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
      { headers }
    );
    const status = await statusRes.json();
    if (status.status === "completed") break;
    if (["failed", "cancelled", "expired"].includes(status.status)) {
      throw new Error(`Assistant run ${status.status}`);
    }
    attempts++;
  }

  // جلب الرد
  const msgsRes = await fetch(
    `https://api.openai.com/v1/threads/${thread.id}/messages?limit=1&order=desc`,
    { headers }
  );
  const msgs = await msgsRes.json();
  const content = msgs.data?.[0]?.content?.[0]?.text?.value || "";
  return content;
}

export const aiSettingsRouter = router({
  // ===== جلب الإعدادات =====
  getSettings: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const [settings] = await db.select().from(aiSettings).limit(1);
    if (!settings) return null;

    // إخفاء الـ API Key (عرض آخر 4 أحرف فقط)
    return {
      ...settings,
      openaiApiKey: settings.openaiApiKey
        ? `sk-...${settings.openaiApiKey.slice(-4)}`
        : null,
      hasApiKey: !!settings.openaiApiKey,
    };
  }),

  // ===== حفظ الإعدادات =====
  saveSettings: protectedProcedure
    .input(
      z.object({
        provider: z.enum(["openai", "builtin"]).default("builtin"),
        openaiApiKey: z.string().optional(), // إذا فارغ لا تغير المحفوظ
        openaiAssistantId: z.string().optional(),
        openaiModel: z.string().default("gpt-4o-mini"),
        systemPrompt: z.string().optional(),
        businessContext: z.string().optional(),
        globalAutoReplyEnabled: z.boolean().optional(),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTokens: z.number().min(50).max(4000).default(500),
        analysisStyle: z.enum(["balanced", "aggressive", "conservative", "detailed"]).optional(),
        analysisPrompt: z.string().optional(),
        messageTemplate: z.string().optional(),
        brandTone: z.enum(["professional", "friendly", "formal", "casual"]).optional(),
        countryContext: z.enum(["saudi", "gulf", "arabic", "international"]).optional(),
        dialect: z.enum(["gulf", "egyptian", "levantine", "msa"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(aiSettings).limit(1);

      const updateData: Record<string, unknown> = {
        provider: input.provider,
        openaiAssistantId: input.openaiAssistantId ?? null,
        openaiModel: input.openaiModel,
        systemPrompt: input.systemPrompt ?? null,
        businessContext: input.businessContext ?? null,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        analysisStyle: input.analysisStyle ?? "balanced",
        analysisPrompt: input.analysisPrompt ?? null,
        messageTemplate: input.messageTemplate ?? null,
        brandTone: input.brandTone ?? "professional",
        countryContext: input.countryContext ?? "saudi",
        dialect: input.dialect ?? "gulf",
      };

      // تحديث globalAutoReplyEnabled فقط إذا أُرسل
      if (input.globalAutoReplyEnabled !== undefined) {
        updateData.globalAutoReplyEnabled = input.globalAutoReplyEnabled;
      }

      // تحديث API Key فقط إذا أُرسل قيمة جديدة (غير فارغة)
      if (input.openaiApiKey && input.openaiApiKey.startsWith("sk-")) {
        updateData.openaiApiKey = input.openaiApiKey;
      }

      if (existing) {
        await db.update(aiSettings).set(updateData).where(eq(aiSettings.id, existing.id));
      } else {
        await db.insert(aiSettings).values({
          ...updateData,
          openaiApiKey: input.openaiApiKey || null,
        } as any);
      }

      return { success: true };
    }),

  // ===== اختبار الاتصال بـ OpenAI =====
  testConnection: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().optional(), // إذا فارغ يستخدم المحفوظ
        assistantId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // جلب الإعدادات المحفوظة
      const [settings] = await db.select().from(aiSettings).limit(1);
      const apiKey = input.apiKey || settings?.openaiApiKey;
      const assistantId = input.assistantId || settings?.openaiAssistantId;

      if (!apiKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لم يتم إدخال API Key",
        });
      }

      try {
        if (assistantId) {
          // اختبار Assistant
          const reply = await callOpenAIAssistant({
            apiKey,
            assistantId,
            userMessage: "مرحباً، هذا اختبار اتصال. رد بجملة قصيرة.",
          });
          return { success: true, mode: "assistant", reply };
        } else {
          // اختبار Chat Completion
          const reply = await callOpenAI({
            apiKey,
            model: settings?.openaiModel || "gpt-4o-mini",
            systemPrompt: settings?.systemPrompt || "أنت مساعد مفيد.",
            userMessage: "مرحباً، هذا اختبار اتصال. رد بجملة قصيرة.",
            temperature: settings?.temperature || 0.7,
            maxTokens: 100,
          });
          return { success: true, mode: "chat", reply };
        }
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "فشل الاتصال بـ OpenAI",
        });
      }
    }),

  // ===== توليد رد بـ AI (يستخدم الإعدادات المحفوظة) =====
  generateReply: protectedProcedure
    .input(
      z.object({
        incomingMessage: z.string(),
        contactName: z.string().optional(),
        chatId: z.number().optional(),
        ruleContext: z.string().optional(), // سياق القاعدة المطابقة
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [settings] = await db.select().from(aiSettings).limit(1);

      // التحقق من المفتاح
      if (!settings?.openaiApiKey) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لم يتم ربط OpenAI API Key بعد",
        });
      }

      const systemPrompt = [
        settings.systemPrompt || "أنت مساعد تجاري سعودي محترف يرد على رسائل العملاء.",
        settings.businessContext ? `\nمعلومات عن النشاط التجاري: ${settings.businessContext}` : "",
        input.ruleContext ? `\nتعليمات إضافية: ${input.ruleContext}` : "",
        "\nالتعليمات العامة: رد باللغة العربية بشكل ودي ومهني. لا تكن آلياً. الرد يجب أن يكون قصيراً ومفيداً.",
      ]
        .filter(Boolean)
        .join("");

      const userMessage = `رسالة العميل${input.contactName ? ` (${input.contactName})` : ""}: "${input.incomingMessage}"`;

      try {
        let reply: string;

        if (settings.openaiAssistantId) {
          reply = await callOpenAIAssistant({
            apiKey: settings.openaiApiKey,
            assistantId: settings.openaiAssistantId,
            userMessage,
          });
        } else {
          reply = await callOpenAI({
            apiKey: settings.openaiApiKey,
            model: settings.openaiModel,
            systemPrompt,
            userMessage,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
          });
        }

        return { success: true, reply };
      } catch (e: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e.message || "فشل توليد الرد",
        });
      }
    }),

  // ===== تفعيل/إيقاف الرد التلقائي للكل =====
  setGlobalAutoReply: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(aiSettings).limit(1);

      if (existing) {
        await db
          .update(aiSettings)
          .set({ globalAutoReplyEnabled: input.enabled })
          .where(eq(aiSettings.id, existing.id));
      } else {
        await db.insert(aiSettings).values({ globalAutoReplyEnabled: input.enabled });
      }

      return { success: true };
    }),

  // ===== تفعيل/إيقاف الرد التلقائي لعميل محدد =====
  setChatAutoReply: protectedProcedure
    .input(z.object({ chatId: z.number(), enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(whatsappChats)
        .set({ aiAutoReplyEnabled: input.enabled })
        .where(eq(whatsappChats.id, input.chatId));

      return { success: true };
    }),

  // ===== تفعيل/إيقاف الرد لجميع المحادثات دفعة واحدة =====
  setBulkChatAutoReply: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        accountId: z.string().default("all"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // إذا accountId = "all" نحدّث جميع المحادثات بغض النظر عن الحساب
      if (input.accountId === "all") {
        await db.update(whatsappChats).set({ aiAutoReplyEnabled: input.enabled });
        const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(whatsappChats);
        return { success: true, updatedCount: Number(countRow?.count ?? 0) };
      }

      await db
        .update(whatsappChats)
        .set({ aiAutoReplyEnabled: input.enabled })
        .where(eq(whatsappChats.accountId, input.accountId));

      // عدد المحادثات المحدّثة
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(whatsappChats)
        .where(eq(whatsappChats.accountId, input.accountId));

      return { success: true, updatedCount: Number(countRow?.count ?? 0) };
    }),

  // ===== قائمة المحادثات مع حالة الرد التلقائي =====
  listChatsWithAIStatus: protectedProcedure
    .input(z.object({ accountId: z.string().default("default") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select({
          id: whatsappChats.id,
          phone: whatsappChats.phone,
          contactName: whatsappChats.contactName,
          leadId: whatsappChats.leadId,
          lastMessage: whatsappChats.lastMessage,
          lastMessageAt: whatsappChats.lastMessageAt,
          unreadCount: whatsappChats.unreadCount,
          isArchived: whatsappChats.isArchived,
          aiAutoReplyEnabled: whatsappChats.aiAutoReplyEnabled,
        })
        .from(whatsappChats)
        .where(eq(whatsappChats.accountId, input.accountId))
        .orderBy(whatsappChats.lastMessageAt);
    }),
});
