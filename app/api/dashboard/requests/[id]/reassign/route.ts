import { NextRequest } from "next/server";
import { RequestStatus } from "@/generated/prisma/client";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

type ReassignBody = {
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
    const body = (await request.json()) as ReassignBody;

    if (!body.employeeId) {
      return jsonError("معرّف الموظف مطلوب", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.communicationRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return jsonError("الطلب غير موجود", 404, "NOT_FOUND");
    }

    if (existing.status !== RequestStatus.In_Progress) {
      return jsonError(
        "يمكن إعادة الإسناد فقط للطلبات قيد التنفيذ",
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

    const now = new Date();

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: {
        assignedEmployeeId: body.employeeId,
        assignmentHistory: {
          create: {
            employeeId: body.employeeId,
            assignedBy: body.assignedBy ?? "dashboard",
            note: body.note ?? "إعادة إسناد",
            assignedAt: now,
          },
        },
      },
      include: {
        assignedEmployee: {
          select: { id: true, name: true, email: true },
        },
        assignmentHistory: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { assignedAt: "asc" },
        },
      },
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
