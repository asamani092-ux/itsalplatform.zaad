import { NextRequest } from "next/server";
import { notifySubmitter } from "@/lib/notifications";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { updateRequestStatus } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

const ALLOWED: RequestStatus[] = [
  RequestStatus.Completed,
  RequestStatus.Archived,
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      status?: RequestStatus;
      changedBy?: string;
      note?: string;
    };

    if (!body.status || !ALLOWED.includes(body.status)) {
      return jsonError(
        "الحالة المطلوبة غير مدعومة — استخدم Completed أو Archived",
        "VALIDATION",
        400,
      );
    }

    const updated = await updateRequestStatus({
      requestId: id,
      status: body.status,
      changedBy: body.changedBy ?? "dashboard",
      note: body.note,
    });

    if (body.status === RequestStatus.Completed) {
      await notifySubmitter({
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
        requestTitle: updated.title,
        message: `تم إكمال طلبك "${updated.title}". شكراً لتواصلك مع قسم الاتصال المؤسسي.`,
      });
    }

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
