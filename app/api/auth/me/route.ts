import { NextRequest } from "next/server";
import { getRouteSession } from "@/lib/auth/route-guard";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import {
  updateEmployee,
  verifyPassword,
} from "@/lib/auth-service";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getRouteSession();
    if (!session) {
      return jsonError("غير مسجل الدخول", "UNAUTHORIZED", 401);
    }

    return jsonOk({
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        phoneNumber: session.phoneNumber,
        role: session.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getRouteSession();
    if (!session) {
      return jsonError("غير مسجل الدخول", "UNAUTHORIZED", 401);
    }

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phoneNumber?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.name?.trim() || !body.email?.trim() || !body.phoneNumber?.trim()) {
      return jsonError("الاسم والبريد والجوال مطلوبة", "VALIDATION", 400);
    }

    if (body.newPassword) {
      if (body.newPassword.length < 8) {
        return jsonError(
          "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف",
          "VALIDATION",
          400,
        );
      }
      if (!body.currentPassword) {
        return jsonError("كلمة المرور الحالية مطلوبة للتغيير", "VALIDATION", 400);
      }
      const employee = await prisma.commEmployee.findUnique({
        where: { id: session.sub },
        select: { passwordHash: true },
      });
      if (!employee) {
        return jsonError("الحساب غير موجود", "NOT_FOUND", 404);
      }
      const valid = await verifyPassword(body.currentPassword, employee.passwordHash);
      if (!valid) {
        return jsonError("كلمة المرور الحالية غير صحيحة", "INVALID_PASSWORD", 400);
      }
    }

    const updated = await updateEmployee(session.sub, {
      name: body.name,
      email: body.email,
      phoneNumber: body.phoneNumber,
      ...(body.newPassword ? { password: body.newPassword } : {}),
    });

    const token = await createSessionToken({
      sub: updated.id,
      name: updated.name,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      role: updated.role,
    });
    await setSessionCookie(token);

    return jsonOk({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
        role: updated.role,
      },
      message: "تم تحديث البيانات",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
