import { NextRequest } from "next/server";
import { handleApiError, jsonError, jsonOk } from "@/lib/api-utils";
import { requireReceptionDeskSession } from "@/lib/auth/route-guard";
import {
  addAttendeesBulk,
  createAttendanceEvent,
  getAttendanceEvent,
  listAttendanceEvents,
  setAttendeeAttendance,
} from "@/lib/reception-service";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const event = await getAttendanceEvent(id);
      return jsonOk({ event });
    }
    const events = await listAttendanceEvents();
    return jsonOk({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        kind: e.kind,
        scheduledAt: e.scheduledAt,
        notes: e.notes,
        total: e._count.attendees,
        attended: e.attendees.filter((a) => a.attended).length,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      title?: string;
      kind?: string;
      scheduledAt?: string;
      notes?: string;
      namesText?: string;
    };

    if (!body.title?.trim() || !body.scheduledAt) {
      return jsonError("العنوان وتاريخ الموعد مطلوبان", "VALIDATION", 400);
    }

    const names = (body.namesText ?? "")
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean);

    const event = await createAttendanceEvent({
      title: body.title,
      kind: body.kind === "JOB_INTERVIEW" ? "JOB_INTERVIEW" : "MEETING",
      scheduledAt: new Date(body.scheduledAt),
      notes: body.notes,
      names,
      createdById: auth.session.sub,
    });

    return jsonOk({ event }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireReceptionDeskSession();
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      action?: "toggle" | "add_names";
      attendeeId?: string;
      attended?: boolean;
      eventId?: string;
      namesText?: string;
    };

    if (body.action === "add_names" && body.eventId) {
      const names = (body.namesText ?? "")
        .split(/[\n,;]+/)
        .map((n) => n.trim())
        .filter(Boolean);
      const event = await addAttendeesBulk({ eventId: body.eventId, names });
      return jsonOk({ event });
    }

    if (!body.attendeeId || body.attended === undefined) {
      return jsonError("معرّف المشارك وحالة الحضور مطلوبان", "VALIDATION", 400);
    }

    const attendee = await setAttendeeAttendance({
      attendeeId: body.attendeeId,
      attended: body.attended,
    });
    return jsonOk({ attendee });
  } catch (error) {
    return handleApiError(error);
  }
}
