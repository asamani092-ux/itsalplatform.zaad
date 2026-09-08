import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { completeEmployeeTicket } from "@/lib/request-service";
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
    let requireProof = false;

    if (contentType.includes("application/json")) {
      let body: {
        proofFileUrl?: string;
        requireProof?: boolean;
      };
      try {
        body = (await request.json()) as {
          proofFileUrl?: string;
          requireProof?: boolean;
        };
      } catch {
        return jsonError("جسم الطلب غير صالح (JSON متوقع)", "VALIDATION", 400);
      }
      if (typeof body.proofFileUrl === "string" && body.proofFileUrl.trim()) {
        proofFileUrl = body.proofFileUrl.trim();
      }
      requireProof = body.requireProof === true;
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const proof = formData.get("proof");
      requireProof = formData.get("requireProof") === "true";

      if (proof instanceof File && proof.size > 0) {
        proofFileUrl = await saveEmployeeProofFile(id, proof);
      }
    } else {
      return jsonError(
        "نوع المحتوى غير مدعوم. استخدم application/json أو multipart/form-data",
        "VALIDATION",
        400,
      );
    }

    if (requireProof && !proofFileUrl) {
      return jsonError(
        "يجب إرفاق ملف الإثبات لإكمال التذكرة",
        "VALIDATION",
        400,
      );
    }

    const ticket = await completeEmployeeTicket({
      requestId: id,
      employeeId: auth.session.sub,
      proofFileUrl,
    });

    // notifySubmitter is invoked inside completeEmployeeTicket — do not duplicate here.
    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
