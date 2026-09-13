import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import {
  getPlatformModules,
  setModuleEnabled,
  setModuleOwnerDepartment,
} from "@/lib/modules/server";

export async function GET() {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const modules = await getPlatformModules();
    return jsonOk({ modules });
  } catch (error) {
    return handleApiError(error);
  }
}

interface ModulePatchBody {
  key?: string;
  isEnabled?: boolean;
  ownerDepartmentId?: string | null;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as ModulePatchBody;
    if (!body.key) return jsonError("مفتاح الأداة مطلوب", "VALIDATION", 400);

    const hasEnabled = typeof body.isEnabled === "boolean";
    const hasOwner = "ownerDepartmentId" in body;
    if (!hasEnabled && !hasOwner) {
      return jsonError("لا يوجد تحديث", "VALIDATION", 400);
    }

    if (hasEnabled) {
      await setModuleEnabled(body.key, body.isEnabled as boolean);
    }
    if (hasOwner) {
      await setModuleOwnerDepartment(body.key, body.ownerDepartmentId ?? null);
    }

    const modules = await getPlatformModules();
    return jsonOk({ modules });
  } catch (error) {
    return handleApiError(error);
  }
}
