import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";

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
      orderBy: { meetingDate: "asc" },
    });

    return jsonOk({ bookings, count: bookings.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
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

    const booking = await prisma.hospitalityBooking.create({
      data: {
        requesterName: body.requesterName.trim(),
        requesterEmail: body.requesterEmail.trim(),
        requesterPhone: body.requesterPhone.trim(),
        roomName: body.roomName.trim(),
        meetingDate,
        startTime: body.startTime,
        endTime: body.endTime,
        attendeesCount: body.attendeesCount,
        notes: body.notes?.trim() ?? "",
      },
    });

    return jsonOk(booking, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
