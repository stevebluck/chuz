import { Outlet } from "@remix-run/react";
import { AuthLayout } from "src/components/auth/AuthLayout";

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
