import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { getRequestById, recordAssignment } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

interface ReassignBody {
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
    const body = (await request.json()) as ReassignBody;

    if (!body.employeeId) {
      return jsonError("معرّف الموظف مطلوب", "VALIDATION", 400);
    }

    const existing = await getRequestById(id);

    if (existing.status !== RequestStatus.In_Progress) {
      return jsonError(
        "يمكن إعادة الإسناد فقط للطلبات قيد التنفيذ",
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

    const updated = await prisma.communicationRequest.update({
      where: { id },
      data: {
        assignedEmployeeId: body.employeeId,
        assignedAt: new Date(),
      },
      include: {
        assignedEmployee: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAssignment({
      requestId: id,
      employeeId: body.employeeId,
      assignedBy: body.assignedBy,
      note: body.note ?? "إعادة إسناد",
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
