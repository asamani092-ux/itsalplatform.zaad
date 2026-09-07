import { NextRequest } from "next/server";
import { verifyLogin } from "@/lib/auth-service";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  checkRateLimit,
  clearAuthFailures,
  getLockRemainingMs,
  rateLimitKey,
  recordAuthFailure,
} from "@/lib/rate-limit";

const LOGIN_MAX_FAILURES = 10;
const LOGIN_LOCK_MS = 20 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const key = rateLimitKey(request, "auth-login");
    const lockRemaining = getLockRemainingMs(key);
    if (lockRemaining > 0) {
      const mins = Math.ceil(lockRemaining / 60_000);
      return jsonError(
        `تم قفل تسجيل الدخول مؤقتاً. حاول بعد ${mins} دقيقة.`,
        "RATE_LIMITED",
        429,
      );
    }

    const burst = checkRateLimit(key, 30, 60_000);
    if (!burst.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as {
      email?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!body.email?.trim() || !body.password) {
      return jsonError("البريد الإلكتروني وكلمة المرور مطلوبان", "VALIDATION", 400);
    }

    const user = await verifyLogin(body.email, body.password);
    if (!user) {
      const fail = recordAuthFailure(key, LOGIN_MAX_FAILURES, LOGIN_LOCK_MS);
      if (fail.locked) {
        return jsonError(
          "تم تجاوز 10 محاولات فاشلة. الحساب مقفل لمدة 20 دقيقة.",
          "RATE_LIMITED",
          429,
        );
      }
      return jsonError("بيانات الدخول غير صحيحة", "INVALID_CREDENTIALS", 401);
    }

    clearAuthFailures(key);

    const remember = body.rememberMe === true;
    const token = await createSessionToken(
      {
        sub: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber ?? "",
        role: user.role,
        departmentId: user.departmentId,
        deskAccess: user.deskAccess,
      },
      remember,
    );

    await setSessionCookie(token, remember);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        deskAccess: user.deskAccess,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
