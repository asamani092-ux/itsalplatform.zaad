import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { redeclareAfterReturn } from "@/lib/request-service";
import { saveEmployeeProofFile } from "@/lib/uploads/proof-file";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    let proofFileUrl: string | undefined;
    let employeeNote: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const proof = formData.get("proof");
      if (proof instanceof File && proof.size > 0) {
        proofFileUrl = await saveEmployeeProofFile(id, proof);
      }
      const note = formData.get("employeeNote");
      if (typeof note === "string" && note.trim()) {
        employeeNote = note.trim();
      }
    } else if (contentType.includes("application/json")) {
      let body: { proofFileUrl?: string; employeeNote?: string };
      try {
        body = (await request.json()) as {
          proofFileUrl?: string;
          employeeNote?: string;
        };
      } catch {
        return jsonError("جسم الطلب غير صالح (JSON متوقع)", "VALIDATION", 400);
      }
      if (typeof body.proofFileUrl === "string" && body.proofFileUrl.trim()) {
        proofFileUrl = body.proofFileUrl.trim();
      }
      if (typeof body.employeeNote === "string" && body.employeeNote.trim()) {
        employeeNote = body.employeeNote.trim();
      }
    }

    if (!employeeNote) {
      return jsonError("ملاحظة الموظف مطلوبة بعد الإرجاع", "VALIDATION", 400);
    }

    const ticket = await redeclareAfterReturn({
      requestId: id,
      employeeId: auth.session.sub,
      proofFileUrl,
      employeeNote,
    });

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
