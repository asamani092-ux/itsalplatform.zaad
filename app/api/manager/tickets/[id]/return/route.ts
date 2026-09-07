import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { returnToEmployee } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    await assertManagerTicketAccess(auth.session, id);

    const body = (await request.json()) as { reviewNote?: string };
    if (!body.reviewNote?.trim()) {
      return jsonError("ملاحظة الإرجاع مطلوبة", "VALIDATION", 400);
    }

    const updated = await returnToEmployee({
      requestId: id,
      managerId: auth.session.sub,
      reviewNote: body.reviewNote,
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
