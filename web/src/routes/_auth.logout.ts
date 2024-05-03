import { Users } from "@chuz/core";
import { Effect } from "@chuz/prelude";
import { Routes } from "src/Routes";
import * as Remix from "src/server/Remix";
import { redirect } from "src/server/ServerResponse";
import { Session } from "src/server/Session";

export const action = Remix.action(
  Session.authenticated.pipe(
    Effect.zipLeft(Session.invalidate),
    Effect.flatMap(({ token }) => Users.pipe(Effect.flatMap((users) => users.logout(token)))),
    Effect.flatMap(() => redirect(Routes.home)),
    Effect.catchTags({ Unauthorised: () => redirect(Routes.login) }),
  ),
);
