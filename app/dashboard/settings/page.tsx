import DashboardSettingsClient from "@/components/dashboard/DashboardSettingsClient";

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const initialSection =
    section === "modules" ||
    section === "administrations" ||
    section === "departments" ||
    section === "requestTypes" ||
    section === "routing"
      ? section
      : undefined;

  return <DashboardSettingsClient initialSection={initialSection} />;
}
