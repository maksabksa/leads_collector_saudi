import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign
} from "../db";

export const campaignsRouter = router({
  // قائمة الحملات
  list: protectedProcedure.query(async () => {
    return getCampaigns();
  }),

  // تفاصيل حملة
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getCampaignById(input.id);
    }),

  // إنشاء حملة جديدة
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      accountId: z.string().optional(),
      totalSent: z.number().default(0),
      totalDelivered: z.number().default(0),
      totalReplied: z.number().default(0),
      totalFailed: z.number().default(0),
      responseRate: z.number().default(0),
      status: z.enum(["draft", "running", "completed", "paused", "failed"]).default("draft"),
    }))
    .mutation(async ({ input, ctx }) => {
      return createCampaign({
        ...input,
        createdBy: ctx.user.id,
      });
    }),

  // تحديث حملة
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      totalSent: z.number().optional(),
      totalDelivered: z.number().optional(),
      totalReplied: z.number().optional(),
      totalFailed: z.number().optional(),
      responseRate: z.number().optional(),
      status: z.enum(["draft", "running", "completed", "paused", "failed"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateCampaign(id, data);
      return { success: true };
    }),

  // حذف حملة
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteCampaign(input.id);
      return { success: true };
    }),

  // إحصائيات الحملات (للرسم البياني)
  stats: protectedProcedure.query(async () => {
    const all = await getCampaigns();
    const total = all.length;
    const completed = all.filter(c => c.status === "completed").length;
    const running = all.filter(c => c.status === "running").length;
    const totalSent = all.reduce((s, c) => s + c.totalSent, 0);
    const totalReplied = all.reduce((s, c) => s + c.totalReplied, 0);
    const avgResponseRate = total > 0
      ? all.reduce((s, c) => s + (c.responseRate ?? 0), 0) / total
      : 0;

    // بيانات الرسم البياني (آخر 10 حملات)
    const chartData = all.slice(0, 10).reverse().map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + "..." : c.name,
      sent: c.totalSent,
      replied: c.totalReplied,
      failed: c.totalFailed,
      responseRate: Math.round(c.responseRate ?? 0),
    }));

    return {
      total,
      completed,
      running,
      totalSent,
      totalReplied,
      avgResponseRate: Math.round(avgResponseRate * 10) / 10,
      chartData,
    };
  }),
});
