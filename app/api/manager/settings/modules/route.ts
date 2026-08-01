import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { getPlatformModules, setModuleEnabled } from "@/lib/modules/server";

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
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as ModulePatchBody;
    if (!body.key) return jsonError("مفتاح الأداة مطلوب", "VALIDATION", 400);
    if (typeof body.isEnabled !== "boolean") {
      return jsonError("حالة التفعيل مطلوبة", "VALIDATION", 400);
    }

    const modules = await setModuleEnabled(body.key, body.isEnabled);
    return jsonOk({ modules });
  } catch (error) {
    return handleApiError(error);
  }
}
