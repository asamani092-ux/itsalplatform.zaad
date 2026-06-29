import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { approveRequest, getRequestByToken } from "@/lib/request-service";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return jsonError("رمز الموافقة مطلوب", "MISSING_TOKEN", 400);
    }

    const existing = await getRequestByToken(token);
    return jsonOk({
      id: existing.id,
      title: existing.title,
      status: existing.status,
      approvedAt: existing.approvedAt,
      department: existing.department,
      requestType: existing.requestType,
      visitDate: existing.visitDate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token =
      request.nextUrl.searchParams.get("token") ??
      ((await request.json().catch(() => ({}))) as { token?: string }).token;

    if (!token) {
      return jsonError("رمز الموافقة مطلوب", "MISSING_TOKEN", 400);
    }

    const updated = await approveRequest(token);
    return jsonOk({
      id: updated.id,
      status: updated.status,
      approvedAt: updated.approvedAt,
      message: "تمت الموافقة — الطلب أصبح في لوحة قسم الاتصال",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
