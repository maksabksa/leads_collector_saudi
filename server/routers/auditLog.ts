import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { desc, eq, and, gte } from "drizzle-orm";

const dbError = () =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

// Helper: تسجيل عملية في سجل التدقيق
export async function logAudit(params: {
  userId?: number;
  userName?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress,
    });
  } catch {
    // لا نوقف العملية الأصلية إذا فشل التسجيل
  }
}

export const auditLogRouter = router({
  // جلب سجل التدقيق (للمدير فقط)
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        userId: z.number().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        fromDate: z.string().optional(), // ISO string
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      }
      const db = await getDb();
      if (!db) throw dbError();

      const conditions = [];
      if (input.userId) conditions.push(eq(auditLogs.userId, input.userId));
      if (input.action) conditions.push(eq(auditLogs.action, input.action));
      if (input.entityType) conditions.push(eq(auditLogs.entityType, input.entityType));
      if (input.fromDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(input.fromDate)));
      }

      const query = db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }
      return query;
    }),

  // إحصائيات سريعة
  getStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
    }
    const db = await getDb();
    if (!db) throw dbError();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = await db
      .select()
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, today));

    return {
      todayCount: todayLogs.length,
      actionBreakdown: todayLogs.reduce(
        (acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }),
});
