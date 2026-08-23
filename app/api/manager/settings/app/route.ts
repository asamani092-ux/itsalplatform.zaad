import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { getHospitalityRooms, setHospitalityRooms } from "@/lib/app-settings";

export async function GET() {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const rooms = await getHospitalityRooms();
    return jsonOk({ rooms });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireManagerSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as { rooms?: string[] };

    if (Array.isArray(body.rooms)) {
      await setHospitalityRooms(body.rooms);
    }

    const rooms = await getHospitalityRooms();
    return jsonOk({ rooms });
  } catch (error) {
    return handleApiError(error);
  }
}
