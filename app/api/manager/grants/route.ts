import { NextRequest } from "next/server";
import { requireDirectorSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { createGrant, getGrantKpis, listGrants } from "@/lib/grants/service";
import { requireNonNegativeNumber } from "@/lib/validation/input";

export async function GET() {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;

    const [grants, kpis] = await Promise.all([listGrants(), getGrantKpis()]);
    return jsonOk({ grants, kpis });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      title?: string;
      donorName?: string;
      amount?: number;
      details?: string;
      stageCount?: number;
      departmentId?: string | null;
    };

    if (!body.title?.trim() || !body.donorName?.trim()) {
      return jsonError("اسم المنحة والمانح مطلوبان", "VALIDATION", 400);
    }

    const amount = requireNonNegativeNumber(body.amount, "مبلغ المنحة", {
      allowZero: false,
    });
    const stageCount = requireNonNegativeNumber(
      body.stageCount === undefined || body.stageCount === null
        ? 0
        : body.stageCount,
      "عدد المراحل",
      { allowZero: true, integer: true },
    );
    if (stageCount > 48) {
      return jsonError("عدد المراحل يتجاوز الحد المسموح", "VALIDATION", 400);
    }

    const grant = await createGrant({
      title: body.title,
      donorName: body.donorName,
      amount,
      details: body.details,
      stageCount,
      departmentId: body.departmentId ?? null,
      createdById: auth.session.sub,
    });

    return jsonOk(grant, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
