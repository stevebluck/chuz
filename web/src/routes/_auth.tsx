import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { ServerResponse, Session } from "src/server";
import { Remix } from "src/server/Remix";

export const loader = Remix.loader(
  Session.guest.pipe(
    Effect.flatMap(() => ServerResponse.Ok()),
    Effect.catchTags({
      AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.myAccount),
    }),
  ),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
