import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { rejectRequest } from "@/lib/request-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    await assertManagerTicketAccess(auth.session, id);

    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim()) {
      return jsonError("سبب الرفض مطلوب", "VALIDATION", 400);
    }

    const updated = await rejectRequest({
      requestId: id,
      managerId: auth.session.sub,
      reason: body.reason,
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
