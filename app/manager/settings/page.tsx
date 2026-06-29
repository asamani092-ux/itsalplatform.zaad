import { redirect } from "next/navigation";

export default function ManagerSettingsRedirectPage() {
  redirect("/dashboard/settings");
}
