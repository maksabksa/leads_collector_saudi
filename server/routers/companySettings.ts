import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { companySettings } from "../../drizzle/schema";

export const companySettingsRouter = router({
  // جلب إعدادات الشركة
  get: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const [row] = await db.select().from(companySettings).limit(1);
    if (!row) {
      // إنشاء صف افتراضي إذا لم يكن موجوداً
      await db.insert(companySettings).values({
        companyName: "مكسب KSA",
        city: "الرياض",
        region: "المنطقة الوسطى",
      });
      const [newRow] = await db.select().from(companySettings).limit(1);
      return newRow ?? null;
    }
    return row;
  }),

  // حفظ إعدادات الشركة
  save: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1).max(200),
        companyDescription: z.string().max(1000).optional(),
        city: z.string().max(100).optional(),
        region: z.string().max(100).optional(),
        phone: z.string().max(30).optional(),
        email: z.string().max(200).optional().or(z.literal("")),
        website: z.string().max(300).optional(),
        logoUrl: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [existing] = await db
        .select({ id: companySettings.id })
        .from(companySettings)
        .limit(1);

      if (existing) {
        await db
          .update(companySettings)
          .set({
            companyName: input.companyName,
            companyDescription: input.companyDescription || null,
            city: input.city || null,
            region: input.region || null,
            phone: input.phone || null,
            email: input.email || null,
            website: input.website || null,
            logoUrl: input.logoUrl || null,
          })
          .where(eq(companySettings.id, existing.id));
      } else {
        await db.insert(companySettings).values({
          companyName: input.companyName,
          companyDescription: input.companyDescription || undefined,
          city: input.city || undefined,
          region: input.region || undefined,
          phone: input.phone || undefined,
          email: input.email || undefined,
          website: input.website || undefined,
          logoUrl: input.logoUrl || undefined,
        });
      }

      return { success: true };
    }),
});
