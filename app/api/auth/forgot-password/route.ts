import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { requestPasswordReset, accountExistsForReset } from "@/lib/auth/password-reset";

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "forgot-password"), 5, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as { email?: string };
    if (!body.email?.trim()) {
      return jsonError("البريد الإلكتروني مطلوب", "VALIDATION", 400);
    }

    const exists = await accountExistsForReset(body.email);
    if (!exists) {
      return jsonError("الحساب غير مسجل", "NOT_FOUND", 404);
    }

    await requestPasswordReset(body.email);

    return jsonOk({
      message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك إن كان مفعّلاً.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
