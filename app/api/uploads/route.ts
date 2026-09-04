import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { detectFileTypeFromBytes } from "@/lib/file-validation";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "uploads"), 10, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("الملف مطلوب", "VALIDATION", 400);
    }

    if (file.size > MAX_SIZE) {
      return jsonError("حجم الملف يتجاوز 5MB", "VALIDATION", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectFileTypeFromBytes(bytes);

    if (!detected) {
      return jsonError("نوع الملف غير مدعوم (PDF/PNG/JPG فقط)", "VALIDATION", 400);
    }

    const filename = `${randomUUID()}.${detected.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);

    return jsonOk({ url: `/uploads/media/${filename}` }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
