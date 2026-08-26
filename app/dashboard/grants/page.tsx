import GrantsManager from "@/components/dashboard/GrantsManager";
import ModuleDisabled from "@/components/shared/module-disabled";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  const enabled = await isModuleEnabled("grants");
  if (!enabled) {
    return <ModuleDisabled label={findModule("grants")?.label ?? "إدارة المنح"} />;
  }

  return <GrantsManager />;
}
