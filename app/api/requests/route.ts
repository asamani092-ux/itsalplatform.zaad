import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApprovalToken } from "@/lib/tokens";
import { notifyManager } from "@/lib/notifications";
import { getAppUrl, handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { recordStatusChange } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

interface SubmitRequestBody {
  title?: string;
  description?: string;
  requiredDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  managerEmail?: string;
}

function validateSubmitBody(body: SubmitRequestBody) {
  const { title, description, requiredDate, contactEmail, contactPhone, managerEmail } = body;
  if (!title?.trim()) throw new Error("VALIDATION: العنوان مطلوب");
  if (!description?.trim()) throw new Error("VALIDATION: الوصف مطلوب");
  if (!requiredDate) throw new Error("VALIDATION: التاريخ المطلوب مطلوب");
  if (!contactEmail?.trim()) throw new Error("VALIDATION: البريد الإلكتروني مطلوب");
  if (!contactPhone?.trim()) throw new Error("VALIDATION: رقم التواصل مطلوب");
  if (!managerEmail?.trim()) throw new Error("VALIDATION: بريد المدير المباشر مطلوب");

  const parsedDate = new Date(requiredDate);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("VALIDATION: التاريخ المطلوب غير صالح");
  }

  return {
    title: title.trim(),
    description: description.trim(),
    requiredDate: parsedDate,
    contactEmail: contactEmail.trim(),
    contactPhone: contactPhone.trim(),
    managerEmail: managerEmail.trim(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitRequestBody;
    const data = validateSubmitBody(body);
    const approvalToken = generateApprovalToken();

    const created = await prisma.communicationRequest.create({
      data: {
        ...data,
        approvalToken,
        status: RequestStatus.Pending_Manager,
      },
    });

    await recordStatusChange({
      requestId: created.id,
      fromStatus: null,
      toStatus: RequestStatus.Pending_Manager,
      note: "تم تقديم الطلب",
    });

    const approvalUrl = `${getAppUrl()}/api/approve?token=${approvalToken}`;
    await notifyManager({
      managerEmail: data.managerEmail,
      requestTitle: data.title,
      approvalUrl,
    });

    return jsonOk(
      {
        id: created.id,
        status: created.status,
        approvalToken: created.approvalToken,
        approvalUrl,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
