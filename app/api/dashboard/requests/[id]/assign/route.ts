import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/workflow";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  getRequestById,
  recordAssignment,
  recordStatusChange,
} from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

interface AssignBody {
  employeeId?: string;
  assignedBy?: string;
  note?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as AssignBody;

    if (!body.employeeId) {
      return jsonError("معرّف الموظف مطلوب", "VALIDATION", 400);
    }

    const existing = await getRequestById(id);

    if (existing.status !== RequestStatus.Approved_Pending_Assignment) {
      return jsonError(
        "يمكن الإسناد فقط للطلبات المعتمدة وبانتظار التعيين",
        "INVALID_STATE",
        409,
      );
    }

    const employee = await prisma.commEmployee.findFirst({
      where: { id: body.employeeId, isActive: true },
    });

    if (!employee) {
      return jsonError("الموظف غير موجود أو غير نشط", "NOT_FOUND", 404);
    }

    assertTransition(existing.status, RequestStatus.In_Progress);
    const now = new Date();

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: {
        status: RequestStatus.In_Progress,
        assignedEmployeeId: body.employeeId,
        assignedAt: now,
      },
      include: {
        assignedEmployee: { select: { id: true, name: true, email: true } },
      },
    });

    await recordStatusChange({
      requestId: id,
      fromStatus: RequestStatus.Approved_Pending_Assignment,
      toStatus: RequestStatus.In_Progress,
      changedBy: body.assignedBy,
      note: body.note ?? "إسناد أولي",
    });

    await recordAssignment({
      requestId: id,
      employeeId: body.employeeId,
      assignedBy: body.assignedBy,
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
