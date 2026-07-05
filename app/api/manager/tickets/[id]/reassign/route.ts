import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { reassignRequest } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as {
      employeeId?: string;
      note?: string;
    };

    if (!body.employeeId) {
      throw new Error("VALIDATION: معرّف الموظف مطلوب");
    }

    const updated = await reassignRequest({
      requestId: id,
      employeeId: body.employeeId,
      assignedBy: auth.session.sub,
      note: body.note,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
