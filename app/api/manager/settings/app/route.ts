import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireManagerSession } from "@/lib/auth/route-guard";
import {
  getHospitalitySettings,
  getWorkflowSettings,
  setHospitalitySettings,
  setWorkflowSettings,
} from "@/lib/app-settings";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const [workflow, hospitality] = await Promise.all([
      getWorkflowSettings(),
      getHospitalitySettings(),
    ]);

    return jsonOk({
      workflow,
      hospitality,
      // Backward compatible: rooms was previously returned at the top level.
      rooms: hospitality.rooms,
    });
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
      hospitality?: {
        rooms?: string[];
        dayStart?: string;
        dayEnd?: string;
      };
    };

    if (typeof body.skipDepartmentApproval === "boolean") {
      await setWorkflowSettings({
        skipDepartmentApproval: body.skipDepartmentApproval,
      });
    }

    const hospitalityRooms = body.hospitality?.rooms ?? body.rooms;
    if (Array.isArray(hospitalityRooms) || body.hospitality) {
      const current = await getHospitalitySettings();
      await setHospitalitySettings({
        rooms: Array.isArray(hospitalityRooms) ? hospitalityRooms : current.rooms,
        dayStart: body.hospitality?.dayStart ?? current.dayStart,
        dayEnd: body.hospitality?.dayEnd ?? current.dayEnd,
      });
    }

    const [workflow, hospitality] = await Promise.all([
      getWorkflowSettings(),
      getHospitalitySettings(),
    ]);

    return jsonOk({
      workflow,
      hospitality,
      rooms: hospitality.rooms,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
