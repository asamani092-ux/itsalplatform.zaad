import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (next) {
    redirect(`/?next=${encodeURIComponent(next)}`);
  }
  redirect("/");
}
