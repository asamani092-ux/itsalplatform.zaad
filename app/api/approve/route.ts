import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  approveRequest,
  getRequestByToken,
  rejectRequestByToken,
} from "@/lib/request-service";

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
      contactName: existing.contactName,
      description: existing.description,
      requiredDate: existing.requiredDate,
      contactEmail: existing.contactEmail,
      contactPhone: existing.contactPhone,
      managerEmail: existing.managerEmail,
      status: existing.status,
      approvedAt: existing.approvedAt,
      approvalTokenExpiresAt: existing.approvalTokenExpiresAt,
      rejectionReason: existing.rejectionReason,
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
    const tokenFromQuery = request.nextUrl.searchParams.get("token");
    const body = (await request.json().catch(() => ({}))) as {
      token?: string;
      action?: "approve" | "reject";
      reason?: string;
    };
    const token = tokenFromQuery ?? body.token;

    if (!token) {
      return jsonError("رمز الموافقة مطلوب", "MISSING_TOKEN", 400);
    }

    if (body.action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reason) {
        return jsonError("سبب الرفض مطلوب", "VALIDATION", 400);
      }
      if (reason.length > 2000) {
        return jsonError("سبب الرفض يتجاوز الحد الأقصى", "VALIDATION", 400);
      }
      const updated = await rejectRequestByToken(token, reason);
      return jsonOk({
        id: updated.id,
        status: updated.status,
        message: "تم رفض الطلب",
      });
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
