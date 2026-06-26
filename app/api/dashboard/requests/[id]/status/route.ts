import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/workflow";
import { notifySubmitter } from "@/lib/notifications";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { getRequestById, recordStatusChange } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

interface StatusBody {
  status?: RequestStatus;
  changedBy?: string;
  note?: string;
}

const ALLOWED_MANUAL_STATUSES: RequestStatus[] = [
  RequestStatus.Completed,
  RequestStatus.Archived,
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as StatusBody;

    if (!body.status || !ALLOWED_MANUAL_STATUSES.includes(body.status)) {
      return jsonError(
        "الحالة المطلوبة غير مدعومة — استخدم Completed أو Archived",
        "VALIDATION",
        400,
      );
    }

    const existing = await getRequestById(id);
    assertTransition(existing.status, body.status);

    const now = new Date();
    const updateData: {
      status: RequestStatus;
      completedAt?: Date;
    } = { status: body.status };

    if (body.status === RequestStatus.Completed) {
      updateData.completedAt = now;
    }

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: updateData,
      include: {
        assignedEmployee: { select: { id: true, name: true, email: true } },
      },
    });

    await recordStatusChange({
      requestId: id,
      fromStatus: existing.status,
      toStatus: body.status,
      changedBy: body.changedBy,
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
