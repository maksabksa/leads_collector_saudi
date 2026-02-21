/**
 * إدارة كلمات مفتاحية كشف الاهتمام + تدريب AI
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { interestKeywords, aiTrainingExamples } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

const CATEGORY_LABELS: Record<string, string> = {
  price: "السعر والتكلفة",
  buy: "الشراء والطلب",
  interest: "الاهتمام والموافقة",
  contact: "التواصل والمواعيد",
  general: "عام",
};

export const interestKeywordsRouter = router({
  // ===== قائمة الكلمات =====
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(interestKeywords).orderBy(interestKeywords.category, interestKeywords.keyword);
  }),

  // ===== إضافة كلمة =====
  add: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1).max(100),
        category: z.enum(["price", "buy", "interest", "contact", "general"]).default("general"),
        weight: z.number().min(5).max(100).default(20),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(interestKeywords).values({
        keyword: input.keyword.trim(),
        category: input.category,
        weight: input.weight,
        isActive: true,
        isDefault: false,
      });

      return { success: true };
    }),

  // ===== تعديل كلمة =====
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        weight: z.number().min(5).max(100).optional(),
        category: z.enum(["price", "buy", "interest", "contact", "general"]).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...data } = input;
      await db.update(interestKeywords).set(data).where(eq(interestKeywords.id, id));
      return { success: true };
    }),

  // ===== حذف كلمة =====
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [kw] = await db.select().from(interestKeywords).where(eq(interestKeywords.id, input.id)).limit(1);
      if (kw?.isDefault) {
        throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن حذف الكلمات الافتراضية، يمكنك إيقافها فقط" });
      }

      await db.delete(interestKeywords).where(eq(interestKeywords.id, input.id));
      return { success: true };
    }),

  // ===== اختبار رسالة =====
  testMessage: protectedProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // جلب الكلمات النشطة
      const activeKeywords = await db
        .select()
        .from(interestKeywords)
        .where(eq(interestKeywords.isActive, true));

      const lowerMsg = input.message.toLowerCase();
      const foundKeywords = activeKeywords.filter((kw) =>
        lowerMsg.includes(kw.keyword.toLowerCase())
      );

      // حساب الدرجة
      let score = 0;
      for (const kw of foundKeywords) {
        score = Math.min(score + kw.weight, 100);
      }

      // تحليل AI
      let aiAnalysis: { interested: boolean; score: number; reason: string } | null = null;
      try {
        // جلب أمثلة التدريب
        const examples = await db
          .select()
          .from(aiTrainingExamples)
          .orderBy(desc(aiTrainingExamples.createdAt))
          .limit(10);

        const examplesText =
          examples.length > 0
            ? `\n\nأمثلة تدريبية:\n${examples
                .map((e) => `- "${e.message}" → ${e.label === "interested" ? "مهتم" : "غير مهتم"}`)
                .join("\n")}`
            : "";

        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `أنت محلل مبيعات متخصص في السوق السعودي. حلل الرسالة التالية وحدد هل العميل مهتم بالشراء أو الاستفسار الجاد.${examplesText}\nأجب بـ JSON فقط.`,
            },
            { role: "user", content: `الرسالة: "${input.message}"` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "interest_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  interested: { type: "boolean" },
                  score: { type: "number" },
                  reason: { type: "string" },
                },
                required: ["interested", "score", "reason"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (content) {
          aiAnalysis = JSON.parse(content);
        }
      } catch {
        // تجاهل خطأ AI
      }

      const finalScore = aiAnalysis
        ? Math.round((score + Math.min(aiAnalysis.score, 100)) / 2)
        : score;

      return {
        message: input.message,
        keywordsScore: score,
        aiScore: aiAnalysis?.score ?? null,
        finalScore,
        isInterested: finalScore >= 35,
        foundKeywords: foundKeywords.map((k) => ({ keyword: k.keyword, weight: k.weight, category: k.category })),
        aiReason: aiAnalysis?.reason ?? null,
      };
    }),

  // ===== إضافة مثال تدريبي =====
  addTrainingExample: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        label: z.enum(["interested", "not_interested"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(aiTrainingExamples).values({
        message: input.message,
        label: input.label,
        notes: input.notes,
      });

      return { success: true };
    }),

  // ===== قائمة الأمثلة التدريبية =====
  listTrainingExamples: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(aiTrainingExamples)
      .orderBy(desc(aiTrainingExamples.createdAt))
      .limit(50);
  }),

  // ===== حذف مثال تدريبي =====
  deleteTrainingExample: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiTrainingExamples).where(eq(aiTrainingExamples.id, input.id));
      return { success: true };
    }),

  // ===== إحصائيات =====
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, active: 0, categories: {} as Record<string, number>, trainingExamples: 0 };

    const [keywords, examples] = await Promise.all([
      db.select().from(interestKeywords),
      db.select().from(aiTrainingExamples),
    ]);

    const categories: Record<string, number> = {};
    for (const kw of keywords) {
      categories[kw.category] = (categories[kw.category] || 0) + 1;
    }

    return {
      total: keywords.length,
      active: keywords.filter((k) => k.isActive).length,
      categories,
      trainingExamples: examples.length,
      interestedExamples: examples.filter((e) => e.label === "interested").length,
      notInterestedExamples: examples.filter((e) => e.label === "not_interested").length,
    };
  }),
});
