import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  try {
    const limit = checkRateLimit(rateLimitKey(request, "hospitality-availability"), 30, 60_000);
    if (!limit.allowed) {
      return jsonError("تم تجاوز عدد المحاولات المسموح. حاول لاحقاً.", "RATE_LIMITED", 429);
    }

    const room = request.nextUrl.searchParams.get("room")?.trim() ?? "";
    const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";

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

    const bookings = await prisma.hospitalityBooking.findMany({
      where: {
        roomName: room,
        meetingDate: { gte: dayStart, lte: dayEnd },
      },
      select: {
        startTime: true,
        endTime: true,
        requesterName: true,
      },
      orderBy: { startTime: "asc" },
    });

    const slots = bookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      requesterName: b.requesterName || undefined,
    }));

    return jsonOk({ slots });
  } catch (error) {
    return handleApiError(error);
  }
}
