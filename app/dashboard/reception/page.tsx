import ModuleDisabled from "@/components/shared/module-disabled";
import ReceptionDesk from "@/components/dashboard/ReceptionDesk";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function ReceptionDashboardPage() {
  const enabled = await isModuleEnabled("reception");
  if (!enabled) {
    return <ModuleDisabled label={findModule("reception")?.label ?? "شاشة الاستقبال"} />;
  }

  return <ReceptionDesk />;
}
