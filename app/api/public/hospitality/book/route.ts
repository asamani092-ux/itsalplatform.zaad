import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { createBookingWithRequest, findBookingConflict } from "@/lib/hospitality/service";
import { getHospitalitySettings } from "@/lib/app-settings";
import { timeToMinutes } from "@/lib/hospitality/availability";

interface BookBody {
  roomName?: string;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  durationHours?: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  title?: string;
  description?: string;
  attendeesCount?: number;
  requesterAdministrationId?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "hospitality-book"), 10, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const body = (await request.json()) as BookBody;

    const roomName = body.roomName?.trim() ?? "";
    const meetingDateStr = body.meetingDate?.trim() ?? "";
    const startTime = body.startTime?.trim() ?? "";
    const endTime = body.endTime?.trim() ?? "";
    const contactName = body.contactName?.trim() ?? "";
    const contactEmail = body.contactEmail?.trim() ?? "";

    if (!roomName) return jsonError("اسم القاعة مطلوب", "VALIDATION", 400);
    if (!DATE_RE.test(meetingDateStr)) {
      return jsonError("التاريخ يجب أن يكون بصيغة YYYY-MM-DD", "VALIDATION", 400);
    }
    if (!startTime || !endTime) {
      return jsonError("وقت البداية والنهاية مطلوبان", "VALIDATION", 400);
    }
    if (!contactName) return jsonError("اسم مقدّم الطلب مطلوب", "VALIDATION", 400);
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return jsonError("صيغة البريد الإلكتروني غير صحيحة", "VALIDATION", 400);
    }

    const settings = await getHospitalitySettings();
    if (!settings.rooms.includes(roomName)) {
      return jsonError("القاعة غير متاحة", "VALIDATION", 400);
    }

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    const dayStartMin = timeToMinutes(settings.dayStart);
    const dayEndMin = timeToMinutes(settings.dayEnd);
    if (startMin < 0 || endMin < 0 || startMin >= endMin) {
      return jsonError("وقت النهاية يجب أن يكون بعد وقت البداية", "VALIDATION", 400);
    }
    if (startMin < dayStartMin || endMin > dayEndMin) {
      return jsonError("الوقت المختار خارج ساعات العمل", "VALIDATION", 400);
    }

    const durationHours = body.durationHours
      ? Math.max(1, Math.min(5, Math.round(body.durationHours)))
      : Math.round((endMin - startMin) / 60);
    if (durationHours < 1 || durationHours > 5) {
      return jsonError("مدة الحجز يجب أن تكون بين 1 و5 ساعات", "VALIDATION", 400);
    }

    const meetingDate = new Date(`${meetingDateStr}T00:00:00`);
    if (Number.isNaN(meetingDate.getTime())) {
      return jsonError("تاريخ الاجتماع غير صالح", "VALIDATION", 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDay = new Date(meetingDate);
    meetingDay.setHours(0, 0, 0, 0);
    if (meetingDay < today) {
      return jsonError("لا يمكن الحجز بتاريخ سابق", "VALIDATION", 400);
    }

    const conflict = await findBookingConflict({
      roomName,
      meetingDate,
      startTime,
      endTime,
    });
    if (conflict) {
      return jsonError(
        "تم حجز هذا الموعد للتو من مستخدم آخر — اختر موعداً آخر",
        "CONFLICT",
        409,
      );
    }

    const { requestId, approvalUrl } = await createBookingWithRequest({
      requesterName: contactName,
      requesterEmail: contactEmail,
      requesterPhone: body.contactPhone?.trim() ?? "",
      roomName,
      meetingDate,
      startTime,
      endTime,
      attendeesCount: body.attendeesCount && body.attendeesCount > 0 ? body.attendeesCount : 1,
      notes: body.description?.trim() || body.title?.trim() || "حجز قاعة",
      contactName,
      requesterAdministrationId: body.requesterAdministrationId?.trim() || null,
    });

    return jsonOk({ id: requestId, requestId, approvalUrl }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
