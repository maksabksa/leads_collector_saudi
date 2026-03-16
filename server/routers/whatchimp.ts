import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { whatchimpSettings, whatchimpSendLog, leads } from "../../drizzle/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const WHATCHIMP_BASE = "https://app.whatchimp.com/api/v1";

// ─── Normalize Saudi phone to international format ───────────────────────────
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("966")) return digits;
  if (digits.startsWith("0")) return "966" + digits.slice(1);
  if (digits.length === 9) return "966" + digits;
  return digits;
}

// ─── Call Whatchimp API ───────────────────────────────────────────────────────
async function whatchimpPost(
  endpoint: string,
  params: Record<string, string | number>
): Promise<{ status: string; message: unknown }> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.append(k, String(v));
  }
  const res = await fetch(`${WHATCHIMP_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Whatchimp HTTP ${res.status}`);
  return res.json();
}

// ─── Send one lead to Whatchimp ───────────────────────────────────────────────
async function sendLeadToWhatchimp(
  settings: typeof whatchimpSettings.$inferSelect,
  lead: { id: number; companyName: string; verifiedPhone: string | null },
  batchId?: string,
  userId?: number
): Promise<{ success: boolean; phone: string; waMessageId?: string; error?: string }> {
  const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const rawPhone = lead.verifiedPhone;

  if (!rawPhone) {
    await db.insert(whatchimpSendLog).values({
      leadId: lead.id,
      leadName: lead.companyName,
      phone: "",
      status: "skipped",
      errorMessage: "لا يوجد رقم هاتف",
      batchId,
      sentByUserId: userId,
    });
    return { success: false, phone: "", error: "لا يوجد رقم هاتف" };
  }

  const phone = normalizePhone(rawPhone);

  try {
    // 1. Create subscriber
    const subRes = await whatchimpPost("/whatsapp/subscriber/create", {
      apiToken: settings.apiToken,
      phone_number_id: settings.phoneNumberId,
      phone_number: phone,
      first_name: lead.companyName,
    });

    // 2. Assign label if configured (non-fatal)
    if (settings.defaultLabelId) {
      try {
        await whatchimpPost("/whatsapp/subscriber/chat/assign-labels", {
          apiToken: settings.apiToken,
          phone_number_id: settings.phoneNumberId,
          phone_number: phone,
          label_ids: String(settings.defaultLabelId),
        });
      } catch { /* non-fatal */ }
    }

    // 3. Add note with lead info (non-fatal)
    try {
      await whatchimpPost("/whatsapp/subscriber/chat/add-notes", {
        apiToken: settings.apiToken,
        phone_number_id: settings.phoneNumberId,
        phone_number: phone,
        note_text: `مصدر: نظام مكسب للعملاء | اسم النشاط: ${lead.companyName}`,
      });
    } catch { /* non-fatal */ }

    const waMessageId = typeof subRes.message === "string" ? subRes.message : undefined;

    await db.insert(whatchimpSendLog).values({
      leadId: lead.id,
      leadName: lead.companyName,
      phone,
      status: "success",
      waMessageId,
      batchId,
      sentByUserId: userId,
    });

    return { success: true, phone, waMessageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "خطأ غير معروف";
    await db.insert(whatchimpSendLog).values({
      leadId: lead.id,
      leadName: lead.companyName,
      phone,
      status: "failed",
      errorMessage,
      batchId,
      sentByUserId: userId,
    });
    return { success: false, phone, error: errorMessage };
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const whatchimpRouter = router({

  // ── Get settings (admin only) ──────────────────────────────────────────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(whatchimpSettings).limit(1);
    const s = rows[0];
    if (!s) return null;
    return {
      ...s,
      apiToken: s.apiToken.slice(0, 8) + "••••••••••••••••••••••",
    };
  }),

  // ── Save / update settings (admin only) ───────────────────────────────────
  saveSettings: protectedProcedure
    .input(z.object({
      apiToken: z.string().min(10),
      phoneNumberId: z.string().min(5),
      defaultLabelId: z.number().optional(),
      defaultLabelName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(whatchimpSettings).limit(1);
      if (existing.length > 0) {
        await db.update(whatchimpSettings)
          .set({
            apiToken: input.apiToken,
            phoneNumberId: input.phoneNumberId,
            defaultLabelId: input.defaultLabelId ?? null,
            defaultLabelName: input.defaultLabelName ?? null,
            isActive: true,
          })
          .where(eq(whatchimpSettings.id, existing[0].id));
      } else {
        await db.insert(whatchimpSettings).values({
          apiToken: input.apiToken,
          phoneNumberId: input.phoneNumberId,
          defaultLabelId: input.defaultLabelId ?? null,
          defaultLabelName: input.defaultLabelName ?? null,
          isActive: true,
        });
      }
      return { success: true };
    }),

  // ── Get labels from Whatchimp ──────────────────────────────────────────────
  getLabels: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
    const settings = rows[0];
    if (!settings) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط Whatchimp بعد" });
    const res = await whatchimpPost("/whatsapp/label/list", {
      apiToken: settings.apiToken,
      phone_number_id: settings.phoneNumberId,
    });
    if (res.status !== "1") throw new TRPCError({ code: "BAD_REQUEST", message: "فشل جلب التصنيفات" });
    return res.message as Array<{ id: number; label_name: string; status: string }>;
  }),

  // ── Test connection ────────────────────────────────────────────────────────
  testConnection: protectedProcedure
    .input(z.object({
      apiToken: z.string(),
      phoneNumberId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      try {
        const res = await whatchimpPost("/whatsapp/label/list", {
          apiToken: input.apiToken,
          phone_number_id: input.phoneNumberId,
        });
        return {
          success: res.status === "1",
          message: res.status === "1" ? "الاتصال ناجح ✓" : "فشل الاتصال",
        };
      } catch {
        return { success: false, message: "فشل الاتصال بـ Whatchimp" };
      }
    }),

  // ── Send single lead ───────────────────────────────────────────────────────
  sendLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const settingsRows = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
      const settings = settingsRows[0];
      if (!settings) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط Whatchimp بعد. تواصل مع الأدمن." });

      const leadRows = await db.select({
        id: leads.id,
        companyName: leads.companyName,
        verifiedPhone: leads.verifiedPhone,
      }).from(leads).where(eq(leads.id, input.leadId)).limit(1);

      if (!leadRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });

      return sendLeadToWhatchimp(settings, leadRows[0], undefined, ctx.user.id);
    }),

  // ── Bulk send ──────────────────────────────────────────────────────────────
  sendBulk: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const settingsRows = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
      const settings = settingsRows[0];
      if (!settings) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم ربط Whatchimp بعد. تواصل مع الأدمن." });

      const batchId = `batch_${Date.now()}_${ctx.user.id}`;

      const leadsData = await db.select({
        id: leads.id,
        companyName: leads.companyName,
        verifiedPhone: leads.verifiedPhone,
      }).from(leads).where(inArray(leads.id, input.leadIds));

      let success = 0, failed = 0, skipped = 0;
      const errors: Array<{ leadId: number; name: string; error: string }> = [];

      for (const lead of leadsData) {
        const result = await sendLeadToWhatchimp(settings, lead, batchId, ctx.user.id);
        if (result.success) success++;
        else if (!lead.verifiedPhone) skipped++;
        else {
          failed++;
          errors.push({ leadId: lead.id, name: lead.companyName, error: result.error ?? "خطأ" });
        }
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      }

      return { batchId, total: leadsData.length, success, failed, skipped, errors };
    }),

  // ── Get send history ──────────────────────────────────────────────────────
  getSendHistory: protectedProcedure
    .input(z.object({
      leadId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = input.leadId ? [eq(whatchimpSendLog.leadId, input.leadId)] : [];
      return db.select().from(whatchimpSendLog)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(whatchimpSendLog.sentAt))
        .limit(input.limit);
    }),

  // ── Check if settings exist (for UI) ─────────────────────────────────────
  isConfigured: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({ id: whatchimpSettings.id }).from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
    return { configured: rows.length > 0 };
  }),
});
