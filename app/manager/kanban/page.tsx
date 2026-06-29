import { redirect } from "next/navigation";

export default function ManagerKanbanRedirectPage() {
  redirect("/dashboard/kanban");
}
