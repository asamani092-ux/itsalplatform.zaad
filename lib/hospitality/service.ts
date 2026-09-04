import "server-only";

import { prisma } from "@/lib/prisma";
import { submitRequest } from "@/lib/request-service";
import { sameCalendarDay, timesOverlap } from "./conflict";

export const HOSPITALITY_TYPE_SLUG = "hospitality-booking";

export interface BookingInput {
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string;
  roomName: string;
  meetingDate: Date;
  startTime: string;
  endTime: string;
  attendeesCount: number;
  notes: string;
  cateringRequests?: string;
}

export async function findBookingConflict(input: {
  roomName: string;
  meetingDate: Date;
  startTime: string;
  endTime: string;
}) {
  const dayStart = new Date(input.meetingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(input.meetingDate);
  dayEnd.setHours(23, 59, 59, 999);

  const sameRoom = await prisma.hospitalityBooking.findMany({
    where: { roomName: input.roomName, meetingDate: { gte: dayStart, lte: dayEnd } },
  });

  return (
    sameRoom.find(
      (existing) =>
        sameCalendarDay(existing.meetingDate, input.meetingDate) &&
        timesOverlap(existing.startTime, existing.endTime, input.startTime, input.endTime),
    ) ?? null
  );
}

/**
 * Ensures the request type used to turn bookings into workboard tasks exists.
 * Bound to the department that owns the hospitality service.
 */
export async function ensureHospitalityRequestType() {
  const existing = await prisma.requestType.findUnique({
    where: { slug: HOSPITALITY_TYPE_SLUG },
  });
  if (existing) return existing;

  const department =
    (await prisma.department.findFirst({ where: { slug: "communications" } })) ??
    (await prisma.department.findFirst({ where: { isActive: true } }));

  return prisma.requestType.create({
    data: {
      slug: HOSPITALITY_TYPE_SLUG,
      name: "حجز ضيافة",
      description: "طلب حجز قاعة — يُدار من أداة حجوزات الضيافة",
      requiresVisitDate: true,
      departmentId: department?.id ?? null,
    },
  });
}

/**
 * Creates a booking together with its communication request so the booking
 * shows up as a task on the workboard and follows the same approval flow.
 */
export async function createBookingWithRequest(input: BookingInput) {
  const requestType = await ensureHospitalityRequestType();
  if (!requestType.departmentId) {
    throw new Error("VALIDATION: لا يوجد قسم مرتبط بخدمة الضيافة");
  }

  const visitDate = new Date(input.meetingDate);
  const [hours, minutes] = input.startTime.split(":").map((part) => Number(part));
  if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
    visitDate.setHours(hours, minutes, 0, 0);
  }

  const { request } = await submitRequest({
    title: `حجز قاعة: ${input.roomName}`,
    description:
      `${input.notes || "حجز قاعة"}\n` +
      `القاعة: ${input.roomName}\n` +
      `التوقيت: ${input.startTime} — ${input.endTime}\n` +
      `عدد الحضور (تقريبي): ${input.attendeesCount}\n` +
      (input.cateringRequests
        ? `طلبات الضيافة: ${input.cateringRequests}\n(تنفيذ الطلبات حسب القدرة والاستطاعة)`
        : ""),
    requiredDate: input.meetingDate,
    contactEmail: input.requesterEmail,
    contactPhone: input.requesterPhone || "0500000000",
    departmentId: requestType.departmentId,
    requestTypeId: requestType.id,
    visitDate,
  });

  const booking = await prisma.hospitalityBooking.create({
    data: {
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      requesterPhone: input.requesterPhone || "",
      roomName: input.roomName,
      meetingDate: input.meetingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      attendeesCount: input.attendeesCount,
      notes: input.notes,
      cateringRequests: input.cateringRequests?.trim() || "",
      requestId: request.id,
    },
  });

  return { booking, requestId: request.id };
}
