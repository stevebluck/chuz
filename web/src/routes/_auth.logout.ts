import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Users } from "src/server/App";
import { Redirect } from "src/server/Response";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

export const action = Runtime.action(
  "Auth.logout",
  Sessions.authenticated.pipe(
    Effect.tap(Sessions.invalidate),
    Effect.flatMap(({ token }) => Users.logout(token)),
    Effect.zipRight(Redirect.make(Routes.home)),
    Effect.catchTags({ Unauthorised: () => Effect.unit }),
  ),
);
