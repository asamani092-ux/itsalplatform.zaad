import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { getAppUrl, handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { isValidTokenFormat } from "@/lib/tokens";
import { assertTransition } from "@/lib/workflow";

async function approveByToken(token: string) {
  if (!isValidTokenFormat(token)) {
    return jsonError("رمز الموافقة غير صالح", 400, "INVALID_TOKEN");
  }

  const existing = await prisma.communicationRequest.findUnique({
    where: { approvalToken: token },
  });

  if (!existing) {
    return jsonError("الطلب غير موجود", 404, "NOT_FOUND");
  }

  if (existing.status !== RequestStatus.Pending_Manager) {
    return jsonError("تمت معالجة هذا الطلب مسبقاً", 409, "ALREADY_PROCESSED");
  }

  assertTransition(
    RequestStatus.Pending_Manager,
    RequestStatus.Approved_Pending_Assignment
  );

  const now = new Date();
  const updated = await prisma.communicationRequest.update({
    where: { id: existing.id },
    data: {
      status: RequestStatus.Approved_Pending_Assignment,
      managerApprovedAt: now,
      statusHistory: {
        create: {
          fromStatus: RequestStatus.Pending_Manager,
          toStatus: RequestStatus.Approved_Pending_Assignment,
          changedBy: existing.managerEmail,
          note: "موافقة المدير عبر الرابط",
        },
      },
    },
  });

  return jsonOk({
    id: updated.id,
    status: updated.status,
    managerApprovedAt: updated.managerApprovedAt,
    message: "تمت الموافقة بنجاح — الطلب أُرسل لقسم الاتصال المؤسسي",
    dashboardUrl: `${getAppUrl()}/api/dashboard/requests?view=active`,
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return jsonError("رمز الموافقة مطلوب", 400, "MISSING_TOKEN");
    }
    return approveByToken(token);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    if (!body.token) {
      return jsonError("رمز الموافقة مطلوب", 400, "MISSING_TOKEN");
    }
    return approveByToken(body.token);
  } catch (error) {
    return handleApiError(error);
  }
}
