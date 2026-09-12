import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { employeeRejectAssignment } from "@/lib/request-service";
import { requireTrimmedText } from "@/lib/validation/input";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const body = (await request.json()) as { employeeNote?: string };
    const employeeNote = requireTrimmedText(
      body.employeeNote,
      "ملاحظة رفض الإسناد",
    );

    const ticket = await employeeRejectAssignment({
      requestId: id,
      employeeId: auth.session.sub,
      employeeNote,
    });

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
