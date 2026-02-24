import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  whatsappAccounts,
  numberHealthEvents,
  backupLogs,
  scheduledBulkSends,
  leadJourney,
  leads,
  WhatsappAccount,
} from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

// ===== حساب السكور الذكي =====
function calculateHealthScore(account: {
  dailySentCount: number;
  maxDailyMessages: number;
  reportCount: number;
  blockCount: number;
  noReplyCount: number;
  totalSentCount: number;
  totalReceivedCount: number;
}): { score: number; status: "safe" | "watch" | "warning" | "danger"; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];

  // 1. نسبة الإرسال اليومي (أثقل عامل)
  const dailyRatio = account.maxDailyMessages > 0
    ? account.dailySentCount / account.maxDailyMessages
    : 0;
  if (dailyRatio > 0.9) { score -= 25; reasons.push("تجاوز 90% من الحد اليومي"); }
  else if (dailyRatio > 0.75) { score -= 15; reasons.push("تجاوز 75% من الحد اليومي"); }
  else if (dailyRatio > 0.5) { score -= 5; reasons.push("تجاوز 50% من الحد اليومي"); }

  // 2. نسبة الردود (معدل التفاعل)
  const replyRate = account.totalSentCount > 0
    ? account.totalReceivedCount / account.totalSentCount
    : 1;
  if (replyRate < 0.05) { score -= 20; reasons.push("معدل رد منخفض جداً (أقل من 5%)"); }
  else if (replyRate < 0.1) { score -= 10; reasons.push("معدل رد منخفض (أقل من 10%)"); }

  // 3. عدد الإبلاغات
  if (account.reportCount >= 5) { score -= 30; reasons.push(`${account.reportCount} إبلاغات مسجلة`); }
  else if (account.reportCount >= 2) { score -= 15; reasons.push(`${account.reportCount} إبلاغات مسجلة`); }
  else if (account.reportCount >= 1) { score -= 8; reasons.push("إبلاغ واحد مسجل"); }

  // 4. عدد الحظر
  if (account.blockCount >= 10) { score -= 25; reasons.push(`${account.blockCount} حالة حظر`); }
  else if (account.blockCount >= 5) { score -= 15; reasons.push(`${account.blockCount} حالة حظر`); }
  else if (account.blockCount >= 1) { score -= 5; reasons.push(`${account.blockCount} حالة حظر`); }

  // 5. الرسائل بدون رد
  const noReplyRatio = account.totalSentCount > 0
    ? account.noReplyCount / account.totalSentCount
    : 0;
  if (noReplyRatio > 0.7) { score -= 15; reasons.push("70%+ من الرسائل بدون رد"); }
  else if (noReplyRatio > 0.5) { score -= 8; reasons.push("50%+ من الرسائل بدون رد"); }

  score = Math.max(0, Math.min(100, score));

  let status: "safe" | "watch" | "warning" | "danger";
  if (score >= 75) status = "safe";
  else if (score >= 50) status = "watch";
  else if (score >= 25) status = "warning";
  else status = "danger";

  return { score, status, reasons };
}

export const numberHealthRouter = router({
  // ===== جلب جميع الأرقام مع سكورها =====
  getAll: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const accounts = await db.select().from(whatsappAccounts).orderBy(whatsappAccounts.healthScore);
    return accounts.map((acc: WhatsappAccount) => {
      const { score, status } = calculateHealthScore(acc);
      return { ...acc, computedScore: score, computedStatus: status };
    });
  }),

  // ===== تحديث سكور رقم معين =====
  updateScore: adminProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [account] = await db.select().from(whatsappAccounts)
        .where(eq(whatsappAccounts.accountId, input.accountId));
      if (!account) throw new Error("الحساب غير موجود");

      const { score, status, reasons } = calculateHealthScore(account);
      const scoreBefore = account.healthScore;

      await db.update(whatsappAccounts)
        .set({
          healthScore: score,
          healthStatus: status,
          lastScoreUpdate: new Date(),
        })
        .where(eq(whatsappAccounts.accountId, input.accountId));

      // تسجيل الحدث إذا تغير السكور بشكل ملحوظ
      if (Math.abs(score - scoreBefore) >= 5) {
        await db.insert(numberHealthEvents).values({
          accountId: input.accountId,
          eventType: score < scoreBefore ? "score_drop" : "score_rise",
          description: reasons.join(" | "),
          scoreBefore,
          scoreAfter: score,
        });

        // تنبيه المالك إذا وصل للخطر
        if (status === "danger" || status === "warning") {
          await notifyOwner({
            title: `⚠️ تحذير: رقم ${account.label} في خطر`,
            content: `سكور الرقم ${account.phoneNumber} انخفض إلى ${score}/100\nالحالة: ${status === "danger" ? "خطر مرتفع 🔴" : "تحذير 🟠"}\nالأسباب: ${reasons.join(", ")}`,
          });
        }
      }

      return { score, status, reasons };
    }),

  // ===== تحديث سكور جميع الأرقام =====
  updateAllScores: adminProcedure.mutation(async () => {
    const db = (await getDb())!;
    const accounts = await db.select().from(whatsappAccounts);
    const results = [];
    for (const account of accounts) {
      const { score, status, reasons } = calculateHealthScore(account);
      await db.update(whatsappAccounts)
        .set({ healthScore: score, healthStatus: status, lastScoreUpdate: new Date() })
        .where(eq(whatsappAccounts.accountId, account.accountId));
      results.push({ accountId: account.accountId, label: account.label, score, status });
    }
    return results;
  }),

  // ===== تسجيل حدث يدوي (إبلاغ / حظر) =====
  reportEvent: adminProcedure
    .input(z.object({
      accountId: z.string(),
      eventType: z.enum(["report", "block", "no_reply"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [account] = await db.select().from(whatsappAccounts)
        .where(eq(whatsappAccounts.accountId, input.accountId));
      if (!account) throw new Error("الحساب غير موجود");

      const updates: Partial<typeof account> = {};
      if (input.eventType === "report") updates.reportCount = account.reportCount + 1;
      if (input.eventType === "block") updates.blockCount = account.blockCount + 1;
      if (input.eventType === "no_reply") updates.noReplyCount = account.noReplyCount + 1;

      await db.update(whatsappAccounts).set(updates)
        .where(eq(whatsappAccounts.accountId, input.accountId));

      // إعادة حساب السكور
      const updated = { ...account, ...updates };
      const { score, status, reasons } = calculateHealthScore(updated as typeof account);
      await db.update(whatsappAccounts)
        .set({ healthScore: score, healthStatus: status, lastScoreUpdate: new Date() })
        .where(eq(whatsappAccounts.accountId, input.accountId));

      await db.insert(numberHealthEvents).values({
        accountId: input.accountId,
        eventType: input.eventType,
        description: input.description ?? reasons.join(" | "),
        scoreBefore: account.healthScore,
        scoreAfter: score,
      });

      return { score, status };
    }),

  // ===== تحديث إعدادات الإرسال =====
  updateSettings: adminProcedure
    .input(z.object({
      accountId: z.string(),
      maxDailyMessages: z.number().min(1).max(1000),
      minIntervalSeconds: z.number().min(5).max(300),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(whatsappAccounts)
        .set({
          maxDailyMessages: input.maxDailyMessages,
          minIntervalSeconds: input.minIntervalSeconds,
        })
        .where(eq(whatsappAccounts.accountId, input.accountId));
      return { success: true };
    }),

  // ===== جلب تاريخ الأحداث =====
  getEvents: protectedProcedure
    .input(z.object({ accountId: z.string(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(numberHealthEvents)
        .where(eq(numberHealthEvents.accountId, input.accountId))
        .orderBy(desc(numberHealthEvents.createdAt))
        .limit(input.limit);
    }),

  // ===== إحصائيات ملخصة =====
  getSummary: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const accounts = await db.select().from(whatsappAccounts);
    const summary = {
      total: accounts.length,
      safe: accounts.filter((a: WhatsappAccount) => a.healthStatus === "safe").length,
      watch: accounts.filter((a: WhatsappAccount) => a.healthStatus === "watch").length,
      warning: accounts.filter((a: WhatsappAccount) => a.healthStatus === "warning").length,
      danger: accounts.filter((a: WhatsappAccount) => a.healthStatus === "danger").length,
      avgScore: accounts.length > 0
        ? Math.round(accounts.reduce((s: number, a: WhatsappAccount) => s + a.healthScore, 0) / accounts.length)
        : 100,
    };
    return summary;
  }),

  // ===== إنشاء نسخة احتياطية يدوية =====
  createBackup: adminProcedure
    .input(z.object({ emailTo: z.string().email().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const insertResult = await db.insert(backupLogs).values({
        type: "manual",
        status: "running",
        emailTo: input.emailTo,
      });
      const logId = (insertResult as unknown as { insertId: number }).insertId;

      try {
        // جمع البيانات
        const allLeads = await db.select().from(leads);
        const backupData = {
          exportedAt: new Date().toISOString(),
          leads: allLeads,
        };

        const jsonContent = JSON.stringify(backupData, null, 2);
        const buffer = Buffer.from(jsonContent, "utf-8");
        const fileName = `backup-${new Date().toISOString().split("T")[0]}-manual.json`;

        const { storagePut } = await import("../storage");
        const { url, key } = await storagePut(`backups/${fileName}`, buffer, "application/json");

        await db.update(backupLogs)
          .set({
            status: "success",
            filePath: key,
            fileUrl: url,
            fileSize: buffer.length,
            completedAt: new Date(),
            recordCount: { leads: allLeads.length, chats: 0, messages: 0 },
          })
          .where(eq(backupLogs.id, logId));

        return { success: true, url, fileName, size: buffer.length };
      } catch (err) {
        await db.update(backupLogs)
          .set({ status: "failed", error: String(err), completedAt: new Date() })
          .where(eq(backupLogs.id, logId));
        throw err;
      }
    }),

  // ===== جلب سجل النسخ الاحتياطية =====
  getBackupLogs: adminProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(backupLogs)
        .orderBy(desc(backupLogs.createdAt))
        .limit(input.limit);
    }),

  // ===== تتبع مسار العميل =====
  addJourneyEvent: protectedProcedure
    .input(z.object({
      phone: z.string(),
      leadId: z.number().optional(),
      eventType: z.enum([
        "created", "message_sent", "message_received",
        "interest_detected", "transferred_to_employee", "transferred_to_ai",
        "deal_closed", "deal_lost", "archived"
      ]),
      description: z.string().optional(),
      performedBy: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.insert(leadJourney).values({
        phone: input.phone,
        leadId: input.leadId,
        eventType: input.eventType,
        description: input.description,
        performedBy: input.performedBy ?? ctx.user.name ?? "system",
        metadata: input.metadata,
      });
      return { success: true };
    }),

  // ===== جلب مسار عميل معين =====
  getJourney: protectedProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(leadJourney)
        .where(eq(leadJourney.phone, input.phone))
        .orderBy(desc(leadJourney.createdAt));
    }),

  // ===== جلب الإرسال المجدول =====
  getScheduledSends: adminProcedure.query(async () => {
    const db = (await getDb())!;
    return db.select().from(scheduledBulkSends)
      .orderBy(desc(scheduledBulkSends.createdAt))
      .limit(50);
  }),
});
