/**
 * Staff Authentication Router
 * نظام تسجيل دخول مستقل للموظفين بالإيميل وكلمة المرور
 * لا يعتمد على Manus OAuth
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, userInvitations, userPermissions, passwordResetTokens } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const jwt = require("jsonwebtoken") as typeof import("jsonwebtoken");
const { sign, verify } = jwt;
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sendEmail, buildPasswordResetEmail } from "../emailService";

const STAFF_COOKIE = "staff_session";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_change_me";

// ===== HELPERS =====
function generateStaffToken(userId: number, role: string) {
  return sign({ userId, role, type: "staff" }, JWT_SECRET, { expiresIn: "7d" });
}

export const staffAuthRouter = router({
  // تسجيل الدخول بالإيميل وكلمة المرور
  login: publicProcedure
    .input(z.object({
      email: z.string().email("بريد إلكتروني غير صحيح"),
      password: z.string().min(1, "كلمة المرور مطلوبة"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطأ في الاتصال بقاعدة البيانات" });

      // البحث عن المستخدم بالإيميل
      const userRows = await db.select().from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);

      const user = userRows[0];

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      if (!user.isActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "هذا الحساب معطّل. تواصل مع المدير" });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "هذا الحساب لا يدعم تسجيل الدخول بكلمة المرور. استخدم تسجيل الدخول عبر Manus" });
      }

      // التحقق من كلمة المرور
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      }

      // تحديث آخر تسجيل دخول
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // إنشاء JWT token
      const token = generateStaffToken(user.id, user.role);

      // حفظ في cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(STAFF_COOKIE, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
      });

      return {
        success: true,
        user: {
          id: user.id,
          name: user.displayName || user.name || user.email,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      };
    }),

  // تسجيل الخروج
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(STAFF_COOKIE, { ...cookieOptions, maxAge: -1 });
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  // جلب بيانات المستخدم الحالي (من staff cookie)
  me: publicProcedure.query(async ({ ctx }) => {
    // أولاً: تحقق من Manus session (ctx.user)
    if (ctx.user) {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        role: ctx.user.role,
        loginType: "manus" as const,
      };
    }

    // ثانياً: تحقق من staff cookie
    const staffToken = ctx.req.cookies?.[STAFF_COOKIE];
    if (!staffToken) return null;

    try {
      const payload = verify(staffToken, JWT_SECRET) as { userId: number; role: string; type: string };
      if (payload.type !== "staff") return null;

      const db = await getDb();
      if (!db) return null;

      const userRows = await db.select().from(users)
        .where(and(eq(users.id, payload.userId), eq(users.isActive, true)))
        .limit(1);

      const user = userRows[0];
      if (!user) return null;

      return {
        id: user.id,
        name: user.displayName || user.name || user.email || "",
        email: user.email,
        role: user.role,
        department: user.department,
        loginType: "staff" as const,
      };
    } catch {
      return null;
    }
  }),

  // قبول دعوة وإنشاء حساب
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(2, "الاسم يجب أن يكون حرفَين على الأقل"),
      password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // التحقق من الدعوة
      const invRows = await db.select().from(userInvitations)
        .where(and(
          eq(userInvitations.token, input.token),
          eq(userInvitations.status, "pending"),
        ))
        .limit(1);

      const invitation = invRows[0];
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "رابط الدعوة غير صحيح أو منتهي الصلاحية" });
      }

      if (new Date() > invitation.expiresAt) {
        await db.update(userInvitations).set({ status: "expired" }).where(eq(userInvitations.id, invitation.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية رابط الدعوة. اطلب دعوة جديدة" });
      }

      // التحقق من عدم وجود حساب بهذا الإيميل
      const existingUser = await db.select().from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      if (existingUser[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "يوجد حساب بهذا البريد الإلكتروني بالفعل" });
      }

      // تشفير كلمة المرور
      const passwordHash = await bcrypt.hash(input.password, 12);

      // إنشاء الحساب
      const result = await db.insert(users).values({
        openId: `staff_${invitation.email}_${Date.now()}`,
        name: input.name,
        displayName: input.name,
        email: invitation.email,
        role: invitation.role,
        passwordHash,
        isActive: true,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const newUserId = Number((result as any).insertId);

      // إضافة الصلاحيات إن وجدت
      if (invitation.permissions && Array.isArray(invitation.permissions) && invitation.permissions.length > 0) {
        await db.insert(userPermissions).values({
          userId: newUserId,
          permissions: invitation.permissions,
        });
      }

      // تحديث حالة الدعوة
      await db.update(userInvitations).set({
        status: "accepted",
        acceptedBy: newUserId,
      }).where(eq(userInvitations.id, invitation.id));

      // تسجيل الدخول تلقائياً
      const token = generateStaffToken(newUserId, invitation.role);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(STAFF_COOKIE, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return { success: true, message: "تم إنشاء حسابك بنجاح! مرحباً بك" };
    }),

  // طلب إعادة تعيين كلمة المرور
  forgotPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      origin: z.string().url(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // البحث عن المستخدم (لا نكشف إن كان موجوداً أم لا)
      const userRows = await db.select().from(users)
        .where(eq(users.email, input.email.toLowerCase().trim()))
        .limit(1);

      const user = userRows[0];

      if (user && user.passwordHash && user.isActive) {
        const token = randomBytes(48).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // ساعة واحدة

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });

        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        const emailData = buildPasswordResetEmail({ email: user.email!, resetUrl });
        await sendEmail(emailData);
      }

      // دائماً نرجع نفس الرسالة لأسباب أمنية
      return { success: true, message: "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة إعادة التعيين" };
    }),

  // إعادة تعيين كلمة المرور
  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const tokenRows = await db.select().from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, input.token))
        .limit(1);

      const resetToken = tokenRows[0];

      if (!resetToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "رابط إعادة التعيين غير صحيح" });
      }

      if (resetToken.usedAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "هذا الرابط مستخدم بالفعل" });
      }

      if (new Date() > resetToken.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية رابط إعادة التعيين. اطلب رابطاً جديداً" });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);

      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, resetToken.userId));
      await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));

      return { success: true, message: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن" };
    }),

  // تغيير كلمة المرور
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userRows = await db.select().from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const user = userRows[0];
      if (!user?.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "حسابك لا يدعم تغيير كلمة المرور" });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
      }

      const newHash = await bcrypt.hash(input.newPassword, 12);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

      return { success: true };
    }),
});
