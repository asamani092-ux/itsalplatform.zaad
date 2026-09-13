import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { handleApiError, jsonError } from "@/lib/api-utils";
import { getMediaStorageDir } from "@/lib/uploads/storage-path";

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
    const auth = await requireManagerSession();
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

    const candidates = [
      path.join(getMediaStorageDir(), filename),
      path.join(process.cwd(), "public", "uploads", "media", filename),
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
        // try next
      }
    }

    return jsonError("الملف غير موجود", "NOT_FOUND", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
