import { unlink } from "fs/promises";
import path from "path";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonOk } from "@/lib/api-utils";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const document = await prisma.mediaDocument.findUnique({ where: { id } });
    if (!document) {
      throw new Error("NOT_FOUND: الوثيقة غير موجودة");
    }

    await prisma.mediaDocument.delete({ where: { id } });

    if (document.fileUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", document.fileUrl);
      try {
        await unlink(filePath);
      } catch {
        // File may already be missing — DB delete is the source of truth
      }
    }

    return jsonOk({ id, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
