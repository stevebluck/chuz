import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { Cookies, Http, Session } from "src/server";
import * as Remix from "src/server/Remix";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.flatMap(() => Cookies.ReturnTo),
    Effect.flatMap((cookie) => Http.response.ok().pipe(Effect.flatMap(cookie.remove))),
    Effect.catchTag("Unauthorised", () => Http.response.unauthorized),
  ),
);

export default function Private() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-10">
      <div className="mx-auto w-full max-w-6xl">
        <Outlet />
      </div>
    </div>
  );
}
