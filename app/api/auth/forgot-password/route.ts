import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/auth/password-reset";

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "forgot-password"), 5, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as { phoneNumber?: string };
    if (!body.phoneNumber?.trim()) {
      return jsonError("رقم الهاتف مطلوب", "VALIDATION", 400);
    }

    await requestPasswordReset(body.phoneNumber);

    // Same response whether or not the account exists.
    return jsonOk({
      message: "إذا كان الرقم مسجلاً، فقد أُرسل رابط إعادة التعيين إلى بريد الحساب.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
