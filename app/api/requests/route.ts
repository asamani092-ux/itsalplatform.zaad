import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { submitRequest } from "@/lib/request-service";
import { prisma } from "@/lib/prisma";

interface SubmitRequestBody {
  title?: string;
  description?: string;
  requiredDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  managerEmail?: string;
  departmentId?: string;
  requestTypeId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitRequestBody;

    if (!body.title?.trim()) throw new Error("VALIDATION: العنوان مطلوب");
    if (!body.description?.trim()) throw new Error("VALIDATION: الوصف مطلوب");
    if (!body.requiredDate) throw new Error("VALIDATION: التاريخ المطلوب مطلوب");
    if (!body.contactEmail?.trim()) throw new Error("VALIDATION: البريد الإلكتروني مطلوب");
    if (!body.contactPhone?.trim()) throw new Error("VALIDATION: رقم التواصل مطلوب");

    let departmentId = body.departmentId;
    let requestTypeId = body.requestTypeId;

    if (!departmentId) {
      const dept = await prisma.department.findFirst({
        where: body.managerEmail
          ? { managerEmail: body.managerEmail.trim() }
          : { slug: "general" },
      });
      if (!dept) throw new Error("VALIDATION: القسم غير محدد");
      departmentId = dept.id;
    }

    if (!requestTypeId) {
      const rt = await prisma.requestType.findFirst({
        where: { slug: "general-request" },
      });
      if (!rt) throw new Error("VALIDATION: نوع الطلب غير محدد");
      requestTypeId = rt.id;
    }

    const requiredDate = new Date(body.requiredDate);
    if (Number.isNaN(requiredDate.getTime())) {
      throw new Error("VALIDATION: التاريخ المطلوب غير صالح");
    }

    const result = await submitRequest({
      title: body.title.trim(),
      description: body.description.trim(),
      requiredDate,
      contactEmail: body.contactEmail.trim(),
      contactPhone: body.contactPhone.trim(),
      departmentId,
      requestTypeId,
    });

    return jsonOk(
      {
        id: result.request.id,
        status: result.request.status,
        approvalUrl: result.approvalUrl,
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
