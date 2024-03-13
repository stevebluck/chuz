import { Capabilities, Sessions } from "@chuz/core";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Redirect } from "src/server/Redirect";
import { RemixServer } from "src/server/Remix.server";

export const action = RemixServer.action(
  "Logout",
  Effect.all({ capabilities: Capabilities, sessions: Sessions }).pipe(
    Effect.flatMap(({ capabilities: { users }, sessions }) =>
      sessions.authenticated.pipe(
        Effect.tap(sessions.invalidate),
        Effect.flatMap((session) => users.logout(session.token)),
        Effect.flatMap(() => Redirect.make(Routes.home)),
        Effect.catchTags({ Unauthorised: () => Effect.unit }),
      ),
    ),
  ),
);
