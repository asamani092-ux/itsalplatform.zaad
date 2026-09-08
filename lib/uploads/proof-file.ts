import { writeFile, mkdir } from "fs/promises";
import path from "path";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg"]);
const ALLOWED_EXT = new Set(["pdf", "png", "jpg", "jpeg"]);

export async function saveEmployeeProofFile(
  requestId: string,
  proof: File,
): Promise<string> {
  if (proof.size > MAX_SIZE) {
    throw new Error("VALIDATION: حجم الملف يتجاوز 5MB");
  }

  const ext = (proof.name.split(".").pop() ?? "").toLowerCase();
  const mime = (proof.type || "").toLowerCase();

  if (!ALLOWED_MIME.has(mime) || !ALLOWED_EXT.has(ext)) {
    throw new Error("VALIDATION: نوع الملف غير مدعوم (PDF/PNG/JPG فقط)");
  }

  const bytes = Buffer.from(await proof.arrayBuffer());
  const filename = `${requestId}-${Date.now()}.${ext === "jpeg" ? "jpg" : ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "proofs");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);
  return `/uploads/proofs/${filename}`;
}
