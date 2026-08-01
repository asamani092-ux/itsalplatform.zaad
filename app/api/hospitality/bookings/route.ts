import { NextRequest } from "next/server";
import { requireManagerSession } from "@/lib/auth/route-guard";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { sameCalendarDay, timesOverlap } from "@/lib/hospitality/conflict";
import type { HospitalityBooking } from "@/generated/prisma/client";

interface BookingBody {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  roomName?: string;
  meetingDate?: string;
  startTime?: string;
  endTime?: string;
  attendeesCount?: number;
  notes?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const bookings = await prisma.hospitalityBooking.findMany({
      where: {
        ...(from || to
          ? {
              meetingDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ meetingDate: "asc" }, { startTime: "asc" }],
    });

    return jsonOk({ bookings, count: bookings.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireManagerSession();
  if (auth.error) return auth.error;

  try {
    const body = (await request.json()) as BookingBody;

    if (
      !body.requesterName?.trim() ||
      !body.requesterEmail?.trim() ||
      !body.requesterPhone?.trim() ||
      !body.roomName?.trim() ||
      !body.meetingDate ||
      !body.startTime ||
      !body.endTime ||
      !body.attendeesCount
    ) {
      return jsonError("جميع حقول الحجز مطلوبة", "VALIDATION", 400);
    }

    const meetingDate = new Date(body.meetingDate);
    if (Number.isNaN(meetingDate.getTime())) {
      return jsonError("تاريخ الاجتماع غير صالح", "VALIDATION", 400);
    }

    const startTime = body.startTime.trim();
    const endTime = body.endTime.trim();
    const roomName = body.roomName.trim();

    if (timeToMinutesSafe(startTime) >= timeToMinutesSafe(endTime)) {
      return jsonError("وقت النهاية يجب أن يكون بعد وقت البداية", "VALIDATION", 400);
    }

    const dayStart = new Date(meetingDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(meetingDate);
    dayEnd.setHours(23, 59, 59, 999);

    const sameRoomBookings = await prisma.hospitalityBooking.findMany({
      where: {
        roomName,
        meetingDate: { gte: dayStart, lte: dayEnd },
      },
    });

    const conflict = sameRoomBookings.find(
      (existing: HospitalityBooking) =>
        sameCalendarDay(existing.meetingDate, meetingDate) &&
        timesOverlap(existing.startTime, existing.endTime, startTime, endTime),
    );

    if (conflict) {
      return jsonError(
        "يوجد حجز متعارض في نفس القاعة خلال هذا الوقت",
        "CONFLICT",
        409,
      );
    }

    const booking = await prisma.hospitalityBooking.create({
      data: {
        requesterName: body.requesterName.trim(),
        requesterEmail: body.requesterEmail.trim(),
        requesterPhone: body.requesterPhone.trim(),
        roomName,
        meetingDate,
        startTime,
        endTime,
        attendeesCount: body.attendeesCount,
        notes: body.notes?.trim() ?? "",
      },
    });

    return jsonOk(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

function timeToMinutesSafe(time: string): number {
  const [h, m] = time.split(":").map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}
