import "server-only";

import { prisma } from "@/lib/prisma";
import {
  PLATFORM_MODULES,
  type PlatformModuleState,
} from "./registry";

interface ModuleRow {
  key: string;
  isEnabled: boolean;
  sortOrder: number;
}

/** Registry definitions merged with the stored enable/disable state. */
export async function getPlatformModules(): Promise<PlatformModuleState[]> {
  let rows: ModuleRow[] = [];
  try {
    rows = await prisma.platformModule.findMany({
      select: { key: true, isEnabled: true, sortOrder: true },
    });
  } catch {
    rows = [];
  }

  const stored = new Map(rows.map((row) => [row.key, row]));

  return PLATFORM_MODULES.map((definition) => {
    const row = stored.get(definition.key);
    return {
      ...definition,
      isEnabled: definition.core
        ? true
        : (row?.isEnabled ?? definition.defaultEnabled),
      sortOrder: row?.sortOrder ?? definition.sortOrder,
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getEnabledModules(): Promise<PlatformModuleState[]> {
  const modules = await getPlatformModules();
  return modules.filter((m) => m.isEnabled);
}

export async function isModuleEnabled(key: string): Promise<boolean> {
  const modules = await getPlatformModules();
  return modules.some((m) => m.key === key && m.isEnabled);
}

export async function setModuleEnabled(
  key: string,
  isEnabled: boolean,
): Promise<PlatformModuleState[]> {
  const definition = PLATFORM_MODULES.find((m) => m.key === key);
  if (!definition) {
    throw new Error("NOT_FOUND: الأداة غير معروفة");
  }
  if (definition.core && !isEnabled) {
    throw new Error("VALIDATION: لا يمكن تعطيل أداة أساسية");
  }

  await prisma.platformModule.upsert({
    where: { key },
    update: { isEnabled },
    create: { key, isEnabled, sortOrder: definition.sortOrder },
  });

  return getPlatformModules();
}
