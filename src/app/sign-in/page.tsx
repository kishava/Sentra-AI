import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-sentra-ink" />}>
      <AuthShell mode="sign-in" />
    </Suspense>
  );
}
