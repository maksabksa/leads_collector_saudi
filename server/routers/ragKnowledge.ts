/**
 * نظام RAG (Retrieval-Augmented Generation)
 * إدارة قاعدة المعرفة: مستندات، أمثلة محادثات، شخصية AI
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, like, and, sql } from "drizzle-orm";
import { ragDocuments, ragChunks, ragConversationExamples, aiPersonality } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ===== مساعد: تقسيم النص إلى chunks =====
function splitTextIntoChunks(text: string, maxChunkSize = 500): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks.filter(c => c.length > 10);
}

// ===== مساعد: البحث في قاعدة المعرفة بالكلمات المفتاحية =====
async function searchKnowledgeBase(query: string, limit = 5): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  // بحث بسيط بالكلمات المفتاحية
  const keywords = query.split(/\s+/).filter(w => w.length > 2).slice(0, 5);
  const results: string[] = [];

  // البحث في المستندات
  for (const keyword of keywords) {
    const docs = await db
      .select({ content: ragDocuments.content, title: ragDocuments.title, docType: ragDocuments.docType })
      .from(ragDocuments)
      .where(and(
        eq(ragDocuments.isActive, true),
        sql`(${ragDocuments.content} LIKE ${`%${keyword}%`} OR ${ragDocuments.title} LIKE ${`%${keyword}%`})`
      ))
      .limit(3);

    for (const doc of docs) {
      const snippet = `[${doc.docType === "faq" ? "سؤال وجواب" : doc.docType === "product" ? "منتج/خدمة" : doc.docType === "policy" ? "سياسة" : "معلومة"}] ${doc.title}: ${doc.content.substring(0, 300)}`;
      if (!results.includes(snippet)) results.push(snippet);
    }
  }

  // البحث في أمثلة المحادثات
  for (const keyword of keywords.slice(0, 3)) {
    const examples = await db
      .select({ customerMessage: ragConversationExamples.customerMessage, idealResponse: ragConversationExamples.idealResponse })
      .from(ragConversationExamples)
      .where(and(
        eq(ragConversationExamples.isActive, true),
        sql`${ragConversationExamples.customerMessage} LIKE ${`%${keyword}%`}`
      ))
      .limit(2);

    for (const ex of examples) {
      results.push(`[مثال رد] عندما يقول العميل: "${ex.customerMessage}" → الرد المثالي: "${ex.idealResponse}"`);
    }
  }

  return results.slice(0, limit);
}

export const ragKnowledgeRouter = router({
  // ===== المستندات =====
  listDocuments: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      docType: z.enum(["text", "faq", "product", "policy", "example", "tone"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.category) conditions.push(eq(ragDocuments.category, input.category));
      if (input.docType) conditions.push(eq(ragDocuments.docType, input.docType));
      if (input.search) {
        conditions.push(sql`(${ragDocuments.title} LIKE ${`%${input.search}%`} OR ${ragDocuments.content} LIKE ${`%${input.search}%`})`);
      }

      return db
        .select()
        .from(ragDocuments)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ragDocuments.updatedAt))
        .limit(input.limit);
    }),

  getDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [doc] = await db.select().from(ragDocuments).where(eq(ragDocuments.id, input.id)).limit(1);
      return doc || null;
    }),

  createDocument: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      category: z.string().default("general"),
      docType: z.enum(["text", "faq", "product", "policy", "example", "tone"]).default("text"),
      content: z.string().min(1),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(ragDocuments).values({
        ...input,
        createdBy: ctx.user.name || ctx.user.openId,
        updatedAt: new Date(),
      });

      const docId = (result as any).insertId;

      // تقسيم المحتوى إلى chunks
      const chunks = splitTextIntoChunks(input.content);
      if (chunks.length > 0) {
        await db.insert(ragChunks).values(
          chunks.map((chunk, idx) => ({
            documentId: docId,
            chunkIndex: idx,
            content: chunk,
          }))
        );
      }

      return { success: true, id: docId };
    }),

  updateDocument: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(300).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      docType: z.enum(["text", "faq", "product", "policy", "example", "tone"]).optional(),
      content: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...updateData } = input;
      await db.update(ragDocuments).set({ ...updateData, updatedAt: new Date() }).where(eq(ragDocuments.id, id));

      // إعادة تقسيم إذا تغير المحتوى
      if (updateData.content) {
        await db.delete(ragChunks).where(eq(ragChunks.documentId, id));
        const chunks = splitTextIntoChunks(updateData.content);
        if (chunks.length > 0) {
          await db.insert(ragChunks).values(
            chunks.map((chunk, idx) => ({
              documentId: id,
              chunkIndex: idx,
              content: chunk,
            }))
          );
        }
      }

      return { success: true };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(ragChunks).where(eq(ragChunks.documentId, input.id));
      await db.delete(ragDocuments).where(eq(ragDocuments.id, input.id));
      return { success: true };
    }),

  // ===== أمثلة المحادثات =====
  listExamples: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      tone: z.enum(["formal", "friendly", "direct", "persuasive"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.category) conditions.push(eq(ragConversationExamples.category, input.category));
      if (input.tone) conditions.push(eq(ragConversationExamples.tone, input.tone));
      if (input.search) {
        conditions.push(sql`(${ragConversationExamples.customerMessage} LIKE ${`%${input.search}%`} OR ${ragConversationExamples.idealResponse} LIKE ${`%${input.search}%`})`);
      }

      return db
        .select()
        .from(ragConversationExamples)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ragConversationExamples.createdAt))
        .limit(input.limit);
    }),

  createExample: protectedProcedure
    .input(z.object({
      customerMessage: z.string().min(1),
      idealResponse: z.string().min(1),
      context: z.string().optional(),
      tone: z.enum(["formal", "friendly", "direct", "persuasive"]).default("friendly"),
      category: z.string().default("general"),
      rating: z.number().min(1).max(5).default(5),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(ragConversationExamples).values(input);
      return { success: true };
    }),

  updateExample: protectedProcedure
    .input(z.object({
      id: z.number(),
      customerMessage: z.string().optional(),
      idealResponse: z.string().optional(),
      context: z.string().optional(),
      tone: z.enum(["formal", "friendly", "direct", "persuasive"]).optional(),
      category: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(ragConversationExamples).set(data).where(eq(ragConversationExamples.id, id));
      return { success: true };
    }),

  deleteExample: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(ragConversationExamples).where(eq(ragConversationExamples.id, input.id));
      return { success: true };
    }),

  // ===== شخصية AI =====
  getPersonality: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const [p] = await db.select().from(aiPersonality).limit(1);
    return p || null;
  }),

  savePersonality: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      businessContext: z.string().optional(),
      defaultTone: z.enum(["formal", "friendly", "direct", "persuasive"]).optional(),
      language: z.string().optional(),
      systemPrompt: z.string().optional(),
      rules: z.array(z.string()).optional(),
      forbiddenTopics: z.array(z.string()).optional(),
      greetingMessage: z.string().optional(),
      closingMessage: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(aiPersonality).limit(1);
      if (existing) {
        await db.update(aiPersonality).set({ ...input, updatedAt: new Date() }).where(eq(aiPersonality.id, existing.id));
      } else {
        await db.insert(aiPersonality).values({ ...input, updatedAt: new Date() } as any);
      }
      return { success: true };
    }),

  // ===== توليد رد AI مع RAG =====
  generateRagReply: protectedProcedure
    .input(z.object({
      chatId: z.number(),
      tone: z.enum(["formal", "friendly", "direct"]).default("friendly"),
      count: z.number().default(3),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { suggestions: [], intentAnalysis: null, ragContext: [] };

      // جلب آخر رسائل المحادثة
      const { whatsappChatMessages, whatsappChats } = await import("../../drizzle/schema");
      const messages = await db
        .select()
        .from(whatsappChatMessages)
        .where(eq(whatsappChatMessages.chatId, input.chatId))
        .orderBy(desc(whatsappChatMessages.sentAt))
        .limit(10);

      const [chatInfo] = await db.select().from(whatsappChats).where(eq(whatsappChats.id, input.chatId)).limit(1);

      // آخر رسالة من العميل
      const lastIncoming = messages.find(m => m.direction === "incoming");
      const lastMessage = lastIncoming?.message || "";

      // البحث في قاعدة المعرفة
      const ragContext = await searchKnowledgeBase(lastMessage, 5);

      // جلب شخصية AI
      const [personality] = await db.select().from(aiPersonality).limit(1);

      const toneMap = { formal: "رسمي ومحترف جداً", friendly: "ودي ومريح ومتعاطف", direct: "مباشر ومختصر وواضح" };

      const conversationHistory = messages
        .reverse()
        .map(m => `${m.direction === "outgoing" ? "نحن" : "العميل"}: ${m.message || "[ملف]"}`)
        .join("\n");

      const systemPrompt = [
        personality?.systemPrompt || "أنت مساعد مبيعات ذكي متخصص في السوق السعودي.",
        personality?.businessContext ? `\nمعلومات النشاط التجاري: ${personality.businessContext}` : "",
        personality?.rules?.length ? `\nالقواعد الواجب اتباعها:\n${personality.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : "",
        personality?.forbiddenTopics?.length ? `\nمواضيع محظورة: ${personality.forbiddenTopics.join(", ")}` : "",
        `\nأسلوب الرد المطلوب: ${toneMap[input.tone]}`,
        ragContext.length > 0 ? `\n\n=== معلومات من قاعدة المعرفة (استخدمها في ردودك) ===\n${ragContext.join("\n\n")}` : "",
        "\n\nمهمتك: اقتراح " + input.count + " ردود مختلفة بالعربية وتحليل نية العميل.",
        'أعط الرد JSON بهذا الشكل فقط: {"suggestions":["رد 1","رد 2","رد 3"],"intentAnalysis":{"intent":"price_inquiry","urgency":"medium","sentiment":"positive","suggestedAction":"وصف الخطوة","interestScore":75}}',
        "\nأنواع intent: price_inquiry, purchase_intent, complaint, follow_up, general_inquiry, booking, cancellation",
      ].filter(Boolean).join("");

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `العميل: ${chatInfo?.contactName || "غير محدد"}\n\nسجل المحادثة:\n${conversationHistory}\n\nاقترح ردودًا مناسبة.` },
          ],
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(content as string);

        return {
          suggestions: (parsed.suggestions as string[]) || [],
          intentAnalysis: parsed.intentAnalysis || null,
          ragContext,
        };
      } catch {
        return { suggestions: [], intentAnalysis: null, ragContext };
      }
    }),

  // ===== إحصائيات قاعدة المعرفة =====
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { documents: 0, examples: 0, chunks: 0 };

    const [docsCount] = await db.select({ count: sql<number>`count(*)` }).from(ragDocuments);
    const [examplesCount] = await db.select({ count: sql<number>`count(*)` }).from(ragConversationExamples);
    const [chunksCount] = await db.select({ count: sql<number>`count(*)` }).from(ragChunks);

    return {
      documents: Number(docsCount?.count ?? 0),
      examples: Number(examplesCount?.count ?? 0),
      chunks: Number(chunksCount?.count ?? 0),
    };
  }),

  // ===== توليد مستند بالذكاء الاصطناعي =====
  generateDocumentWithAI: protectedProcedure
    .input(z.object({
      topic: z.string(),
      docType: z.enum(["text", "faq", "product", "policy", "example", "tone"]).default("text"),
      businessContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const typePrompts: Record<string, string> = {
        faq: "أنشئ قائمة أسئلة وأجوبة شائعة حول هذا الموضوع",
        product: "اكتب وصفاً احترافياً لهذا المنتج أو الخدمة",
        policy: "اكتب سياسة واضحة ومهنية حول هذا الموضوع",
        example: "أنشئ أمثلة على محادثات احترافية حول هذا الموضوع",
        tone: "اكتب إرشادات أسلوب الكتابة والتواصل",
        text: "اكتب محتوى معلوماتياً احترافياً حول هذا الموضوع",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: [
              "أنت خبير في كتابة المحتوى التجاري للسوق السعودي.",
              input.businessContext ? `سياق النشاط التجاري: ${input.businessContext}` : "",
              "اكتب المحتوى باللغة العربية بشكل احترافي ومنظم.",
            ].filter(Boolean).join("\n"),
          },
          {
            role: "user",
            content: `${typePrompts[input.docType]} حول: "${input.topic}"\n\nاكتب محتوى شاملاً ومفيداً يمكن استخدامه لتدريب نظام الرد التلقائي.`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      return { content, title: input.topic };
    }),

  // ===== تحليل جودة قاعدة المعرفة =====
  analyzeKnowledgeBase: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const docs = await db.select().from(ragDocuments).where(eq(ragDocuments.isActive, true)).limit(20);
    const examples = await db.select().from(ragConversationExamples).where(eq(ragConversationExamples.isActive, true)).limit(20);

    const summary = [
      `عدد المستندات: ${docs.length}`,
      `عدد أمثلة المحادثات: ${examples.length}`,
      `أنواع المستندات: ${Array.from(new Set(docs.map(d => d.docType))).join(", ")}`,
      `تصنيفات المستندات: ${Array.from(new Set(docs.map(d => d.category))).join(", ")}`,
    ].join("\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "أنت خبير في تقييم جودة قواعد المعرفة لأنظمة الذكاء الاصطناعي.",
        },
        {
          role: "user",
          content: `قيّم جودة قاعدة المعرفة التالية وقدم توصيات لتحسينها:\n\n${summary}\n\nأمثلة المستندات:\n${docs.slice(0, 5).map(d => `- ${d.title} (${d.docType})`).join("\n")}\n\nقدم تقييماً موجزاً وتوصيات عملية.`,
        },
      ],
    });

    return { analysis: response.choices[0]?.message?.content || "" };
  }),
});
