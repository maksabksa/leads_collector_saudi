/**
 * Email Service - خدمة إرسال الإيميلات عبر SMTP
 */
import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || "مكسب للمبيعات";

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[Email] SMTP غير مُعدّ — لم يتم إرسال الإيميل");
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });
    console.log(`[Email] تم الإرسال بنجاح إلى: ${to}`);
    return true;
  } catch (err) {
    console.error("[Email] خطأ في الإرسال:", err);
    return false;
  }
}

export async function verifySmtpConnection(): Promise<boolean> {
  if (!SMTP_USER || !SMTP_PASS) return false;
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}

// ===== قوالب الإيميلات =====

export function buildInvitationEmail({
  inviteeEmail,
  inviterName,
  inviteUrl,
  role,
}: {
  inviteeEmail: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}) {
  const roleLabel = role === "admin" ? "مدير" : "موظف";
  return {
    to: inviteeEmail,
    subject: `دعوة للانضمام إلى نظام مكسب للمبيعات`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 32px 24px; text-align: center; }
    .logo { width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: white; margin-bottom: 12px; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body p { color: #cbd5e1; line-height: 1.7; font-size: 15px; margin: 0 0 16px; }
    .badge { display: inline-block; background: #7c3aed22; color: #a78bfa; border: 1px solid #7c3aed44; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-bottom: 20px; }
    .btn { display: block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-align: center; font-size: 16px; font-weight: bold; margin: 24px 0; }
    .note { background: #0f172a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #64748b; border: 1px solid #1e293b; }
    .footer { text-align: center; padding: 20px 24px; border-top: 1px solid #334155; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">م</div>
      <h1>مكسب للمبيعات</h1>
      <p>نظام تجميع وإدارة العملاء</p>
    </div>
    <div class="body">
      <p>مرحباً،</p>
      <p>قام <strong style="color:#a78bfa">${inviterName}</strong> بدعوتك للانضمام إلى نظام مكسب للمبيعات بصلاحية:</p>
      <span class="badge">🎯 ${roleLabel}</span>
      <p>انقر على الزر أدناه لإنشاء حسابك وتعيين كلمة المرور:</p>
      <a href="${inviteUrl}" class="btn">قبول الدعوة وإنشاء الحساب</a>
      <div class="note">
        ⏰ هذا الرابط صالح لمدة <strong>48 ساعة</strong> فقط.<br>
        إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا الإيميل.
      </div>
    </div>
    <div class="footer">
      © 2025 مكسب للمبيعات — جميع الحقوق محفوظة
    </div>
  </div>
</body>
</html>`,
  };
}

export function buildPasswordResetEmail({
  email,
  resetUrl,
}: {
  email: string;
  resetUrl: string;
}) {
  return {
    to: email,
    subject: `إعادة تعيين كلمة المرور - مكسب للمبيعات`,
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #dc2626, #7c3aed); padding: 32px 24px; text-align: center; }
    .logo { width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; color: white; margin-bottom: 12px; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body p { color: #cbd5e1; line-height: 1.7; font-size: 15px; margin: 0 0 16px; }
    .btn { display: block; background: linear-gradient(135deg, #dc2626, #7c3aed); color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; text-align: center; font-size: 16px; font-weight: bold; margin: 24px 0; }
    .note { background: #0f172a; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #64748b; border: 1px solid #1e293b; }
    .footer { text-align: center; padding: 20px 24px; border-top: 1px solid #334155; color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">م</div>
      <h1>إعادة تعيين كلمة المرور</h1>
      <p>مكسب للمبيعات</p>
    </div>
    <div class="body">
      <p>مرحباً،</p>
      <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحساب البريد الإلكتروني: <strong style="color:#a78bfa">${email}</strong></p>
      <p>انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
      <a href="${resetUrl}" class="btn">إعادة تعيين كلمة المرور</a>
      <div class="note">
        ⏰ هذا الرابط صالح لمدة <strong>1 ساعة</strong> فقط.<br>
        إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا الإيميل — حسابك آمن.
      </div>
    </div>
    <div class="footer">
      © 2025 مكسب للمبيعات — جميع الحقوق محفوظة
    </div>
  </div>
</body>
</html>`,
  };
}
