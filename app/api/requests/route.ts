import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { getAppUrl, handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { NotifyManager } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { generateApprovalToken } from "@/lib/tokens";

type SubmitBody = {
  title: string;
  description: string;
  requiredDate: string;
  contactEmail: string;
  contactPhone: string;
  managerEmail: string;
};

function validateSubmitBody(body: SubmitBody): string | null {
  if (!body.title?.trim()) return "العنوان مطلوب";
  if (!body.description?.trim()) return "الوصف مطلوب";
  if (!body.requiredDate) return "التاريخ المطلوب مطلوب";
  if (!body.contactEmail?.trim()) return "البريد الإلكتروني مطلوب";
  if (!body.contactPhone?.trim()) return "رقم الجوال مطلوب";
  if (!body.managerEmail?.trim()) return "بريد المدير المباشر مطلوب";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;
    const validationError = validateSubmitBody(body);
    if (validationError) {
      return jsonError(validationError, 400, "VALIDATION_ERROR");
    }

    const requiredDate = new Date(body.requiredDate);
    if (Number.isNaN(requiredDate.getTime())) {
      return jsonError("تاريخ غير صالح", 400, "VALIDATION_ERROR");
    }

    const approvalToken = generateApprovalToken();

    const created = await prisma.communicationRequest.create({
      data: {
        title: body.title.trim(),
        description: body.description.trim(),
        requiredDate,
        contactEmail: body.contactEmail.trim(),
        contactPhone: body.contactPhone.trim(),
        managerEmail: body.managerEmail.trim(),
        approvalToken,
        status: RequestStatus.Pending_Manager,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: RequestStatus.Pending_Manager,
            note: "إنشاء الطلب",
          },
        },
      },
    });

    const approvalUrl = `${getAppUrl()}/api/approve?token=${approvalToken}`;
    await NotifyManager({
      managerEmail: created.managerEmail,
      requestTitle: created.title,
      approvalUrl,
    });

    return jsonOk(
      {
        id: created.id,
        status: created.status,
        approvalToken: created.approvalToken,
        approvalUrl,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
