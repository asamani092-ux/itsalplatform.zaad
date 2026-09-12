import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireEmployeeSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError } from "@/lib/api-utils";
import { getProofStorageDir } from "@/lib/uploads/storage-path";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function isSafeFilename(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    // Any authenticated portal user may view proof attachments.
    const auth = await requireEmployeeSession();
    if (auth.error) return auth.error;

    const { filename } = await params;
    if (!filename || !isSafeFilename(filename)) {
      return jsonError("اسم الملف غير صالح", "VALIDATION", 400);
    }

    const ext = (filename.split(".").pop() ?? "").toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return jsonError("نوع الملف غير مدعوم", "VALIDATION", 400);
    }

    // Primary storage dir, with a fallback to the legacy public location.
    const candidates = [
      path.join(getProofStorageDir(), filename),
      path.join(process.cwd(), "public", "uploads", "proofs", filename),
    ];

    for (const filePath of candidates) {
      try {
        const bytes = await readFile(filePath);
        return new NextResponse(new Uint8Array(bytes), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `inline; filename="${filename}"`,
            "Cache-Control": "private, max-age=300",
          },
        });
      } catch {
        // Try next candidate.
      }
    }

    return jsonError("المرفق غير موجود", "NOT_FOUND", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
