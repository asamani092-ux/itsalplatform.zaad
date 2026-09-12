import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import { getReceptionReports } from "@/lib/reception-service";

function parseDay(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const sp = request.nextUrl.searchParams;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const from = parseDay(sp.get("from"), monthStart);
    const to = parseDay(sp.get("to"), today);
    const departmentId = sp.get("departmentId");

    if (from > to) {
      return jsonError("تاريخ البداية يجب أن يسبق تاريخ النهاية", "VALIDATION", 400);
    }

    const report = await getReceptionReports({
      from,
      to,
      departmentId: departmentId || null,
    });

    return jsonOk(report);
  } catch (error) {
    return handleApiError(error);
  }
}
