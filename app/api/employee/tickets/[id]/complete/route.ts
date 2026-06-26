import { NextRequest } from "next/server";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { completeEmployeeTicket } from "@/lib/request-service";
import { notifySubmitter } from "@/lib/notifications";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { id } = await params;
    const formData = await request.formData();
    const proof = formData.get("proof");

    let proofFileUrl: string | undefined;

    if (proof instanceof File && proof.size > 0) {
      if (proof.size > MAX_SIZE) {
        throw new Error("VALIDATION: حجم الملف يتجاوز 5MB");
      }
      if (!ALLOWED_TYPES.includes(proof.type)) {
        throw new Error("VALIDATION: نوع الملف غير مدعوم (PDF/PNG/JPG فقط)");
      }

      const bytes = Buffer.from(await proof.arrayBuffer());
      const ext = proof.name.split(".").pop() ?? "bin";
      const filename = `${id}-${Date.now()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, filename), bytes);
      proofFileUrl = `/uploads/proofs/${filename}`;
    }

    const ticket = await completeEmployeeTicket({
      requestId: id,
      employeeId: auth.session.sub,
      proofFileUrl,
    });

    await notifySubmitter({
      contactEmail: ticket.contactEmail,
      contactPhone: ticket.contactPhone,
      requestTitle: ticket.title,
      message: `تم إكمال طلبك "${ticket.title}". شكراً لتواصلك مع قسم الاتصال المؤسسي.`,
    });

    return jsonOk({ ticket });
  } catch (error) {
    return handleApiError(error);
  }
}
