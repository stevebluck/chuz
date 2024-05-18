import { Effect } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { PrivateLayout } from "src/components/PrivateLayout";
import { Remix } from "src/server/Remix";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";

export const loader = Remix.loader(Session.authenticated.pipe(Effect.map(() => ServerResponse.Ok({}))));

export default function Private() {
  return (
    <PrivateLayout>
      <Outlet />
    </PrivateLayout>
  );
}
