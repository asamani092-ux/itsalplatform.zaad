import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { submitRequest } from "@/lib/request-service";

interface SubmitBody {
  title?: string;
  description?: string;
  requiredDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  departmentId?: string;
  requestTypeId?: string;
  visitDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitBody;

    if (!body.title?.trim()) return jsonError("العنوان مطلوب", "VALIDATION", 400);
    if (!body.description?.trim()) return jsonError("الوصف مطلوب", "VALIDATION", 400);
    if (!body.requiredDate) return jsonError("التاريخ المطلوب مطلوب", "VALIDATION", 400);
    if (!body.contactEmail?.trim()) return jsonError("البريد الإلكتروني مطلوب", "VALIDATION", 400);
    if (!body.contactPhone?.trim()) return jsonError("رقم التواصل مطلوب", "VALIDATION", 400);
    if (!body.departmentId) return jsonError("القسم مطلوب", "VALIDATION", 400);
    if (!body.requestTypeId) return jsonError("نوع الطلب مطلوب", "VALIDATION", 400);

    const requiredDate = new Date(body.requiredDate);
    if (Number.isNaN(requiredDate.getTime())) {
      return jsonError("التاريخ المطلوب غير صالح", "VALIDATION", 400);
    }

    let visitDate: Date | null = null;
    if (body.visitDate) {
      visitDate = new Date(body.visitDate);
      if (Number.isNaN(visitDate.getTime())) {
        return jsonError("تاريخ الزيارة غير صالح", "VALIDATION", 400);
      }
    }

    const result = await submitRequest({
      title: body.title.trim(),
      description: body.description.trim(),
      requiredDate,
      contactEmail: body.contactEmail.trim(),
      contactPhone: body.contactPhone.trim(),
      departmentId: body.departmentId,
      requestTypeId: body.requestTypeId,
      visitDate,
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
