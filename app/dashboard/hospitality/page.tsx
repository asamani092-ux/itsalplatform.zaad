import HospitalityBoard from "@/components/dashboard/HospitalityBoard";
import ModuleDisabled from "@/components/shared/module-disabled";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function HospitalityPage() {
  const enabled = await isModuleEnabled("hospitality");
  if (!enabled) {
    return <ModuleDisabled label={findModule("hospitality")?.label ?? "حجوزات الضيافة"} />;
  }

  return <HospitalityBoard />;
}
