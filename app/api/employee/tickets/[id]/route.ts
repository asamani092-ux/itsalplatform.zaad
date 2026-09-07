import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { getRequestById } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

const VISIBLE: RequestStatus[] = [
  RequestStatus.In_Progress,
  RequestStatus.Pending_Review,
  RequestStatus.Returned,
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const ticket = await getRequestById(id);

    if (ticket.assignedEmployeeId !== auth.session.sub) {
      return jsonError("لا يمكنك عرض هذا الطلب", "FORBIDDEN", 403);
    }
    if (!VISIBLE.includes(ticket.status)) {
      return jsonError("لا يمكنك عرض هذا الطلب", "FORBIDDEN", 403);
    }

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
