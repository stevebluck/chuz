import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { AccountLayout } from "src/account/AccountLayout";
import { Http, Session } from "src/server";
import * as Remix from "src/server/Remix";
import { AppCookies } from "src/server/cookies/AppCookies";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap(() => AppCookies.returnTo),
    Effect.flatMap((returnToCookie) => Http.response.ok().pipe(Effect.flatMap(returnToCookie.remove))),
    Effect.catchTag("Unauthorised", () => Http.response.unauthorized),
  ),
);

export default function Account() {
  return (
    <AccountLayout>
      <Outlet />
    </AccountLayout>
  );
}
