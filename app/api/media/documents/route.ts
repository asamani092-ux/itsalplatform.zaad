import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

interface DocumentBody {
  title?: string;
  description?: string;
  category?: string;
  fileUrl?: string;
  sortOrder?: number;
}

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category");

    const documents = await prisma.mediaDocument.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });

    return jsonOk({ documents, count: documents.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DocumentBody;

    if (!body.title?.trim() || !body.category?.trim() || !body.fileUrl?.trim()) {
      return jsonError("العنوان والتصنيف ورابط الملف مطلوبة", "VALIDATION", 400);
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

    return jsonOk(document, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
