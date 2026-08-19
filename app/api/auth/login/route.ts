import { NextRequest } from "next/server";
import { verifyLogin } from "@/lib/auth-service";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "auth-login"), 5, 60_000);
    if (!limit.allowed) {
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
      return jsonError("بيانات الدخول غير صحيحة", "INVALID_CREDENTIALS", 401);
    }

    const token = await createSessionToken({
      sub: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? "",
      role: user.role,
    });

    await setSessionCookie(token, body.rememberMe === true);

    return jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
