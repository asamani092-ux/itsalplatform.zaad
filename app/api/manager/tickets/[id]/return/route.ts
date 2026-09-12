import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { returnToEmployee } from "@/lib/request-service";
import { requireTrimmedText } from "@/lib/validation/input";

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
    const reviewNote = requireTrimmedText(body.reviewNote, "ملاحظة الإرجاع");

    const updated = await returnToEmployee({
      requestId: id,
      managerId: auth.session.sub,
      reviewNote,
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
