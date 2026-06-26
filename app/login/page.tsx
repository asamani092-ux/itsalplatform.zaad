import { Suspense } from "react";
import LoginForm from "@/components/employee/LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="page-shell min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
