/**
 * Platform module registry — the single place where an admin tool is declared.
 * Adding a new tool means adding one entry here plus its route; navigation,
 * settings toggles and the public services list pick it up automatically.
 * Client-safe: no database imports.
 */

export type ModuleCategory = "operations" | "services" | "admin";

export interface PlatformModuleDef {
  key: string;
  label: string;
  description: string;
  href: string;
  category: ModuleCategory;
  icon: ModuleIconKey;
  /** Core modules keep the workflow alive and cannot be disabled. */
  core: boolean;
  defaultEnabled: boolean;
  sortOrder: number;
  /** Public surface published to people without an account. */
  publicHref?: string;
  publicLabel?: string;
}

export type ModuleIconKey =
  | "chart"
  | "board"
  | "users"
  | "settings"
  | "calendar"
  | "folder"
  | "form"
  | "desk"
  | "grant";

/** Paths follow the official brand guide icon set (24x24, stroke 2, round). */
export const MODULE_ICON_PATHS: Record<ModuleIconKey, string[]> = {
  chart: ["M12 20V10", "M18 20V4", "M6 20v-4"],
  board: ["M4 4h5v16H4z", "M10 4h5v10h-5z", "M16 4h4v13h-4z"],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75",
  ],
  settings: [
    "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  ],
  calendar: [
    "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    "M16 2v4",
    "M8 2v4",
    "M3 10h18",
  ],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  form: [
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
    "M14 2v6h6",
    "M9 13h6",
    "M9 17h4",
  ],
  desk: ["M3 10h18", "M5 10V6h14v4", "M6 10v10", "M18 10v10"],
  grant: [
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
    "M12 6v12",
    "M14.5 9a2.5 2.5 0 0 0-2.5-1.5c-1.5 0-2.5.8-2.5 2s1 1.8 2.5 2 2.5.8 2.5 2-1 2-2.5 2A2.5 2.5 0 0 1 9.5 16",
  ],
};

export const PLATFORM_MODULES: PlatformModuleDef[] = [
  {
    key: "insights",
    label: "لوحة المؤشرات",
    description: "مؤشرات أداء قسم الاتصال المؤسسي و SLA",
    href: "/dashboard",
    category: "operations",
    icon: "chart",
    core: true,
    defaultEnabled: true,
    sortOrder: 10,
  },
  {
    key: "workboard",
    label: "لوحة العمل",
    description: "إسناد الطلبات ومتابعة تنفيذها",
    href: "/dashboard/kanban",
    category: "operations",
    icon: "board",
    core: true,
    defaultEnabled: true,
    sortOrder: 20,
  },
  {
    key: "team",
    label: "الفريق",
    description: "حسابات الموظفين والمديرين",
    href: "/dashboard/team",
    category: "admin",
    icon: "users",
    core: true,
    defaultEnabled: true,
    sortOrder: 30,
  },
  {
    key: "request-forms",
    label: "نماذج الطلبات",
    description:
      "بناء النماذج وروابطها و QR — تشغيل/إيقاف الخدمة من الإعدادات ← الخدمات",
    href: "/dashboard/forms",
    category: "services",
    icon: "form",
    core: false,
    defaultEnabled: true,
    sortOrder: 40,
  },
  {
    key: "hospitality",
    label: "حجوزات الضيافة",
    description: "حجز القاعات ومنع التعارض الزمني",
    href: "/dashboard/hospitality",
    category: "services",
    icon: "calendar",
    core: false,
    defaultEnabled: true,
    sortOrder: 50,
  },
  {
    key: "grants",
    label: "إدارة المنح",
    description: "متابعة منح تنمية الموارد المالية من الإضافة حتى الإغلاق",
    href: "/dashboard/grants",
    category: "services",
    icon: "grant",
    core: false,
    defaultEnabled: true,
    sortOrder: 55,
  },
  {
    key: "media",
    label: "مركز الوثائق",
    description: "مكتبة الوثائق والهوية الإعلامية",
    href: "/dashboard/media",
    category: "services",
    icon: "folder",
    core: false,
    defaultEnabled: true,
    sortOrder: 60,
  },
  {
    key: "reception",
    label: "الاستقبال والزيارات",
    description: "سجل الزوار وقوائم الحضور وتقارير الزيارات",
    href: "/dashboard/reception",
    category: "services",
    icon: "desk",
    core: false,
    defaultEnabled: true,
    sortOrder: 70,
  },
  {
    key: "settings",
    label: "الإعدادات",
    description: "الأقسام وأنواع الطلبات والتوجيه والخدمات",
    href: "/dashboard/settings",
    category: "admin",
    icon: "settings",
    core: true,
    defaultEnabled: true,
    sortOrder: 90,
  },
];

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  operations: "التشغيل",
  services: "الخدمات",
  admin: "الإدارة",
};

export interface PlatformModuleState extends PlatformModuleDef {
  isEnabled: boolean;
}

export function findModule(key: string): PlatformModuleDef | undefined {
  return PLATFORM_MODULES.find((m) => m.key === key);
}

export function getModuleTitle(pathname: string): string {
  const exact = PLATFORM_MODULES.find((m) => m.href === pathname);
  if (exact) return exact.label;

  const nested = PLATFORM_MODULES.filter(
    (m) => !m.href.includes("?") && m.href !== "/dashboard",
  ).find((m) => pathname.startsWith(m.href));
  if (nested) return nested.label;

  if (pathname === "/dashboard") return "لوحة المؤشرات";
  return "مركز التحكم";
}
