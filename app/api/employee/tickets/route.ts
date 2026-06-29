import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listRequests } from "@/lib/request-service";
import { RequestStatus } from "@/generated/prisma/client";

export async function GET() {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const tickets = await listRequests({
      assignedEmployeeId: auth.session.sub,
      status: RequestStatus.In_Progress,
    });

    return jsonOk({ tickets, count: tickets.length });
  } catch (error) {
    return handleApiError(error);
  }
}
