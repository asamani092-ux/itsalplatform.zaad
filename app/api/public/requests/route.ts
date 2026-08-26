import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { submitRequest } from "@/lib/request-service";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getFormBySlug, getDefaultForm } from "@/lib/forms/server";
import { DEFAULT_FORM_SETTINGS } from "@/lib/forms/schema";

interface SubmitBody {
  title?: string;
  description?: string;
  requiredDate?: string;
  contactEmail?: string;
  contactPhone?: string;
  departmentId?: string;
  requestTypeId?: string;
  requesterAdministrationId?: string;
  visitDate?: string;
  formSlug?: string;
}

const DEFAULT_LEAD_TIME_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "requests"), 10, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as SubmitBody;

    const form = body.formSlug
      ? await getFormBySlug(body.formSlug)
      : await getDefaultForm();
    if (form && !form.isPublished) {
      return jsonError("هذا النموذج غير متاح حالياً", "FORM_CLOSED", 403);
    }
    const fields = form?.fields ?? DEFAULT_FORM_SETTINGS.fields;
    const departmentId = body.departmentId || form?.departmentId || undefined;
    const requestTypeId = body.requestTypeId || form?.requestTypeId || undefined;

    if (!body.title?.trim()) return jsonError("العنوان مطلوب", "VALIDATION", 400);
    if (!body.contactEmail?.trim()) {
      return jsonError("البريد الإلكتروني مطلوب", "VALIDATION", 400);
    }
    if (!departmentId) return jsonError("القسم مطلوب", "VALIDATION", 400);
    if (!requestTypeId) return jsonError("نوع الطلب مطلوب", "VALIDATION", 400);

    if (
      fields.description.enabled &&
      fields.description.required &&
      !body.description?.trim()
    ) {
      return jsonError("الوصف مطلوب", "VALIDATION", 400);
    }

    if (
      fields.requiredDate.enabled &&
      fields.requiredDate.required &&
      !body.requiredDate
    ) {
      return jsonError("التاريخ المطلوب مطلوب", "VALIDATION", 400);
    }

    if (
      fields.contactPhone.enabled &&
      fields.contactPhone.required &&
      !body.contactPhone?.trim()
    ) {
      return jsonError("رقم التواصل مطلوب", "VALIDATION", 400);
    }

    let requiredDate: Date;
    if (body.requiredDate) {
      requiredDate = new Date(body.requiredDate);
      if (Number.isNaN(requiredDate.getTime())) {
        return jsonError("التاريخ المطلوب غير صالح", "VALIDATION", 400);
      }
    } else {
      requiredDate = new Date(
        Date.now() + DEFAULT_LEAD_TIME_DAYS * 24 * 60 * 60 * 1000,
      );
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
      description: body.description?.trim() ?? "",
      requiredDate,
      contactEmail: body.contactEmail.trim(),
      contactPhone: body.contactPhone?.trim() ?? "",
      departmentId,
      requestTypeId,
      requesterAdministrationId: body.requesterAdministrationId?.trim() || null,
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
