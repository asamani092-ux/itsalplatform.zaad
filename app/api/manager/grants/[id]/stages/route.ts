import { NextRequest } from "next/server";
import { requireDirectorSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { updateGrantStage } from "@/lib/grants/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireDirectorSession();
    if (auth.error) return auth.error;
    await params; // grant id is implied by the stage; kept for route symmetry

    const body = (await request.json()) as {
      stageId?: string;
      status?: "Pending" | "Done";
      note?: string;
      amount?: number | null;
      dueDate?: string | null;
    };

    if (!body.stageId) {
      return jsonError("معرّف المرحلة مطلوب", "VALIDATION", 400);
    }

    let dueDate: Date | null | undefined;
    if (body.dueDate === null) dueDate = null;
    else if (typeof body.dueDate === "string" && body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (Number.isNaN(parsed.getTime())) {
        return jsonError("تاريخ غير صالح", "VALIDATION", 400);
      }
      dueDate = parsed;
    }

    const grant = await updateGrantStage({
      stageId: body.stageId,
      status: body.status,
      note: body.note,
      amount: body.amount ?? undefined,
      dueDate,
    });
    return jsonOk(grant);
  } catch (error) {
    return handleApiError(error);
  }
}
