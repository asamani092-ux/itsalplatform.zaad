import LoginForm from "@/components/employee/LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return <LoginForm nextUrl={next ?? null} />;
}
