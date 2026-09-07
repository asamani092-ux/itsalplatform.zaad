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

const DEFAULT_ROOMS = [
  "قاعة الاجتماعات الكبرى",
  "قاعة التدريب",
  "قاعة الاستقبال",
  "قاعة الوسائط",
];

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
  const rooms =
    Array.isArray(settings.rooms) && settings.rooms.length > 0
      ? settings.rooms.map(String).filter(Boolean)
      : [...DEFAULT_ROOMS];
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
  const cleaned = params.rooms.map((r) => r.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    throw new Error("VALIDATION: أضف قاعة واحدة على الأقل");
  }
  const current = await getHospitalitySettings();
  const dayStart = normalizeTime(params.dayStart, current.dayStart);
  const dayEnd = normalizeTime(params.dayEnd, current.dayEnd);
  if (dayStart >= dayEnd) {
    throw new Error("VALIDATION: نهاية ساعات العمل يجب أن تكون بعد البداية");
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
