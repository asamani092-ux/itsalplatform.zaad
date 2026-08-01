import "server-only";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-service";
import { getAppUrl } from "@/lib/api-utils";
import { sendEmail } from "@/lib/notifications/email";

const RESET_TTL_MS = 60 * 60 * 1000;

function resetEmailHtml(name: string, url: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8" /><title>إعادة تعيين كلمة المرور</title></head>
<body style="margin:0;padding:0;background:#F5F5F5;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right">
  <div style="max-width:560px;margin:24px auto;background:#fff;border:1px solid #E8E8E8;border-radius:12px;overflow:hidden">
    <div style="background:#8B1538;color:#fff;padding:16px 20px">
      <div style="font-size:18px;font-weight:800">جمعية الزاد</div>
      <div style="font-size:12px;color:#F2B824;margin-top:4px">قسم الاتصال المؤسسي</div>
    </div>
    <div style="padding:24px 20px;color:#706F6F">
      <h1 style="color:#8B1538;font-size:18px;margin:0 0 12px">إعادة تعيين كلمة المرور</h1>
      <p>مرحباً ${name}،</p>
      <p>وصلنا طلب لإعادة تعيين كلمة مرور حسابك. الرابط صالح لمدة ساعة واحدة.</p>
      <p style="margin:24px 0;text-align:center">
        <a href="${url}" style="background:#8B1538;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">إعادة تعيين كلمة المرور</a>
      </p>
      <p style="font-size:12px">إذا لم تطلب ذلك، تجاهل هذه الرسالة ولن يتغير شيء.</p>
    </div>
    <div style="padding:12px 20px;background:#F5F5F5;color:#706F6F;font-size:11px;border-top:1px solid #E8E8E8">
      رسالة آلية من منصة الاتصال المؤسسي — جمعية الزاد
    </div>
  </div>
</body>
</html>`;
}

/**
 * Always resolves successfully so the endpoint cannot be used to discover
 * which phone numbers exist.
 */
export async function requestPasswordReset(phoneNumber: string): Promise<void> {
  const employee = await prisma.commEmployee.findUnique({
    where: { phoneNumber: phoneNumber.trim() },
  });
  if (!employee || !employee.isActive) return;

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      token,
      employeeId: employee.id,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const url = `${getAppUrl()}/reset-password?token=${token}`;
  await sendEmail({
    to: employee.email,
    subject: "إعادة تعيين كلمة المرور — منصة الاتصال المؤسسي",
    html: resetEmailHtml(employee.name, url),
  });
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("VALIDATION: كلمة المرور يجب أن تكون 8 أحرف على الأقل");
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new Error("TOKEN_EXPIRED: رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.commEmployee.update({
      where: { id: record.employeeId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { employeeId: record.employeeId, usedAt: null },
    }),
  ]);
}
