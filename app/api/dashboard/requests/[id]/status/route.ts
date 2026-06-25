import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { NotifySubmitter } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/workflow";

type RouteContext = { params: Promise<{ id: string }> };

type StatusBody = {
  status: RequestStatus;
  changedBy?: string;
  note?: string;
};

const ALLOWED_MANUAL_STATUSES: RequestStatus[] = [
  RequestStatus.In_Progress,
  RequestStatus.Completed,
  RequestStatus.Archived,
];

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as StatusBody;

    if (!body.status || !ALLOWED_MANUAL_STATUSES.includes(body.status)) {
      return jsonError("حالة غير مسموحة", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.communicationRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return jsonError("الطلب غير موجود", 404, "NOT_FOUND");
    }

    assertTransition(existing.status, body.status);

    const now = new Date();
    const updateData: {
      status: RequestStatus;
      completedAt?: Date;
      statusHistory: {
        create: {
          fromStatus: RequestStatus;
          toStatus: RequestStatus;
          changedBy?: string;
          note?: string;
        };
      };
    } = {
      status: body.status,
      statusHistory: {
        create: {
          fromStatus: existing.status,
          toStatus: body.status,
          changedBy: body.changedBy ?? "dashboard",
          note: body.note,
        },
      },
    };

    if (body.status === RequestStatus.Completed) {
      updateData.completedAt = now;
    }

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: updateData,
      include: {
        assignedEmployee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (body.status === RequestStatus.Completed) {
      await NotifySubmitter({
        contactEmail: updated.contactEmail,
        contactPhone: updated.contactPhone,
        requestTitle: updated.title,
        status: updated.status,
      });
    }

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
