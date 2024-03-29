import { Effect } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { Http, Session, Users } from "src/server";
import * as Remix from "src/server/Remix";

export const action = Remix.action(
  Session.authenticated.pipe(
    Effect.zipLeft(Session.invalidate),
    Effect.flatMap(({ token }) => Users.logout(token)),
    Effect.flatMap(() => Http.response.redirect(Routes.home)),
    Effect.catchTags({ Unauthorised: () => Http.response.redirect(Routes.login) }),
  ),
);
