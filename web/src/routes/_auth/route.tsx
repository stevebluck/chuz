import { Outlet } from "@remix-run/react";
import { Sessions } from "core/index";
import { Effect } from "effect";
import { Redirect } from "src/Redirect";
import { RemixServer } from "src/Remix.server";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";

export const loader = RemixServer.loader(
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
