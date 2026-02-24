import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getReminders, getReminderById, createReminder, updateReminder, deleteReminder,
  getOverdueReminders, getUpcomingReminders
} from "../db";

export const remindersRouter = router({
  // قائمة التذكيرات
  list: protectedProcedure
    .input(z.object({
      status: z.string().optional(),
      leadId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return getReminders(input ?? {});
    }),

  // التذكيرات المتأخرة
  overdue: protectedProcedure.query(async () => {
    return getOverdueReminders();
  }),

  // التذكيرات القادمة (خلال 3 أيام)
  upcoming: protectedProcedure
    .input(z.object({ daysAhead: z.number().default(3) }).optional())
    .query(async ({ input }) => {
      return getUpcomingReminders(input?.daysAhead ?? 3);
    }),

  // إحصائيات التذكيرات
  stats: protectedProcedure.query(async () => {
    const all = await getReminders();
    const pending = all.filter(r => r.status === "pending").length;
    const done = all.filter(r => r.status === "done").length;
    const overdue = (await getOverdueReminders()).length;
    const upcoming = (await getUpcomingReminders(3)).length;
    return { total: all.length, pending, done, overdue, upcoming };
  }),

  // إنشاء تذكير
  create: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      leadName: z.string(),
      leadPhone: z.string().optional(),
      leadCity: z.string().optional(),
      leadBusinessType: z.string().optional(),
      reminderType: z.enum(["follow_up", "call", "message", "meeting", "custom"]).default("follow_up"),
      title: z.string().min(1),
      notes: z.string().optional(),
      dueDate: z.string(), // ISO string
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return createReminder({
        ...input,
        dueDate: new Date(input.dueDate),
        createdBy: ctx.user.id,
      });
    }),

  // تحديث تذكير
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      notes: z.string().optional(),
      dueDate: z.string().optional(),
      status: z.enum(["pending", "done", "snoozed", "cancelled"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, dueDate, ...rest } = input;
      await updateReminder(id, {
        ...rest,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(rest.status === "done" ? { completedAt: new Date() } : {}),
      });
      return { success: true };
    }),

  // حذف تذكير
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteReminder(input.id);
      return { success: true };
    }),

  // إنشاء تذكيرات تلقائية للعملاء غير المتابَعين
  autoCreateForUnfollowed: protectedProcedure
    .input(z.object({ daysSinceLastContact: z.number().default(3) }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import("../db");
      const { leads } = await import("../../drizzle/schema");
      const { sql, and, isNull, lt } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return { created: 0 };

      const cutoff = new Date(Date.now() - input.daysSinceLastContact * 24 * 60 * 60 * 1000);
      const unfollowed = await db.select().from(leads)
        .where(and(
          sql`${leads.createdAt} < ${cutoff}`,
          isNull(leads.lastWhatsappSentAt)
        ))
        .limit(50);

      let created = 0;
      for (const lead of unfollowed) {
        // تحقق من عدم وجود تذكير pending لهذا العميل
        const existing = await getReminders({ leadId: lead.id, status: "pending" });
        if (existing.length === 0) {
          await createReminder({
            leadId: lead.id,
            leadName: lead.companyName,
            leadPhone: lead.verifiedPhone || undefined,
            leadCity: lead.city || undefined,
            leadBusinessType: lead.businessType || undefined,
            reminderType: "follow_up",
            title: `متابعة ${lead.companyName} - لم يُتواصل منذ ${input.daysSinceLastContact} أيام`,
            dueDate: new Date(),
            priority: "medium",
            createdBy: ctx.user.id,
          });
          created++;
        }
      }
      return { created };
    }),
});
