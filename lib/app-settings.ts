import "server-only";

import { prisma } from "@/lib/prisma";

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

/** Canonical hall names — keep in sync with seed + hospitality board fallbacks. */
export const DEFAULT_ROOMS = [
  "قاعة الحسني",
  "قاعة الضبيب",
  "قاعة الاجتماعات الكبرى",
  "قاعة التدريب",
  "قاعة الاستقبال",
  "قاعة الوسائط",
];

/** Legacy short labels that must map to a canonical room for availability matching. */
const ROOM_ALIASES: Record<string, string> = {
  "قاعة الاجتماعات": "قاعة الاجتماعات الكبرى",
  "قاعة اجتماعات": "قاعة الاجتماعات الكبرى",
  "قاعة الوسائط المتعددة": "قاعة الوسائط",
};

export function canonicalizeRoomName(roomName: string): string {
  const trimmed = roomName.trim();
  return ROOM_ALIASES[trimmed] ?? trimmed;
}

/** All DB labels that should match a selected room (canonical + legacy aliases). */
export function roomNameMatchVariants(roomName: string): string[] {
  const canonical = canonicalizeRoomName(roomName);
  const aliases = Object.entries(ROOM_ALIASES)
    .filter(([, to]) => to === canonical)
    .map(([from]) => from);
  return Array.from(new Set([roomName.trim(), canonical, ...aliases].filter(Boolean)));
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

export async function getHospitalitySettings(): Promise<HospitalitySettings> {
  const row = await prisma.platformModule.findUnique({ where: { key: HOSPITALITY_KEY } });
  const settings = (row?.settings ?? {}) as {
    rooms?: string[];
    dayStart?: string;
    dayEnd?: string;
  };
  const configured =
    Array.isArray(settings.rooms) && settings.rooms.length > 0
      ? settings.rooms.map((r) => canonicalizeRoomName(String(r))).filter(Boolean)
      : [...DEFAULT_ROOMS];

  // Include active booking room names so renamed/legacy halls still appear and block slots.
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
      ...configured,
      ...bookingRooms.map((b) => canonicalizeRoomName(b.roomName)),
    ]),
  );

  return {
    rooms,
    dayStart: normalizeTime(settings.dayStart, DEFAULT_HOSPITALITY.dayStart),
    dayEnd: normalizeTime(settings.dayEnd, DEFAULT_HOSPITALITY.dayEnd),
  };
}

export async function getHospitalityRooms(): Promise<string[]> {
  const settings = await getHospitalitySettings();
  return settings.rooms;
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
  const current = await getHospitalitySettings();
  const dayStart = normalizeTime(params.dayStart, current.dayStart);
  const dayEnd = normalizeTime(params.dayEnd, current.dayEnd);
  if (dayStart >= dayEnd) {
    throw new Error("VALIDATION: نهاية ساعات العمل يجب أن تكون بعد البداية");
  }

  // Migrate legacy short room labels on existing bookings so availability stays accurate.
  for (const [from, to] of Object.entries(ROOM_ALIASES)) {
    if (from !== to) {
      await prisma.hospitalityBooking.updateMany({
        where: { roomName: from },
        data: { roomName: to },
      });
    }
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
