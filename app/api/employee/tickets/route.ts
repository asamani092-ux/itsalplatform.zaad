import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listRequests } from "@/lib/request-service";

export async function GET() {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    // Active assigned tickets: In_Progress, Pending_Review, Returned
    const tickets = await listRequests({
      assignedEmployeeId: auth.session.sub,
      view: "active",
    });

    return jsonOk({ tickets, count: tickets.length });
  } catch (error) {
    return handleApiError(error);
  }
}
