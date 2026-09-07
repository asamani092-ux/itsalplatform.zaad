import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { employeeRejectAssignment } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as { employeeNote?: string };
    if (!body.employeeNote?.trim()) {
      return jsonError("ملاحظة رفض الإسناد مطلوبة", "VALIDATION", 400);
    }

    const ticket = await employeeRejectAssignment({
      requestId: id,
      employeeId: auth.session.sub,
      employeeNote: body.employeeNote,
    });

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
