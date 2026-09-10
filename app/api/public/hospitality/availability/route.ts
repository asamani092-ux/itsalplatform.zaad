import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { getHospitalitySettings } from "@/lib/app-settings";
import { computeAvailableSlots } from "@/lib/hospitality/availability";
import { ACTIVE_BOOKING_FILTER } from "@/lib/hospitality/service";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "hospitality-availability"), 30, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const room = request.nextUrl.searchParams.get("room")?.trim() ?? "";
    const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
    const durationHoursParam = request.nextUrl.searchParams.get("durationHours");

    if (!room) {
      return jsonError("اسم القاعة مطلوب", "VALIDATION", 400);
    }
    if (!DATE_RE.test(date)) {
      return jsonError("التاريخ يجب أن يكون بصيغة YYYY-MM-DD", "VALIDATION", 400);
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59.999`);
    if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
      return jsonError("تاريخ غير صالح", "VALIDATION", 400);
    }

    const [bookings, hospitalitySettings] = await Promise.all([
      prisma.hospitalityBooking.findMany({
        where: {
          roomName: room,
          meetingDate: { gte: dayStart, lte: dayEnd },
          ...ACTIVE_BOOKING_FILTER,
        },
        select: {
          startTime: true,
          endTime: true,
          requesterName: true,
        },
        orderBy: { startTime: "asc" },
      }),
      getHospitalitySettings(),
    ]);

    const slots = bookings.map((b: {
      startTime: string;
      endTime: string;
      requesterName: string;
    }) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      requesterName: b.requesterName || undefined,
    }));

    let availableSlots: { startTime: string; endTime: string }[] | undefined;
    if (durationHoursParam !== null) {
      const durationHours = Number(durationHoursParam);
      if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 5) {
        return jsonError("مدة الحجز يجب أن تكون بين 1 و5 ساعات", "VALIDATION", 400);
      }
      availableSlots = computeAvailableSlots({
        dayStart: hospitalitySettings.dayStart,
        dayEnd: hospitalitySettings.dayEnd,
        durationHours,
        booked: slots.map((s) => ({ start: s.startTime, end: s.endTime })),
      });
    }

    return jsonOk({
      slots,
      dayStart: hospitalitySettings.dayStart,
      dayEnd: hospitalitySettings.dayEnd,
      ...(availableSlots ? { availableSlots } : {}),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
