import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(message: string, code: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status },
  );
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}

function isMissingRelationError(message: string): boolean {
  return (
    /relation .* does not exist/i.test(message) ||
    /table .* does not exist/i.test(message) ||
    /does not exist in the current database/i.test(message) ||
    message.includes("P2021")
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.startsWith("TIMEOUT:")) {
      return jsonError(error.message.replace("TIMEOUT: ", ""), "TIMEOUT", 504);
    }
    if (error.message.startsWith("FORBIDDEN:")) {
      return jsonError(error.message.replace("FORBIDDEN: ", ""), "FORBIDDEN", 403);
    }
    if (error.message.startsWith("UNAUTHORIZED:")) {
      return jsonError(error.message.replace("UNAUTHORIZED: ", ""), "UNAUTHORIZED", 401);
    }
    if (error.message.startsWith("ALREADY_PROCESSED:")) {
      return jsonError(error.message.replace("ALREADY_PROCESSED: ", ""), "ALREADY_PROCESSED", 409);
    }
    if (error.message.startsWith("INVALID_STATE:")) {
      return jsonError(error.message.replace("INVALID_STATE: ", ""), "INVALID_STATE", 409);
    }
    if (error.message.startsWith("INVALID_TRANSITION:")) {
      return jsonError(error.message.replace("INVALID_TRANSITION: ", ""), "INVALID_TRANSITION", 409);
    }
    if (error.message.startsWith("NOT_FOUND:")) {
      return jsonError(error.message.replace("NOT_FOUND: ", ""), "NOT_FOUND", 404);
    }
    if (error.message.startsWith("VALIDATION:")) {
      return jsonError(error.message.replace("VALIDATION: ", ""), "VALIDATION", 400);
    }
    if (error.message.startsWith("TOKEN_EXPIRED:")) {
      return jsonError(error.message.replace("TOKEN_EXPIRED: ", ""), "TOKEN_EXPIRED", 410);
    }
    if (error.message.startsWith("RATE_LIMITED:")) {
      return jsonError(error.message.replace("RATE_LIMITED: ", ""), "RATE_LIMITED", 429);
    }
    if (isMissingRelationError(error.message)) {
      return jsonError(
        "قاعدة البيانات غير مهيأة بعد. نفّذ ترحيل الجداول ثم أعد المحاولة.",
        "DB_NOT_READY",
        503,
      );
    }
    // Never leak raw English infrastructure errors to the UI.
    console.error("[api]", error);
    return jsonError("حدث خطأ في الخادم. حاول لاحقاً.", "INTERNAL_ERROR", 500);
  }
  return jsonError("حدث خطأ غير متوقع", "INTERNAL_ERROR", 500);
}
