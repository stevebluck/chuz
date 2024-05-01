import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import * as Remix from "src/server/Remix";
import { Http, Session } from "src/server/prelude";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.zipRight(Http.response.ok({})),
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
