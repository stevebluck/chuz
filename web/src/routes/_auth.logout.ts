import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Users, App, Sessions, Redirect } from "src/server";

export const action = App.action(
  "Auth.logout",
  Sessions.authenticated.pipe(
    Effect.tap(Sessions.invalidate),
    Effect.flatMap(({ token }) => Users.logout(token)),
    // TODO: change to Response.redirect()
    Effect.zipRight(Redirect.make(Routes.home)),
    Effect.catchTags({ Unauthorised: () => Effect.unit }),
  ),
);
