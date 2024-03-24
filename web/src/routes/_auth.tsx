import { Outlet } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { Remix, ServerResponse, Session } from "src/server";

export const loader = Remix.loader(
  Session.guest.pipe(
    Effect.flatMap(ServerResponse.Ok),
    Effect.catchTags({
      Unauthorised: () => ServerResponse.Redirect(Routes.myAccount),
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
