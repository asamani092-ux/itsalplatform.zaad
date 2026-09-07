import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { listRequests } from "@/lib/request-service";
import { EmployeeRole, RequestStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const view = request.nextUrl.searchParams.get("view") as
      | "active"
      | "archive"
      | "all"
      | null;
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = statusParam ? (statusParam as RequestStatus) : undefined;

    const departmentId =
      auth.session.role === EmployeeRole.SECTION_MANAGER
        ? (auth.session.departmentId ?? undefined)
        : (request.nextUrl.searchParams.get("departmentId") ?? undefined);

    const requests = await listRequests({
      view: view ?? "all",
      status,
      departmentId,
    });

    return jsonOk({ requests, count: requests.length });
  } catch (error) {
    return handleApiError(error);
  }
}
