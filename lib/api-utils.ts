import { NextResponse } from "next/server";
import { WorkflowError } from "./workflow";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(
  message: string,
  status = 400,
  code?: string
) {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof WorkflowError) {
    return jsonError(error.message, 400, error.code);
  }
  console.error(error);
  return jsonError("حدث خطأ داخلي في الخادم", 500, "INTERNAL_ERROR");
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
}
