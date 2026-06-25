import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

type BookingBody = {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  roomName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  notes?: string;
};

function validateBooking(body: BookingBody): string | null {
  if (!body.requesterName?.trim()) return "اسم مقدم الطلب مطلوب";
  if (!body.requesterEmail?.trim()) return "البريد الإلكتروني مطلوب";
  if (!body.requesterPhone?.trim()) return "رقم الجوال مطلوب";
  if (!body.roomName?.trim()) return "اسم القاعة مطلوب";
  if (!body.meetingDate) return "تاريخ الاجتماع مطلوب";
  if (!body.startTime?.trim()) return "وقت البداية مطلوب";
  if (!body.endTime?.trim()) return "وقت النهاية مطلوب";
  if (!body.attendeesCount || body.attendeesCount < 1) {
    return "عدد الحضور مطلوب";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BookingBody;
    const validationError = validateBooking(body);
    if (validationError) {
      return jsonError(validationError, 400, "VALIDATION_ERROR");
    }

    const meetingDate = new Date(body.meetingDate);
    if (Number.isNaN(meetingDate.getTime())) {
      return jsonError("تاريخ غير صالح", 400, "VALIDATION_ERROR");
    }

    const booking = await prisma.hospitalityBooking.create({
      data: {
        requesterName: body.requesterName.trim(),
        requesterEmail: body.requesterEmail.trim(),
        requesterPhone: body.requesterPhone.trim(),
        roomName: body.roomName.trim(),
        meetingDate,
        startTime: body.startTime.trim(),
        endTime: body.endTime.trim(),
        attendeesCount: body.attendeesCount,
        notes: body.notes?.trim() ?? "",
      },
    });

    return jsonOk({ booking }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");

    const where: { meetingDate?: { gte?: Date; lte?: Date } } = {};

    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) {
        where.meetingDate = { ...where.meetingDate, gte: fromDate };
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        where.meetingDate = { ...where.meetingDate, lte: toDate };
      }
    }

    const bookings = await prisma.hospitalityBooking.findMany({
      where,
      orderBy: { meetingDate: "asc" },
    });

    return jsonOk({ bookings, count: bookings.length });
  } catch (error) {
    return handleApiError(error);
  }
}
