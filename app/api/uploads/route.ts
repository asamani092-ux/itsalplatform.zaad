import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("الملف مطلوب", "VALIDATION", 400);
    }

    if (file.size > MAX_SIZE) {
      return jsonError("حجم الملف يتجاوز 5MB", "VALIDATION", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonError("نوع الملف غير مدعوم (PDF/PNG/JPG فقط)", "VALIDATION", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `upload-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);

    return jsonOk({ url: `/uploads/proofs/${filename}` }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
