import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { getManagerKpis } from "@/lib/request-service";
import { EmployeeRole } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const requestedDeptId =
      request.nextUrl.searchParams.get("departmentId") ?? undefined;

    // Section managers only ever see their own section; directors may filter freely.
    const departmentId =
      auth.session.role === EmployeeRole.SECTION_MANAGER
        ? (auth.session.departmentId ?? undefined)
        : requestedDeptId;

    const kpis = await getManagerKpis({ departmentId });
    return jsonOk({ kpis });
  } catch (error) {
    return handleApiError(error);
  }
}
