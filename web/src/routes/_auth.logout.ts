import { Effect } from "@chuz/prelude";
import { Users } from "core/index";
import { Routes } from "src/Routes";
import * as Remix from "src/server/Remix";
import { Http, Session } from "src/server/prelude";

export const action = Remix.action(
  Session.authenticated.pipe(
    Effect.zipLeft(Session.invalidate),
    Effect.flatMap(({ token }) => Users.pipe(Effect.flatMap((users) => users.logout(token)))),
    Effect.flatMap(() => Http.response.redirect(Routes.home)),
    Effect.catchTags({ Unauthorised: () => Http.response.redirect(Routes.login) }),
  ),
);
