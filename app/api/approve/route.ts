import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/workflow";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { recordStatusChange } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

async function approveByToken(token: string) {
  const request = await prisma.communicationRequest.findUnique({
    where: { approvalToken: token },
  });

  if (!request) {
    throw new Error("NOT_FOUND: رمز الموافقة غير صالح");
  }

  if (request.status !== RequestStatus.Pending_Manager) {
    return jsonError("تمت معالجة هذا الطلب مسبقاً", "ALREADY_PROCESSED", 409);
  }

  assertTransition(request.status, RequestStatus.Approved_Pending_Assignment);

  const now = new Date();
  const updated = await prisma.communicationRequest.update({
    where: { id: request.id },
    data: {
      status: RequestStatus.Approved_Pending_Assignment,
      managerApprovedAt: now,
    },
  });

  await recordStatusChange({
    requestId: request.id,
    fromStatus: RequestStatus.Pending_Manager,
    toStatus: RequestStatus.Approved_Pending_Assignment,
    changedBy: request.managerEmail,
    note: "موافقة المدير المباشر",
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    managerApprovedAt: updated.managerApprovedAt,
    message: "تمت الموافقة — الطلب أصبح في لوحة قسم الاتصال",
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return jsonError("رمز الموافقة مطلوب", "MISSING_TOKEN", 400);
    }

    const existing = await prisma.communicationRequest.findUnique({
      where: { approvalToken: token },
      select: { id: true, title: true, status: true, managerApprovedAt: true },
    });

    if (!existing) {
      return jsonError("رمز الموافقة غير صالح", "NOT_FOUND", 404);
    }

    return jsonOk(existing);
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

    return await approveByToken(token);
  } catch (error) {
    return handleApiError(error);
  }
}
