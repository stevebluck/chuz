import * as Http from "@effect/platform/HttpServer";
import { RequestSession } from "core/index";
import { Effect } from "effect";
import { CookieSessionStorage } from "./CookieSessionStorage";
import { Sessions } from "./Sessions";

export namespace Middleware {
  export const setSessionCookie = <E, R>(
    self: Effect.Effect<Http.response.ServerResponse, E, R>,
  ): Effect.Effect<Http.response.ServerResponse, E, Sessions | CookieSessionStorage | R> =>
    Effect.flatMap(self, (res) =>
      Sessions.get.pipe(
        Effect.flatMap(
          RequestSession.makeMatcher({
            Set: ({ session }) => CookieSessionStorage.commit(session),
            Unset: ({ session }) => CookieSessionStorage.destroy(session),
            InvalidToken: ({ session }) => CookieSessionStorage.destroy(session),
            NotProvided: () => Effect.fail(res),
            Provided: () => Effect.fail(res),
          }),
        ),
        Effect.flatMap((cookie) => Http.response.setHeader(res, "Set-Cookie", cookie)),
        Effect.merge,
      ),
    );
}
