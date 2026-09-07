import LoginForm from "@/components/employee/LoginForm";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const showDemoHints = process.env.NODE_ENV !== "production";
  return <LoginForm nextUrl={next ?? null} showDemoHints={showDemoHints} />;
}
