import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { assignRequest } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      employeeId?: string;
      assignedBy?: string;
      note?: string;
    };

    if (!body.employeeId) {
      throw new Error("VALIDATION: معرّف الموظف مطلوب");
    }

    const updated = await assignRequest({
      requestId: id,
      employeeId: body.employeeId,
      assignedBy: body.assignedBy ?? "dashboard",
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
