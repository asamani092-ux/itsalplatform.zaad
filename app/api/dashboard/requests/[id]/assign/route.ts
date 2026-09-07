import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { assignRequest } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    await assertManagerTicketAccess(auth.session, id);

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
      assignedBy: body.assignedBy ?? auth.session.sub,
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
