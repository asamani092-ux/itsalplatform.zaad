import { redirect } from "next/navigation";

export default function ManagerSettingsPreviewRedirectPage() {
  redirect("/dashboard/settings/preview");
}
