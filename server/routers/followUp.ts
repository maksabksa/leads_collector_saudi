/**
 * نظام المتابعة التلقائية - Follow-up System
 * يعرض العملاء المهتمين بدون خطوة قادمة أو موعد متابعة
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, or, isNull, lt, sql } from "drizzle-orm";
import { whatsappChats } from "../../drizzle/schema";

export const followUpRouter = router({
  // جلب المحادثات التي تحتاج متابعة
  getFollowUpNeeded: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { missingNextStep: [], overdueFollowUp: [], interestedNoAction: [] };

      const now = new Date();

      // 1. عملاء مهتمون بدون خطوة قادمة
      const interestedNoStep = await db.select()
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.stage} IN ('interested', 'price_offer', 'meeting')`,
            isNull(whatsappChats.nextStep),
            eq(whatsappChats.isArchived, false)
          )
        )
        .limit(50);

      // 2. عملاء تجاوزوا موعد المتابعة
      const overdueFollowUp = await db.select()
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.followUpDate} IS NOT NULL`,
            lt(whatsappChats.followUpDate, now),
            sql`${whatsappChats.stage} NOT IN ('won', 'lost')`,
            eq(whatsappChats.isArchived, false)
          )
        )
        .limit(50);

      // 3. عملاء مهتمون لم يُرد عليهم منذ 24 ساعة
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const interestedNoReply = await db.select()
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.stage} IN ('interested', 'price_offer')`,
            sql`${whatsappChats.lastMessageAt} IS NOT NULL`,
            lt(whatsappChats.lastMessageAt, yesterday),
            eq(whatsappChats.isArchived, false)
          )
        )
        .limit(50);

      return {
        missingNextStep: interestedNoStep,
        overdueFollowUp: overdueFollowUp,
        interestedNoAction: interestedNoReply,
      };
    }),

  // إحصائيات سريعة للـ dashboard
  getFollowUpStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, overdue: 0, missingStep: 0, noReply: 0 };

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [overdueCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.followUpDate} IS NOT NULL`,
            lt(whatsappChats.followUpDate, now),
            sql`${whatsappChats.stage} NOT IN ('won', 'lost')`,
            eq(whatsappChats.isArchived, false)
          )
        );

      const [missingStepCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.stage} IN ('interested', 'price_offer', 'meeting')`,
            isNull(whatsappChats.nextStep),
            eq(whatsappChats.isArchived, false)
          )
        );

      const [noReplyCount] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(whatsappChats)
        .where(
          and(
            sql`${whatsappChats.stage} IN ('interested', 'price_offer')`,
            lt(whatsappChats.lastMessageAt, yesterday),
            eq(whatsappChats.isArchived, false)
          )
        );

      const overdue = Number(overdueCount?.count ?? 0);
      const missingStep = Number(missingStepCount?.count ?? 0);
      const noReply = Number(noReplyCount?.count ?? 0);

      return {
        total: overdue + missingStep + noReply,
        overdue,
        missingStep,
        noReply,
      };
    }),
});
