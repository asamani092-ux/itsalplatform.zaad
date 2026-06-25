import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");

    const documents = await prisma.mediaDocument.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    return jsonOk({ documents, count: documents.length });
  } catch (error) {
    return handleApiError(error);
  }
}

type CreateDocumentBody = {
  title: string;
  description?: string;
  category: string;
  fileUrl: string;
  sortOrder?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDocumentBody;

    if (!body.title?.trim() || !body.category?.trim() || !body.fileUrl?.trim()) {
      return jsonError(
        "العنوان والتصنيف ورابط الملف مطلوبة",
        400,
        "VALIDATION_ERROR"
      );
    }

    const document = await prisma.mediaDocument.create({
      data: {
        title: body.title.trim(),
        description: body.description?.trim() ?? "",
        category: body.category.trim(),
        fileUrl: body.fileUrl.trim(),
        sortOrder: body.sortOrder ?? 0,
      },
    });

    return jsonOk({ document }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
