import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireManagerSession } from "@/lib/auth/route-guard";
import {
  getHospitalityRooms,
  getWorkflowSettings,
  setHospitalityRooms,
  setWorkflowSettings,
} from "@/lib/app-settings";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const [workflow, rooms] = await Promise.all([
      getWorkflowSettings(),
      getHospitalityRooms(),
    ]);

    return jsonOk({ workflow, rooms });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      skipDepartmentApproval?: boolean;
      rooms?: string[];
    };

    if (typeof body.skipDepartmentApproval === "boolean") {
      await setWorkflowSettings({
        skipDepartmentApproval: body.skipDepartmentApproval,
      });
    }
    if (Array.isArray(body.rooms)) {
      await setHospitalityRooms(body.rooms);
    }

    const [workflow, rooms] = await Promise.all([
      getWorkflowSettings(),
      getHospitalityRooms(),
    ]);
    return jsonOk({ workflow, rooms });
  } catch (error) {
    return handleApiError(error);
  }
}
