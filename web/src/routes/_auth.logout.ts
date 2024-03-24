import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Users, Remix, Session, ServerResponse } from "src/server";

export const action = Remix.action(
  Session.authenticated.pipe(
    Effect.zipLeft(Session.invalidate),
    Effect.flatMap(({ token }) => Users.logout(token)),
    Effect.flatMap(() => ServerResponse.Redirect(Routes.home)),
    Effect.catchTags({ Unauthorised: () => ServerResponse.Redirect(Routes.home) }),
  ),
);
