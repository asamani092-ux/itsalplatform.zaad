import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { resetPasswordWithToken } from "@/lib/auth/password-reset";

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "reset-password"), 5, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as { token?: string; password?: string };
    if (!body.token) return jsonError("رمز إعادة التعيين مطلوب", "VALIDATION", 400);
    if (!body.password) return jsonError("كلمة المرور مطلوبة", "VALIDATION", 400);

    await resetPasswordWithToken(body.token, body.password);
    return jsonOk({ message: "تم تحديث كلمة المرور بنجاح" });
  } catch (error) {
    return handleApiError(error);
  }
}
