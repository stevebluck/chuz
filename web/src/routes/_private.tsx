import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import * as Remix from "src/server/Remix";
import { LoaderResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";

export const loader = Remix.loader(
  Session.authenticated.pipe(
    Effect.map(() => LoaderResponse.Succeed({})),
    Effect.catchAll(() => LoaderResponse.Unauthorized),
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
