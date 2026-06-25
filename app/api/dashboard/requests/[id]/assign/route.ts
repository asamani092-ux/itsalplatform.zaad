import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/lib/workflow";

type RouteContext = { params: Promise<{ id: string }> };

type AssignBody = {
  employeeId: string;
  assignedBy?: string;
  note?: string;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as AssignBody;

    if (!body.employeeId) {
      return jsonError("معرّف الموظف مطلوب", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.communicationRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return jsonError("الطلب غير موجود", 404, "NOT_FOUND");
    }

    if (existing.status !== RequestStatus.Approved_Pending_Assignment) {
      return jsonError(
        "يمكن الإسناد فقط للطلبات المعتمدة بانتظار التعيين",
        400,
        "INVALID_STATE"
      );
    }

    const employee = await prisma.commEmployee.findFirst({
      where: { id: body.employeeId, isActive: true },
    });

    if (!employee) {
      return jsonError("الموظف غير موجود أو غير نشط", 404, "NOT_FOUND");
    }

    assertTransition(
      RequestStatus.Approved_Pending_Assignment,
      RequestStatus.In_Progress
    );

    const now = new Date();

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: {
        status: RequestStatus.In_Progress,
        assignedEmployeeId: body.employeeId,
        assignedAt: now,
        statusHistory: {
          create: {
            fromStatus: RequestStatus.Approved_Pending_Assignment,
            toStatus: RequestStatus.In_Progress,
            changedBy: body.assignedBy ?? "dashboard",
            note: body.note ?? "إسناد أولي",
          },
        },
        assignmentHistory: {
          create: {
            employeeId: body.employeeId,
            assignedBy: body.assignedBy ?? "dashboard",
            note: body.note ?? "إسناد أولي",
            assignedAt: now,
          },
        },
      },
      include: {
        assignedEmployee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
