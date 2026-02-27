/**
 * إدارة حسابات واتساب المتعددة مع الأدوار
 * وكشف اهتمام العميل وتحويله للموظف البشري
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, inArray } from "drizzle-orm";
import { whatsappAccounts, interestAlerts } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";

// ===== كلمات الاهتمام العادية =====
const DEFAULT_INTEREST_KEYWORDS = [
  // الموافقة والإيجاب
  "نعم", "أيوه", "ايوه", "موافق", "تمام", "حسناً", "اوكي", "ok", "yes",
  // التواصل
  "تواصل", "اتصل", "رقم", "واتساب", "تلفون", "جوال",
  // الاستفسار العام
  "كيف", "متى", "متاح", "متاحة", "ممكن", "توصيل",
  // الاهتمام الصريح
  "مهتم", "مهتمة", "interested",
];

// ===== كلمات الاهتمام العالي (تعطي درجة أعلى) =====
const HIGH_INTEREST_KEYWORDS = [
  // طلب موعد أو حجز
  "موعد", "أحجز", "احجز", "حجز", "أحجز", "زيارة", "أزور", "ازور",
  // طلب الشراء المباشر
  "اشتري", "أشتري", "شراء", "أطلب", "اطلب", "طلب", "أريد", "اريد",
  "أبي", "ابي", "أبغى", "ابغى", "عايز", "عاوز", "بدي", "نبي",
  // الاستفسار عن السعر
  "سعر", "كم", "بكم", "أسعار", "تكلفة", "الثمن", "كلفة",
  // الإنجليزية
  "buy", "order", "price", "want", "book", "appointment",
];

// ===== تحليل مستوى الاهتمام =====
async function analyzeInterest(message: string): Promise<{
  isInterested: boolean;
  score: number;
  keywords: string[];
}> {
  const lowerMsg = message.toLowerCase();

  const foundKeywords = DEFAULT_INTEREST_KEYWORDS.filter((kw) =>
    lowerMsg.includes(kw.toLowerCase())
  );
  const highInterestFound = HIGH_INTEREST_KEYWORDS.filter((kw) =>
    lowerMsg.includes(kw.toLowerCase())
  );

  // حساب الدرجة: كلمات عادية = 15 لكل كلمة، كلمات عالية الاهتمام = 30 لكل كلمة
  let score = Math.min(
    foundKeywords.length * 15 + highInterestFound.length * 30,
    80
  );

  // جمع كل الكلمات المكتشفة
  const allFoundKeywords = Array.from(new Set([...foundKeywords, ...highInterestFound]));

  // تحليل AI إضافي
  if (message.length > 5) {
    try {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              'أنت محلل مبيعات محترف. حلل الرسالة التالية وحدد هل العميل مهتم بالشراء أو الاستفسار الجاد.\n\nقواعد التصنيف الصارمة:\n- طلب موعد أو حجز = 85-95\n- طلب سعر أو شراء مباشر = 75-90\n- استفسار جاد عن المنتج/الخدمة = 55-75\n- رد إيجابي أو موافقة = 60-80\n- استفسار عام غير محدد = 30-50\n- رسالة غير ذات صلة أو سلبية = 0-20\n\nمهم جداً: الدرجة يجب أن تكون رقماً صحيحاً بين 0 و100 (مثل 85 وليس 0.85).\nأجب بـ JSON فقط: {"interested": true/false, "score": 0-100, "reason": "سبب قصير"}',
          },
          { role: "user", content: `الرسالة: "${message}"` },
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
        const parsed = JSON.parse(content);
        // تصحيح الدرجة: إذا كانت بين 0 و1 فهي نسبة مئوية مضروبة في 100
        let aiScore = Number(parsed.score);
        if (aiScore > 0 && aiScore <= 1) aiScore = Math.round(aiScore * 100);
        aiScore = Math.min(Math.round(aiScore), 100);
        // دمج النتيجتين: الأعلى يفوز
        score = Math.max(score, aiScore);
        if (parsed.interested) score = Math.max(score, 60);
      }
    } catch {
      // تجاهل خطأ AI واستخدام الكلمات المفتاحية فقط
    }
  }

  return {
    isInterested: score >= 40 || allFoundKeywords.length >= 1,
    score,
    keywords: allFoundKeywords,
  };
}

export const whatsappAccountsRouter = router({
  // ===== قائمة الحسابات =====
  listAccounts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(whatsappAccounts)
      .orderBy(whatsappAccounts.sortOrder, whatsappAccounts.createdAt);
  }),

  // ===== الحسابات حسب الدور =====
  getAccountsByRole: protectedProcedure
    .input(
      z.object({
        role: z.enum(["bulk_sender", "human_handoff", "both", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.role === "all") {
        return db
          .select()
          .from(whatsappAccounts)
          .where(eq(whatsappAccounts.isActive, true))
          .orderBy(whatsappAccounts.sortOrder);
      }

      return db
        .select()
        .from(whatsappAccounts)
        .where(
          and(
            eq(whatsappAccounts.isActive, true),
            input.role === "human_handoff"
              ? inArray(whatsappAccounts.role, ["human_handoff", "both"])
              : inArray(whatsappAccounts.role, ["bulk_sender", "both"])
          )
        )
        .orderBy(whatsappAccounts.sortOrder);
    }),

  // ===== إضافة حساب =====
  addAccount: protectedProcedure
    .input(
      z.object({
        label: z.string().min(1),
        phoneNumber: z.string().min(7),
        role: z.enum(["bulk_sender", "human_handoff", "both"]).default("bulk_sender"),
        assignedEmployee: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().default(0),
        accountType: z.enum(["collection", "sales", "analysis", "followup"]).default("collection"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const accountId = `wa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      await db.insert(whatsappAccounts).values({
        accountId,
        label: input.label,
        phoneNumber: input.phoneNumber.replace(/\s+/g, ""),
        role: input.role,
        assignedEmployee: input.assignedEmployee,
        notes: input.notes,
        sortOrder: input.sortOrder,
        accountType: input.accountType,
        isActive: true,
      });

      return { success: true, accountId };
    }),

  // ===== تعديل حساب =====
  updateAccount: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        label: z.string().min(1).optional(),
        phoneNumber: z.string().min(7).optional(),
        role: z.enum(["bulk_sender", "human_handoff", "both"]).optional(),
        assignedEmployee: z.string().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
        accountType: z.enum(["collection", "sales", "analysis", "followup"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.label !== undefined) updateData.label = data.label;
      if (data.phoneNumber !== undefined)
        updateData.phoneNumber = data.phoneNumber.replace(/\s+/g, "");
      if (data.role !== undefined) updateData.role = data.role;
      if (data.assignedEmployee !== undefined)
        updateData.assignedEmployee = data.assignedEmployee;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.accountType !== undefined) updateData.accountType = data.accountType;

      await db
        .update(whatsappAccounts)
        .set(updateData)
        .where(eq(whatsappAccounts.id, id));

      return { success: true };
    }),

  // ===== حذف حساب =====
  deleteAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(whatsappAccounts).where(eq(whatsappAccounts.id, input.id));
      return { success: true };
    }),

  // ===== تحليل رسالة العميل وكشف الاهتمام =====
  analyzeCustomerMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        phone: z.string(),
        contactName: z.string().optional(),
        chatId: z.number().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const analysis = await analyzeInterest(input.message);

      if (analysis.isInterested) {
        await db.insert(interestAlerts).values({
          chatId: input.chatId,
          leadId: input.leadId,
          phone: input.phone,
          contactName: input.contactName,
          triggerMessage: input.message,
          interestScore: analysis.score,
          detectedKeywords: analysis.keywords,
          status: "pending",
        });

        await notifyOwner({
          title: `🔥 عميل مهتم: ${input.contactName || input.phone}`,
          content: `درجة الاهتمام: ${analysis.score}%\nالرسالة: "${input.message}"\nالكلمات المفتاحية: ${analysis.keywords.join(", ")}`,
        });
      }

      return {
        isInterested: analysis.isInterested,
        score: analysis.score,
        keywords: analysis.keywords,
      };
    }),

  // ===== تحويل العميل لموظف بشري =====
  transferToHuman: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        handoffAccountId: z.string(),
        notes: z.string().optional(),
        transferredBy: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [alert] = await db
        .select()
        .from(interestAlerts)
        .where(eq(interestAlerts.id, input.alertId))
        .limit(1);

      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "الإشعار غير موجود" });

      const [account] = await db
        .select()
        .from(whatsappAccounts)
        .where(eq(whatsappAccounts.accountId, input.handoffAccountId))
        .limit(1);

      if (!account) throw new TRPCError({ code: "NOT_FOUND", message: "حساب الموظف غير موجود" });

      await db
        .update(interestAlerts)
        .set({
          status: "transferred",
          handoffAccountId: input.handoffAccountId,
          handoffPhone: account.phoneNumber,
          transferredAt: new Date(),
          transferredBy: input.transferredBy || "النظام",
          notes: input.notes,
        })
        .where(eq(interestAlerts.id, input.alertId));

      const cleanPhone = account.phoneNumber.replace(/\D/g, "");
      const customerPhone = alert.phone.replace(/\D/g, "");
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
        `مرحباً ${account.assignedEmployee || ""}، لديك عميل مهتم للمتابعة:\nالعميل: ${alert.contactName || alert.phone}\nرقمه: ${customerPhone}\nرسالته: "${alert.triggerMessage}"`
      )}`;

      return {
        success: true,
        waLink,
        employeeName: account.assignedEmployee,
        employeePhone: account.phoneNumber,
      };
    }),

  // ===== رفض إشعار =====
  dismissAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(interestAlerts)
        .set({ status: "dismissed" })
        .where(eq(interestAlerts.id, input.alertId));

      return { success: true };
    }),

  // ===== قائمة إشعارات الاهتمام =====
  listAlerts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "transferred", "dismissed", "all"]).default("pending"),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input.status === "all") {
        return db
          .select()
          .from(interestAlerts)
          .orderBy(desc(interestAlerts.createdAt))
          .limit(input.limit);
      }

      return db
        .select()
        .from(interestAlerts)
        .where(eq(interestAlerts.status, input.status))
        .orderBy(desc(interestAlerts.createdAt))
        .limit(input.limit);
    }),

  // ===== إحصائيات الإشعارات =====
  getAlertStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { pending: 0, transferred: 0, dismissed: 0, total: 0 };

    const all = await db.select().from(interestAlerts);
    return {
      pending: all.filter((a) => a.status === "pending").length,
      transferred: all.filter((a) => a.status === "transferred").length,
      dismissed: all.filter((a) => a.status === "dismissed").length,
      total: all.length,
    };
  }),
});
