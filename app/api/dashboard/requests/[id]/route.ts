import {
  assertManagerTicketAccess,
  requireManagerSession,
} from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const request = await assertManagerTicketAccess(auth.session, id);
    return jsonOk(request);
  } catch (error) {
    return handleApiError(error);
  }
}
