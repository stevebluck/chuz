import { Outlet } from "@remix-run/react";
import { PrivateLayout } from "src/components/PrivateLayout";
import { Remix } from "src/server/Remix";
import { Session } from "src/server/Session";
import { Effect } from "@chuz/prelude";

export const loader = Remix.loader(Session.authenticated.pipe(Effect.map(() => null)));

export default function Private() {
  return (
    <PrivateLayout>
      <Outlet />
    </PrivateLayout>
  );
}
