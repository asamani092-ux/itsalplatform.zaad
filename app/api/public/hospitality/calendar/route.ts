import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api-utils";
import { getHospitalityRooms } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

/** Public: all upcoming hospitality bookings (room + date + time only). */
export async function GET(request: NextRequest) {
  try {
    const room = request.nextUrl.searchParams.get("room");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [bookings, rooms] = await Promise.all([
      prisma.hospitalityBooking.findMany({
        where: {
          meetingDate: { gte: today },
          ...(room ? { roomName: room } : {}),
        },
        select: {
          roomName: true,
          meetingDate: true,
          startTime: true,
          endTime: true,
        },
        orderBy: [{ meetingDate: "asc" }, { startTime: "asc" }],
        take: 200,
      }),
      getHospitalityRooms(),
    ]);

    return jsonOk({
      rooms,
      bookings: bookings.map((b: {
        roomName: string;
        meetingDate: Date;
        startTime: string;
        endTime: string;
      }) => ({
        roomName: b.roomName,
        meetingDate: b.meetingDate.toISOString().slice(0, 10),
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
