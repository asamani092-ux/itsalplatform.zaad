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

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
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
    return jsonError(error.message, "INTERNAL_ERROR", 500);
  }
  return jsonError("حدث خطأ غير متوقع", "INTERNAL_ERROR", 500);
}
