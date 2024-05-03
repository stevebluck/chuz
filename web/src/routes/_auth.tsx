import { Outlet } from "@remix-run/react";
import { AuthLayout } from "src/auth/AuthLayout";

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
