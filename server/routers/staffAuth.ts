import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, userInvitations, passwordResetTokens } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";

export const staffAuthRouter = router({
  // تسجيل دخول الموظف بكلمة مرور
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في الاتصال بقاعدة البيانات" });

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "هذا الحساب لا يدعم تسجيل الدخول بكلمة مرور" });

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });

      // استخدام sdk.signSession لضمان توافق JWT مع verifySession في sdk.ts (jose + cookieSecret)
      const sessionToken = await sdk.signSession({
        openId: user.openId,
        appId: ENV.appId,
        name: user.name || user.email || "staff",
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    }),

  // قبول الدعوة وتعيين كلمة مرور
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(1),
      password: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في الاتصال بقاعدة البيانات" });

      const [invitation] = await db.select().from(userInvitations)
        .where(and(eq(userInvitations.token, input.token), eq(userInvitations.status, "pending")))
        .limit(1);
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND", message: "الدعوة غير موجودة أو منتهية الصلاحية" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = `staff_${nanoid(16)}`;

      // تحديث المستخدم إذا كان موجوداً أو إنشاء مستخدم جديد
      const existingUsers = await db.select().from(users).where(eq(users.email, invitation.email)).limit(1);
      let userId: number;
      if (existingUsers.length > 0) {
        await db.update(users).set({ name: input.name, passwordHash, isActive: true }).where(eq(users.email, invitation.email));
        userId = existingUsers[0].id;
      } else {
        const result = await db.insert(users).values({
          openId,
          name: input.name,
          email: invitation.email,
          passwordHash,
          role: invitation.role as any || "user",
          isActive: true,
        });
        userId = (result as any).insertId;
      }

      await db.update(userInvitations).set({ status: "accepted" }).where(eq(userInvitations.id, invitation.id));

      // استخدام sdk.signSession لضمان توافق JWT مع verifySession في sdk.ts (jose + cookieSecret)
      const sessionToken = await sdk.signSession({
        openId,
        appId: ENV.appId,
        name: input.name,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);
      return { success: true };
    }),

  // طلب إعادة تعيين كلمة المرور
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في الاتصال بقاعدة البيانات" });

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      // لا نكشف إذا كان البريد موجوداً أم لا
      if (!user) return { success: true };

      const resetToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token: resetToken,
        expiresAt,
      });

      // في بيئة الإنتاج يجب إرسال البريد الإلكتروني هنا
      console.log(`[StaffAuth] Reset token for ${input.email}: ${resetToken}`);

      return { success: true };
    }),

  // الحصول على بيانات المستخدم الحالي
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // تسجيل الخروج
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(COOKIE_NAME);
    return { success: true };
  }),

  // إعادة تعيين كلمة المرور
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في الاتصال بقاعدة البيانات" });

      const [resetRecord] = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, input.token),
          sql`${passwordResetTokens.expiresAt} > NOW()`
        ))
        .limit(1);

      if (!resetRecord) throw new TRPCError({ code: "NOT_FOUND", message: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية" });

      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, input.token));

      return { success: true };
    }),
});
