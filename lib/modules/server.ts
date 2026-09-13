import "server-only";

import { EmployeeRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_MODULES,
  type PlatformModuleState,
} from "./registry";

export interface ModuleRow {
  key: string;
  isEnabled: boolean;
  sortOrder: number;
  ownerDepartmentId: string | null;
}

export interface ModuleViewer {
  role: EmployeeRole | string;
  departmentId: string | null;
  /** Reception desk staff flag (employee ops). */
  isReceptionDesk?: boolean;
  deskAccess?: boolean;
}

/** Registry definitions merged with stored enable/owner state. */
export async function getPlatformModules(): Promise<PlatformModuleState[]> {
  let rows: ModuleRow[] = [];
  try {
    rows = await prisma.platformModule.findMany({
      select: {
        key: true,
        isEnabled: true,
        sortOrder: true,
        ownerDepartmentId: true,
      },
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
      ownerDepartmentId: row?.ownerDepartmentId ?? null,
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

export async function getModuleOwnerDepartmentId(
  key: string,
): Promise<string | null> {
  const row = await prisma.platformModule.findUnique({
    where: { key },
    select: { ownerDepartmentId: true },
  });
  return row?.ownerDepartmentId ?? null;
}

/**
 * Whether the viewer may open a module.
 * DIRECTOR: all enabled. SECTION_MANAGER: unowned or own department.
 * Reception desk employee: reception only. Other employees: none here.
 */
export function canViewModule(
  module: PlatformModuleState,
  viewer: ModuleViewer,
): boolean {
  if (!module.isEnabled && !module.core) return false;

  if (viewer.role === EmployeeRole.DIRECTOR || viewer.role === "DIRECTOR") {
    return true;
  }

  if (
    (viewer.role === EmployeeRole.EMPLOYEE || viewer.role === "EMPLOYEE") &&
    (viewer.isReceptionDesk || viewer.deskAccess)
  ) {
    return module.key === "reception";
  }

  if (
    viewer.role === EmployeeRole.SECTION_MANAGER ||
    viewer.role === "SECTION_MANAGER"
  ) {
    if (module.key === "grants") return false;
    if (!module.ownerDepartmentId) return true;
    return module.ownerDepartmentId === viewer.departmentId;
  }

  return false;
}

export async function getVisibleModulesForViewer(
  viewer: ModuleViewer,
): Promise<PlatformModuleState[]> {
  const modules = await getEnabledModules();
  return modules.filter((m) => canViewModule(m, viewer));
}

/** SECTION_MANAGER owns reception when their department owns the reception module. */
export async function sectionManagerOwnsReception(
  departmentId: string | null,
): Promise<boolean> {
  if (!departmentId) return false;
  const ownerId = await getModuleOwnerDepartmentId("reception");
  return ownerId !== null && ownerId === departmentId;
}


/** SECTION_MANAGER may use reception when unowned or owned by their department. */
export async function sectionManagerHasReceptionAccess(
  departmentId: string | null,
): Promise<boolean> {
  const ownerId = await getModuleOwnerDepartmentId("reception");
  if (!ownerId) return true;
  return departmentId !== null && ownerId === departmentId;
}

export async function canAccessReception(viewer: ModuleViewer): Promise<boolean> {
  const modules = await getPlatformModules();
  const reception = modules.find((m) => m.key === "reception");
  if (!reception) return false;
  return canViewModule(reception, viewer);
}

/** Manage = director or section manager with reception access (not desk-only employee). */
export async function canManageReception(viewer: ModuleViewer): Promise<boolean> {
  if (!(await canAccessReception(viewer))) return false;
  if (viewer.role === EmployeeRole.DIRECTOR || viewer.role === "DIRECTOR") {
    return true;
  }
  if (
    viewer.role === EmployeeRole.SECTION_MANAGER ||
    viewer.role === "SECTION_MANAGER"
  ) {
    return true;
  }
  return false;
}

export async function resolveDeskAccess(params: {
  role: EmployeeRole | string;
  departmentId: string | null;
  isReceptionDesk: boolean;
}): Promise<boolean> {
  if (params.role === EmployeeRole.DIRECTOR || params.role === "DIRECTOR") {
    return true;
  }
  if (params.isReceptionDesk) return true;
  if (
    params.role === EmployeeRole.SECTION_MANAGER ||
    params.role === "SECTION_MANAGER"
  ) {
    return sectionManagerHasReceptionAccess(params.departmentId);
  }
  return false;
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
    create: {
      key,
      isEnabled,
      sortOrder: definition.sortOrder,
    },
  });

  return getPlatformModules();
}

export async function setModuleOwnerDepartment(
  key: string,
  ownerDepartmentId: string | null,
): Promise<PlatformModuleState[]> {
  const definition = PLATFORM_MODULES.find((m) => m.key === key);
  if (!definition) {
    throw new Error("NOT_FOUND: الأداة غير معروفة");
  }
  if (definition.core && ownerDepartmentId) {
    throw new Error("VALIDATION: لا يُربط قسم بأداة أساسية");
  }

  if (ownerDepartmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: ownerDepartmentId },
      select: { id: true },
    });
    if (!dept) {
      throw new Error("NOT_FOUND: القسم غير موجود");
    }
  }

  await prisma.platformModule.upsert({
    where: { key },
    update: { ownerDepartmentId },
    create: {
      key,
      isEnabled: definition.defaultEnabled,
      sortOrder: definition.sortOrder,
      ownerDepartmentId,
    },
  });

  return getPlatformModules();
}
