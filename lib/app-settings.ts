import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ROOMS,
  ROOM_ALIASES,
  canonicalizeRoomName,
  detectRoomRenames,
  roomNameMatchVariants,
} from "@/lib/hospitality/rooms";

export {
  DEFAULT_ROOMS,
  canonicalizeRoomName,
  roomNameMatchVariants,
} from "@/lib/hospitality/rooms";

const WORKFLOW_KEY = "workflow";
const HOSPITALITY_KEY = "hospitality";

export async function getWorkflowSettings(): Promise<{
  skipDepartmentApproval: boolean;
}> {
  const row = await prisma.platformModule.findUnique({ where: { key: WORKFLOW_KEY } });
  const settings = (row?.settings ?? {}) as { skipDepartmentApproval?: boolean };
  return {
    skipDepartmentApproval: Boolean(settings.skipDepartmentApproval),
  };
}

export async function setWorkflowSettings(params: {
  skipDepartmentApproval: boolean;
}) {
  return prisma.platformModule.upsert({
    where: { key: WORKFLOW_KEY },
    update: {
      settings: { skipDepartmentApproval: params.skipDepartmentApproval },
      isEnabled: true,
    },
    create: {
      key: WORKFLOW_KEY,
      isEnabled: true,
      sortOrder: 95,
      settings: { skipDepartmentApproval: params.skipDepartmentApproval },
    },
  });
}

export interface HospitalitySettings {
  rooms: string[];
  /** Workday start HH:mm — halls only */
  dayStart: string;
  /** Workday end HH:mm — halls only */
  dayEnd: string;
}

const DEFAULT_HOSPITALITY: HospitalitySettings = {
  rooms: [...DEFAULT_ROOMS],
  dayStart: "08:00",
  dayEnd: "16:00",
};

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : fallback;
}

function parseStoredHospitality(settings: {
  rooms?: string[];
  dayStart?: string;
  dayEnd?: string;
}): HospitalitySettings {
  const configured =
    Array.isArray(settings.rooms) && settings.rooms.length > 0
      ? Array.from(
          new Set(settings.rooms.map((r) => canonicalizeRoomName(String(r))).filter(Boolean)),
        )
      : [...DEFAULT_ROOMS];
  return {
    rooms: configured,
    dayStart: normalizeTime(settings.dayStart, DEFAULT_HOSPITALITY.dayStart),
    dayEnd: normalizeTime(settings.dayEnd, DEFAULT_HOSPITALITY.dayEnd),
  };
}

/** Configured halls only (settings UI) — excludes ghost booking names. */
export async function getConfiguredHospitalitySettings(): Promise<HospitalitySettings> {
  const row = await prisma.platformModule.findUnique({ where: { key: HOSPITALITY_KEY } });
  const settings = (row?.settings ?? {}) as {
    rooms?: string[];
    dayStart?: string;
    dayEnd?: string;
  };
  return parseStoredHospitality(settings);
}

/**
 * Halls for booking UIs: configured list plus active booking room names
 * so unmigrated/legacy labels still appear and block slots.
 */
export async function getHospitalitySettings(): Promise<HospitalitySettings> {
  const configured = await getConfiguredHospitalitySettings();

  const bookingRooms = await prisma.hospitalityBooking.findMany({
    where: {
      NOT: {
        request: { status: { in: ["Rejected", "Cancelled"] } },
      },
    },
    select: { roomName: true },
    distinct: ["roomName"],
  });
  const rooms = Array.from(
    new Set([
      ...configured.rooms,
      ...bookingRooms.map((b) => canonicalizeRoomName(b.roomName)),
    ]),
  );

  return {
    rooms,
    dayStart: configured.dayStart,
    dayEnd: configured.dayEnd,
  };
}

export async function getHospitalityRooms(): Promise<string[]> {
  const settings = await getHospitalitySettings();
  return settings.rooms;
}

async function migrateRoomRename(from: string, to: string) {
  const variants = roomNameMatchVariants(from);
  const bookings = await prisma.hospitalityBooking.findMany({
    where: { roomName: { in: variants } },
    select: { id: true, requestId: true },
  });

  await prisma.hospitalityBooking.updateMany({
    where: { roomName: { in: variants } },
    data: { roomName: to },
  });

  const requestIds = bookings
    .map((b) => b.requestId)
    .filter((id): id is string => Boolean(id));
  if (requestIds.length === 0) return;

  const requests = await prisma.communicationRequest.findMany({
    where: { id: { in: requestIds } },
    select: { id: true, title: true, description: true },
  });

  await Promise.all(
    requests.map((req) => {
      let title = req.title;
      let description = req.description;
      for (const label of variants) {
        title = title.split(label).join(to);
        description = description.split(label).join(to);
      }
      if (title === req.title && description === req.description) return null;
      return prisma.communicationRequest.update({
        where: { id: req.id },
        data: { title, description },
      });
    }),
  );
}

export async function setHospitalitySettings(params: {
  rooms: string[];
  dayStart?: string;
  dayEnd?: string;
}) {
  const cleaned = Array.from(
    new Set(params.rooms.map((r) => canonicalizeRoomName(r.trim())).filter(Boolean)),
  );
  if (cleaned.length === 0) {
    throw new Error("VALIDATION: أضف قاعة واحدة على الأقل");
  }
  const current = await getConfiguredHospitalitySettings();
  const dayStart = normalizeTime(params.dayStart, current.dayStart);
  const dayEnd = normalizeTime(params.dayEnd, current.dayEnd);
  if (dayStart >= dayEnd) {
    throw new Error("VALIDATION: نهاية ساعات العمل يجب أن تكون بعد البداية");
  }

  // Migrate hardcoded legacy aliases first.
  for (const [from, to] of Object.entries(ROOM_ALIASES)) {
    if (from !== to) {
      await prisma.hospitalityBooking.updateMany({
        where: { roomName: from },
        data: { roomName: to },
      });
    }
  }

  // Migrate intentional renames (same slot order: removed ↔ added).
  const renames = detectRoomRenames(current.rooms, cleaned);
  for (const { from, to } of renames) {
    await migrateRoomRename(from, to);
  }

  const payload = { rooms: cleaned, dayStart, dayEnd };
  return prisma.platformModule.upsert({
    where: { key: HOSPITALITY_KEY },
    update: { settings: payload, isEnabled: true },
    create: {
      key: HOSPITALITY_KEY,
      isEnabled: true,
      sortOrder: 55,
      settings: payload,
    },
  });
}

/** @deprecated use setHospitalitySettings */
export async function setHospitalityRooms(rooms: string[]) {
  return setHospitalitySettings({ rooms });
}
