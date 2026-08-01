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
  | "desk";

export const MODULE_ICON_PATHS: Record<ModuleIconKey, string> = {
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  board: "M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z",
  users: "M8 11a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0M17 11a3 3 0 100-6M16 20h6a5 5 0 00-4-4.9",
  settings:
    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.6 1.6 0 008 19.4a1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H2a2 2 0 110-4h.1A1.6 1.6 0 004.6 8a1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V2a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H22a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z",
  calendar: "M3 9h18M7 3v4M17 3v4M4 5h16v16H4z",
  folder: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  form: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
  desk: "M3 10h18M5 10V6h14v4M6 10v10M18 10v10",
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
    description: "إنشاء نماذج متعددة، لكل نموذج رابط عام و QR مستقل",
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
    label: "شاشة الاستقبال",
    description: "متابعة زيارات اليوم وتسجيل الحضور",
    href: "/dashboard/settings?section=departments",
    category: "services",
    icon: "desk",
    core: false,
    defaultEnabled: false,
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
