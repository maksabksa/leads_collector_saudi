/**
 * noReply.ts — router للتحكم في إعدادات التنبيه بعدم الرد
 */
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getNoReplyHours, setNoReplyHours, checkNoReplyChats } from "../noReplyChecker";

export const noReplyRouter = router({
  // جلب الإعدادات الحالية
  getSettings: protectedProcedure.query(() => {
    return { hoursThreshold: getNoReplyHours() };
  }),

  // تحديث عدد الساعات (أدمن فقط)
  updateSettings: adminProcedure
    .input(z.object({ hoursThreshold: z.number().min(1).max(168) }))
    .mutation(({ input }) => {
      setNoReplyHours(input.hoursThreshold);
      return { success: true, hoursThreshold: input.hoursThreshold };
    }),

  // جلب المحادثات الحالية بدون رد
  getPendingChats: protectedProcedure.query(async () => {
    const result = await checkNoReplyChats();
    return result.chats;
  }),

  // تشغيل الفحص يدوياً (للاختبار)
  runCheck: adminProcedure.mutation(async () => {
    const result = await checkNoReplyChats();
    return result;
  }),
});
