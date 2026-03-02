import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { dailyMessageCounts, users } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const dbError = () =>
  new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });

function todayDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// Helper: التحقق من حد الرسائل اليومية وزيادة العداد
export async function checkAndIncrementDailyLimit(userId: number): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const db = await getDb();
  if (!db) return { allowed: true, currentCount: 0, limit: 0 };

  // جلب حد المستخدم
  const [user] = await db
    .select({ dailyMessageLimit: users.dailyMessageLimit })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const limit = user?.dailyMessageLimit ?? 0;

  // إذا كان 0 = بلا حد
  if (limit === 0) {
    // زيادة العداد فقط للتتبع
    await upsertDailyCount(db, userId);
    const count = await getDailyCount(db, userId);
    return { allowed: true, currentCount: count, limit: 0 };
  }

  const count = await getDailyCount(db, userId);
  if (count >= limit) {
    return { allowed: false, currentCount: count, limit };
  }

  await upsertDailyCount(db, userId);
  return { allowed: true, currentCount: count + 1, limit };
}

async function getDailyCount(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number): Promise<number> {
  const today = todayDate();
  const [row] = await db
    .select({ count: dailyMessageCounts.count })
    .from(dailyMessageCounts)
    .where(
      and(
        eq(dailyMessageCounts.userId, userId),
        eq(dailyMessageCounts.date, today)
      )
    )
    .limit(1);
  return row?.count ?? 0;
}

async function upsertDailyCount(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: number): Promise<void> {
  const today = todayDate();
  const existing = await db
    .select()
    .from(dailyMessageCounts)
    .where(
      and(
        eq(dailyMessageCounts.userId, userId),
        eq(dailyMessageCounts.date, today)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(dailyMessageCounts)
      .set({ count: existing[0].count + 1 })
      .where(eq(dailyMessageCounts.id, existing[0].id));
  } else {
    await db.insert(dailyMessageCounts).values({
      userId,
      date: today,
      count: 1,
    });
  }
}

export const messageLimitsRouter = router({
  // جلب إحصائيات الرسائل اليومية للمستخدم الحالي
  myStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw dbError();

    const today = todayDate();
    const [user] = await db
      .select({ dailyMessageLimit: users.dailyMessageLimit })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    const count = await getDailyCount(db, ctx.user.id);
    const limit = user?.dailyMessageLimit ?? 0;

    return {
      date: today,
      count,
      limit,
      remaining: limit === 0 ? null : Math.max(0, limit - count),
      percentage: limit === 0 ? 0 : Math.min(100, Math.round((count / limit) * 100)),
    };
  }),

  // جلب إحصائيات جميع المستخدمين (للمدير)
  allStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
    }
    const db = await getDb();
    if (!db) throw dbError();

    const today = todayDate();
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        displayName: users.displayName,
        dailyMessageLimit: users.dailyMessageLimit,
      })
      .from(users)
      .where(eq(users.isActive, true));

    const todayCounts = await db
      .select()
      .from(dailyMessageCounts)
      .where(eq(dailyMessageCounts.date, today));

    const countMap = new Map(todayCounts.map((c) => [c.userId, c.count]));

    return allUsers.map((u) => {
      const count = countMap.get(u.id) ?? 0;
      const limit = u.dailyMessageLimit ?? 0;
      return {
        userId: u.id,
        name: u.displayName || u.name || "مجهول",
        count,
        limit,
        remaining: limit === 0 ? null : Math.max(0, limit - count),
        percentage: limit === 0 ? 0 : Math.min(100, Math.round((count / limit) * 100)),
        isAtLimit: limit > 0 && count >= limit,
      };
    });
  }),

  // تحديث حد الرسائل لمستخدم (للمدير)
  setUserLimit: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().min(0).max(10000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح" });
      }
      const db = await getDb();
      if (!db) throw dbError();
      await db
        .update(users)
        .set({ dailyMessageLimit: input.limit })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),
});
