import { NextRequest } from "next/server";
import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { cancelRequest } from "@/lib/request-service";
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

    const body = (await request.json()) as { reason?: string };
    const reason = requireTrimmedText(body.reason, "سبب الإلغاء");

    const updated = await cancelRequest({
      requestId: id,
      reason,
      changedBy: auth.session.sub,
    });

    return jsonOk({ request: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
