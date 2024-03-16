import { Outlet } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { Redirect } from "src/server/Response";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

export const loader = Runtime.loader(
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
