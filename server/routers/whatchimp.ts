import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { whatchimpSettings, whatchimpSendLog, leads } from "../../drizzle/schema";
import { eq, inArray, and, desc, gte, lt, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const WHATCHIMP_BASE = "https://app.whatchimp.com/api/v1";

// ─── Phone validation & normalization ───────────────────────────────────────

/** أنماط الأرقام المدعومة حسب الدولة */
const COUNTRY_PATTERNS: Record<string, { prefix: string; length: number; label: string }[]> = {
  SA: [{ prefix: "966", length: 12, label: "السعودية" }],
  AE: [{ prefix: "971", length: 12, label: "الإمارات" }],
  KW: [{ prefix: "965", length: 11, label: "الكويت" }],
  BH: [{ prefix: "973", length: 11, label: "البحرين" }],
  QA: [{ prefix: "974", length: 11, label: "قطر" }],
  OM: [{ prefix: "968", length: 11, label: "عُمان" }],
  JO: [{ prefix: "962", length: 11, label: "الأردن" }],
  EG: [{ prefix: "20",  length: 12, label: "مصر" }],
};

export type PhoneValidation = {
  raw: string;          // الرقم الأصلي
  normalized: string;   // الرقم بعد التنسيق (دولي)
  valid: boolean;       // هل الرقم صالح؟
  warning?: string;     // تحذير إن وُجد
  country?: string;     // رمز الدولة المكتشف
};

export function validateAndNormalizePhone(phone: string): PhoneValidation {
  if (!phone || !phone.trim()) {
    return { raw: phone, normalized: "", valid: false, warning: "الرقم فارغ" };
  }

  const digits = phone.replace(/\D/g, "");

  // رقم قصير جداً
  if (digits.length < 7) {
    return { raw: phone, normalized: digits, valid: false, warning: `الرقم قصير جداً (${digits.length} أرقام)` };
  }

  // رقم طويل جداً
  if (digits.length > 15) {
    return { raw: phone, normalized: digits, valid: false, warning: `الرقم طويل جداً (${digits.length} أرقام)` };
  }

  // تنسيق سعودي: 05xxxxxxxx → 9665xxxxxxxx
  let normalized = digits;
  let country: string | undefined;

  if (digits.startsWith("966")) {
    normalized = digits;
    country = "SA";
  } else if (digits.startsWith("0") && digits.length === 10) {
    // 05xxxxxxxx → 9665xxxxxxxx
    normalized = "966" + digits.slice(1);
    country = "SA";
  } else if (digits.length === 9 && digits.startsWith("5")) {
    // 5xxxxxxxx → 9665xxxxxxxx
    normalized = "966" + digits;
    country = "SA";
  } else if (digits.startsWith("971")) {
    normalized = digits; country = "AE";
  } else if (digits.startsWith("965")) {
    normalized = digits; country = "KW";
  } else if (digits.startsWith("973")) {
    normalized = digits; country = "BH";
  } else if (digits.startsWith("974")) {
    normalized = digits; country = "QA";
  } else if (digits.startsWith("968")) {
    normalized = digits; country = "OM";
  } else if (digits.startsWith("962")) {
    normalized = digits; country = "JO";
  } else if (digits.startsWith("20")) {
    normalized = digits; country = "EG";
  } else {
    // رقم غير معروف الدولة
    return {
      raw: phone,
      normalized: digits,
      valid: false,
      warning: `تنسيق الرقم غير معروف — تأكد من إضافة رمز الدولة (مثال: 9665XXXXXXXX)`,
    };
  }

  // التحقق من طول الرقم السعودي
  if (country === "SA" && normalized.length !== 12) {
    return {
      raw: phone,
      normalized,
      valid: false,
      country,
      warning: `الرقم السعودي يجب أن يكون 12 رقماً (الحالي: ${normalized.length})`,
    };
  }

  return { raw: phone, normalized, valid: true, country };
}

function normalizePhone(phone: string): string {
  return validateAndNormalizePhone(phone).normalized || phone.replace(/\D/g, "");
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

// ─── Lead type with all fields for Whatchimp ────────────────────────────────
type LeadForWhatchimp = {
  id: number;
  companyName: string;
  verifiedPhone: string | null;
  businessType?: string | null;
  city?: string | null;
  country?: string | null;
  district?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  snapchatUrl?: string | null;
  tiktokUrl?: string | null;
  facebookUrl?: string | null;
  reviewCount?: number | null;
  leadPriorityScore?: number | null;
  biggestMarketingGap?: string | null;
  suggestedSalesEntryAngle?: string | null;
  stage?: string | null;
  priority?: string | null;
  notes?: string | null;
  crNumber?: string | null;
  socialSince?: string | null;
};

// ─── Build custom fields object for Whatchimp ─────────────────────────────────
function buildCustomFields(lead: LeadForWhatchimp): Record<string, string> {
  const fields: Record<string, string> = {};

  // نوع النشاط التجاري
  if (lead.businessType) fields["نوع النشاط"] = lead.businessType;

  // الموقع الجغرافي
  const locationParts = [lead.city, lead.district].filter(Boolean);
  if (locationParts.length) fields["المدينة والحي"] = locationParts.join(" - ");

  // الدولة
  if (lead.country) fields["الدولة"] = lead.country === "SA" ? "المملكة العربية السعودية" : lead.country;

  // الموقع الإلكتروني
  if (lead.website) fields["الموقع الإلكتروني"] = lead.website;

  // روابط السوشيال ميديا
  if (lead.instagramUrl) fields["إنستجرام"] = lead.instagramUrl;
  if (lead.twitterUrl) fields["تويتر / X"] = lead.twitterUrl;
  if (lead.snapchatUrl) fields["سناب شات"] = lead.snapchatUrl;
  if (lead.tiktokUrl) fields["تيك توك"] = lead.tiktokUrl;
  if (lead.facebookUrl) fields["فيسبوك"] = lead.facebookUrl;

  // رابط خرائط جوجل
  if (lead.googleMapsUrl) fields["خرائط جوجل"] = lead.googleMapsUrl;

  // عدد التقييمات
  if (lead.reviewCount != null && lead.reviewCount > 0) fields["عدد التقييمات"] = String(lead.reviewCount);

  // درجة الأولوية
  if (lead.leadPriorityScore != null) fields["درجة الأولوية"] = String(lead.leadPriorityScore) + " / 100";

  // أكبر ثغرة تسويقية
  if (lead.biggestMarketingGap) fields["أكبر ثغرة تسويقية"] = lead.biggestMarketingGap;

  // زاوية الدخول البيعية
  if (lead.suggestedSalesEntryAngle) fields["زاوية الدخول البيعية"] = lead.suggestedSalesEntryAngle;

  // مرحلة العميل
  const stageMap: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", interested: "مهتم",
    proposal: "عرض مقدم", won: "تم الإغلاق", lost: "خسرنا",
  };
  if (lead.stage) fields["مرحلة العميل"] = stageMap[lead.stage] ?? lead.stage;

  // الأولوية
  const priorityMap: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
  if (lead.priority) fields["الأولوية"] = priorityMap[lead.priority] ?? lead.priority;

  // رقم السجل التجاري
  if (lead.crNumber) fields["السجل التجاري"] = lead.crNumber;

  // تاريخ الظهور على السوشيال
  if (lead.socialSince) fields["تاريخ الظهور على السوشيال"] = lead.socialSince;

  // ملاحظات
  if (lead.notes) fields["ملاحظات"] = lead.notes;

  // مصدر البيانات
  fields["مصدر البيانات"] = "نظام مكسب - مجمع البيانات";

  return fields;
}

// ─── Send one lead to Whatchimp ───────────────────────────────────────────────
async function sendLeadToWhatchimp(
  settings: typeof whatchimpSettings.$inferSelect,
  lead: LeadForWhatchimp,
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
    // NOTE: subscriber/create uses camelCase params (phoneNumberID, phoneNumber, name)
    // unlike other endpoints which use snake_case. See Whatchimp API docs.
    const subRes = await whatchimpPost("/whatsapp/subscriber/create", {
      apiToken: settings.apiToken,
      phoneNumberID: settings.phoneNumberId,
      phoneNumber: phone,
      name: lead.companyName,
    });

    // 2. Assign custom fields with lead data (non-fatal)
    try {
      const customFields = buildCustomFields(lead);
      if (Object.keys(customFields).length > 0) {
        await whatchimpPost("/whatsapp/subscriber/chat/assign-custom-fields", {
          apiToken: settings.apiToken,
          phone_number_id: settings.phoneNumberId,
          phone_number: phone,
          custom_fields: JSON.stringify(customFields),
        });
      }
    } catch { /* non-fatal */ }

    // 3. Assign label if configured (non-fatal)
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

    // 4. Add note with lead info (non-fatal)
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
        // If __KEEP__ is sent, don't overwrite the stored token
        if (input.apiToken !== "__KEEP__") {
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
          // Only update non-token fields
          await db.update(whatchimpSettings)
            .set({
              phoneNumberId: input.phoneNumberId,
              defaultLabelId: input.defaultLabelId ?? null,
              defaultLabelName: input.defaultLabelName ?? null,
              isActive: true,
            })
            .where(eq(whatchimpSettings.id, existing[0].id));
        }
      } else {
        if (input.apiToken === "__KEEP__") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "يجب إدخال API Token" });
        }
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
        businessType: leads.businessType,
        city: leads.city,
        country: leads.country,
        district: leads.district,
        website: leads.website,
        googleMapsUrl: leads.googleMapsUrl,
        instagramUrl: leads.instagramUrl,
        twitterUrl: leads.twitterUrl,
        snapchatUrl: leads.snapchatUrl,
        tiktokUrl: leads.tiktokUrl,
        facebookUrl: leads.facebookUrl,
        reviewCount: leads.reviewCount,
        leadPriorityScore: leads.leadPriorityScore,
        biggestMarketingGap: leads.biggestMarketingGap,
        suggestedSalesEntryAngle: leads.suggestedSalesEntryAngle,
        stage: leads.stage,
        priority: leads.priority,
        notes: leads.notes,
        crNumber: leads.crNumber,
        socialSince: leads.socialSince,
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
        businessType: leads.businessType,
        city: leads.city,
        country: leads.country,
        district: leads.district,
        website: leads.website,
        googleMapsUrl: leads.googleMapsUrl,
        instagramUrl: leads.instagramUrl,
        twitterUrl: leads.twitterUrl,
        snapchatUrl: leads.snapchatUrl,
        tiktokUrl: leads.tiktokUrl,
        facebookUrl: leads.facebookUrl,
        reviewCount: leads.reviewCount,
        leadPriorityScore: leads.leadPriorityScore,
        biggestMarketingGap: leads.biggestMarketingGap,
        suggestedSalesEntryAngle: leads.suggestedSalesEntryAngle,
        stage: leads.stage,
        priority: leads.priority,
        notes: leads.notes,
        crNumber: leads.crNumber,
        socialSince: leads.socialSince,
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

  // ── Check if settings exist (for UI) ─────────────────────────────────────────────────────
  isConfigured: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({ id: whatchimpSettings.id }).from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
    return { configured: rows.length > 0 };
  }),

  // ── Weekly send stats for dashboard ─────────────────────────────────────────────────────
  getWeeklyStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

    const [thisWeekRows, lastWeekRows, totalRows] = await Promise.all([
      db.select({ count: sql<number>`count(DISTINCT lead_id)` })
        .from(whatchimpSendLog)
        .where(and(eq(whatchimpSendLog.status, "success"), gte(whatchimpSendLog.sentAt, startOfThisWeek))),
      db.select({ count: sql<number>`count(DISTINCT lead_id)` })
        .from(whatchimpSendLog)
        .where(and(
          eq(whatchimpSendLog.status, "success"),
          gte(whatchimpSendLog.sentAt, startOfLastWeek),
          lt(whatchimpSendLog.sentAt, startOfThisWeek)
        )),
      db.select({ count: sql<number>`count(DISTINCT lead_id)` })
        .from(whatchimpSendLog)
        .where(eq(whatchimpSendLog.status, "success")),
    ]);

    const thisWeek = Number(thisWeekRows[0]?.count ?? 0);
    const lastWeek = Number(lastWeekRows[0]?.count ?? 0);
    const total = Number(totalRows[0]?.count ?? 0);
    const growth = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    return { thisWeek, lastWeek, total, growth };
  }),

  // ── Get Templates List ─────────────────────────────────────────────────────
  getTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const settings = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
    if (!settings[0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Whatchimp غير مربوط" });
    const { apiToken, phoneNumberId } = settings[0];
    const data = await whatchimpPost("/whatsapp/template/list", { apiToken, phone_number_id: phoneNumberId });
    const templates = Array.isArray(data.message) ? data.message : [];
    return templates.map((t: Record<string, unknown>) => {
      let rawName = "";
      let rawCategory = "";
      let language = "ar";
      try {
        const raw = JSON.parse((t.raw_data as string) || "{}");
        rawName = raw.mixed_template_name || "";
        rawCategory = raw.mixed_template_category || "";
        language = raw.locale || "ar";
      } catch {}
      const vars = t.variable_map ? JSON.parse(t.variable_map as string) : {};
      const bodyVars: string[] = vars.body ? Object.values(vars.body) : [];
      return {
        id: t.id as number,
        name: rawName || String(t.id),
        category: rawCategory,
        status: t.status as string,
        language,
        buttonType: t.button_type as string,
        variables: bodyVars,
      };
    });
  }),

  // ── Send Template Message (single lead) ───────────────────────────────────
  sendTemplateMessage: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      templateName: z.string(),
      languageCode: z.string().default("ar"),
      pdfUrl: z.string().url().optional(), // رابط التقرير لإرفاقه كـ document header
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const settings = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
      if (!settings[0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Whatchimp غير مربوط" });
      const { apiToken, phoneNumberId } = settings[0];

      const leadRows = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!leadRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "العميل غير موجود" });
      const lead = leadRows[0];
      if (!lead.verifiedPhone) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد رقم هاتف للعميل" });

      const phone = normalizePhone(lead.verifiedPhone);

      // Build send params — include document header when pdfUrl is provided
      const sendParams: Record<string, string | number> = {
        apiToken,
        phone_number_id: phoneNumberId,
        phone_number: phone,
        template_name: input.templateName,
        language_code: input.languageCode,
      };
      if (input.pdfUrl) {
        sendParams["header_type"] = "document";
        sendParams["header_document_url"] = input.pdfUrl;
      }

      // Send template message
      const result = await whatchimpPost("/whatsapp/send", sendParams);

      const success = String(result.status) === "1";

      // Log the send
      await db.insert(whatchimpSendLog).values({
        leadId: input.leadId,
        phone,
        leadName: lead.companyName,
        batchId: `tmpl_${Date.now()}`,
        status: success ? "success" : "failed",
        errorMessage: success ? null : String(result.message ?? "فشل الإرسال"),
      });

      if (!success) throw new TRPCError({ code: "BAD_REQUEST", message: String(result.message ?? "فشل إرسال الرسالة") });
      return { success: true, withPdf: !!input.pdfUrl };
    }),

  // ── Bulk Send Template Messages ────────────────────────────────────────────
  bulkSendTemplate: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1),
      templateName: z.string(),
      languageCode: z.string().default("ar"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const settings = await db.select().from(whatchimpSettings).where(eq(whatchimpSettings.isActive, true)).limit(1);
      if (!settings[0]) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Whatchimp غير مربوط" });
      const { apiToken, phoneNumberId } = settings[0];

      const leadRows = await db.select().from(leads).where(inArray(leads.id, input.leadIds));
      const batchId = `bulk_tmpl_${Date.now()}`;
      let sent = 0;
      let skipped = 0;

      for (const lead of leadRows) {
        if (!lead.verifiedPhone) { skipped++; continue; }
        const phone = normalizePhone(lead.verifiedPhone);
        try {
          const result = await whatchimpPost("/whatsapp/send", {
            apiToken,
            phone_number_id: phoneNumberId,
            phone_number: phone,
            template_name: input.templateName,
            language_code: input.languageCode,
          });
          const success = String(result.status) === "1";
          await db.insert(whatchimpSendLog).values({
            leadId: lead.id,
            phone,
            leadName: lead.companyName,
            batchId,
            status: success ? "success" : "failed",
            errorMessage: success ? null : String(result.message ?? "فشل"),
          });
          if (success) sent++; else skipped++;
        } catch {
          skipped++;
        }
        // تأخير بسيط بين الرسائل
        await new Promise(r => setTimeout(r, 500));
      }

      return { sent, skipped, total: leadRows.length };
    }),

  // ─── التحقق من صحة أرقام الواتساب لقائمة من العملاء ───────────────────────────────────────
  validatePhones: protectedProcedure
    .input(z.object({ leadIds: z.array(z.number()) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const leadRows = await db
        .select({
          id: leads.id,
          companyName: leads.companyName,
          verifiedPhone: leads.verifiedPhone,
        })
        .from(leads)
        .where(inArray(leads.id, input.leadIds));

      return leadRows.map((lead) => {
        const phone = lead.verifiedPhone ?? "";
        const validation = validateAndNormalizePhone(phone);
        return {
          leadId: lead.id,
          companyName: lead.companyName,
          rawPhone: phone,
          normalizedPhone: validation.normalized,
          valid: validation.valid,
          warning: validation.warning ?? null,
          country: validation.country ?? null,
        };
      });
    }),
});
