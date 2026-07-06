import { redirect } from "next/navigation";

export default function DashboardSettingsPreviewRedirect() {
  redirect("/dashboard/settings?section=form");
}
