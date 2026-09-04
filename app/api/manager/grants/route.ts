import { NextRequest } from "next/server";
import { requireDirectorSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { createGrant, getGrantKpis, listGrants } from "@/lib/grants/service";

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
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError("مبلغ المنحة غير صحيح", "VALIDATION", 400);
    }
    const stageCount = Number.isFinite(Number(body.stageCount))
      ? Number(body.stageCount)
      : 0;

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
