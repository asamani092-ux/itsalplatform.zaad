import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { redeclareAfterReturn } from "@/lib/request-service";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

async function saveProofFile(requestId: string, proof: File): Promise<string> {
  if (proof.size > MAX_SIZE) {
    throw new Error("VALIDATION: حجم الملف يتجاوز 5MB");
  }
  if (!ALLOWED_TYPES.includes(proof.type)) {
    throw new Error("VALIDATION: نوع الملف غير مدعوم (PDF/PNG/JPG فقط)");
  }

  const bytes = Buffer.from(await proof.arrayBuffer());
  const ext = proof.name.split(".").pop() ?? "bin";
  const filename = `${requestId}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return `/uploads/proofs/${filename}`;
}

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

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const proof = formData.get("proof");
      if (proof instanceof File && proof.size > 0) {
        proofFileUrl = await saveProofFile(id, proof);
      }
    } else if (contentType.includes("application/json")) {
      let body: { proofFileUrl?: string };
      try {
        body = (await request.json()) as { proofFileUrl?: string };
      } catch {
        return jsonError("جسم الطلب غير صالح (JSON متوقع)", "VALIDATION", 400);
      }
      if (typeof body.proofFileUrl === "string" && body.proofFileUrl.trim()) {
        proofFileUrl = body.proofFileUrl.trim();
      }
    }

    const ticket = await redeclareAfterReturn({
      requestId: id,
      employeeId: auth.session.sub,
      proofFileUrl,
    });

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
