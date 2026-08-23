import "server-only";

import { prisma } from "@/lib/prisma";

const HOSPITALITY_KEY = "hospitality";

const DEFAULT_ROOMS = [
  "قاعة الاجتماعات الكبرى",
  "قاعة التدريب",
  "قاعة الاستقبال",
  "قاعة الوسائط",
];

export async function getHospitalityRooms(): Promise<string[]> {
  const row = await prisma.platformModule.findUnique({ where: { key: HOSPITALITY_KEY } });
  const settings = (row?.settings ?? {}) as { rooms?: string[] };
  if (Array.isArray(settings.rooms) && settings.rooms.length > 0) {
    return settings.rooms.map(String).filter(Boolean);
  }
  return [...DEFAULT_ROOMS];
}

export async function setHospitalityRooms(rooms: string[]) {
  const cleaned = rooms.map((r) => r.trim()).filter(Boolean);
  if (cleaned.length === 0) {
    throw new Error("VALIDATION: أضف قاعة واحدة على الأقل");
  }
  return prisma.platformModule.upsert({
    where: { key: HOSPITALITY_KEY },
    update: { settings: { rooms: cleaned }, isEnabled: true },
    create: {
      key: HOSPITALITY_KEY,
      isEnabled: true,
      sortOrder: 55,
      settings: { rooms: cleaned },
    },
  });
}
