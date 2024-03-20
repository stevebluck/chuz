import { Outlet } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { App, Redirect, Sessions } from "src/server";

export const loader = App.loader(
  "Auth",
  Effect.catchTags(Sessions.guest, { Unauthorised: () => Redirect.make(Routes.myAccount) }),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
