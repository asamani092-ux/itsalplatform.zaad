import MediaLibrary from "@/components/dashboard/MediaLibrary";
import ModuleDisabled from "@/components/shared/module-disabled";
import { findModule } from "@/lib/modules/registry";
import { isModuleEnabled } from "@/lib/modules/server";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const enabled = await isModuleEnabled("media");
  if (!enabled) {
    return <ModuleDisabled label={findModule("media")?.label ?? "مركز الوثائق"} />;
  }

  return <MediaLibrary />;
}
