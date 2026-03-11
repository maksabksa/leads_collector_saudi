import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const reportRouter = router({
  generatePDF: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      includeAnalysis: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      // إنشاء تقرير نصي بسيط (يمكن تطويره لاحقاً لإنشاء PDF حقيقي)
      const reportContent = `
تقرير العميل: ${lead.companyName}
=====================================
نوع النشاط: ${lead.businessType}
المدينة: ${lead.city}
${lead.district ? `الحي: ${lead.district}` : ''}
رقم الهاتف: ${lead.verifiedPhone || 'غير متوفر'}
الموقع الإلكتروني: ${lead.website || 'غير متوفر'}
المرحلة: ${lead.stage}
الأولوية: ${lead.priority}
${lead.notes ? `ملاحظات: ${lead.notes}` : ''}
تاريخ الإنشاء: ${lead.createdAt.toLocaleDateString('ar-SA')}
      `.trim();

      return {
        success: true,
        leadId: input.leadId,
        reportContent,
        reportUrl: null, // يمكن إضافة رابط PDF حقيقي لاحقاً
      };
    }),

  generateAndSendViaWhatsApp: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      phoneNumber: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      // هذه الميزة تتطلب واتساب - تم تعطيلها
      return {
        success: false,
        message: "ميزة إرسال PDF عبر واتساب غير متاحة حالياً",
      };
    }),

  generateSummary: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "أنت مساعد مبيعات خبير. قدم ملخصاً احترافياً للعميل." },
          { role: "user", content: `قدم ملخصاً مختصراً لهذا العميل:\nالشركة: ${lead.companyName}\nالنشاط: ${lead.businessType}\nالمدينة: ${lead.city}\nالمرحلة: ${lead.stage}` },
        ],
      });

      return {
        summary: response.choices[0]?.message?.content || "لا يمكن إنشاء الملخص حالياً",
      };
    }),

  // تقرير أداء الموظفين
  getEmployeePerformance: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // إحصائيات بسيطة من بيانات العملاء
      const { users } = await import('../../drizzle/schema');
      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        displayName: users.displayName,
      }).from(users).limit(20);

      return allUsers.map(u => ({
        id: u.id,
        name: u.displayName || u.name,
        totalChats: 0,
        closeRate: 0,
        performanceScore: 0,
      }));
    }),
});
