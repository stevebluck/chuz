import { Outlet } from "@remix-run/react";
import { Sessions } from "core/index";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { Redirect } from "src/server/Redirect";
import { RemixServer } from "src/server/Remix.server";

export const loader = RemixServer.loader(
  "Auth",
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.guest),
    Effect.catchTags({ Unauthorised: () => Redirect.make(Routes.myAccount) }),
  ),
);

export default function IdentityPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
