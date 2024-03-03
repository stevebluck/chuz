import { RequestSession, Sessions } from "@chuz/core/src/Sessions";
import { User, UserSession } from "@chuz/domain";
import * as cookie from "cookie";
import { Duration, Effect } from "effect";
import { Response } from "../Response";

// TODO: Make cookies service

export const setRequestHeaders = <A, R>(
  headers: Headers,
  self: Effect.Effect<A, Response.Fail, Sessions<User> | R>,
): Effect.Effect<A, Response.Fail, Sessions<User> | R> =>
  Effect.gen(function* (_) {
    const sessions = yield* _(Sessions);

    const makeHeaders = Effect.gen(function* (_) {
      const requestSession = yield* _(sessions.get);
      const match = RequestSession.makeMatcher({
        InvalidToken: () => headers.set("Set-Cookie", cookie.serialize("session", "", { maxAge: -1, path: "/" })),
        NotProvided: () => {},
        Provided: () => {},
        Set: ({ session }) =>
          headers.set(
            "Set-Cookie",
            cookie.serialize("session", UserSession.toString(session), {
              maxAge: Duration.toSeconds(Duration.weeks(2)),
              path: "/",
            }),
          ),
        Unset: () => headers.set("Set-Cookie", cookie.serialize("session", "", { maxAge: -1, path: "/" })),
      });

      match(requestSession);

      return headers;
    });

    return yield* _(
      self,
      Effect.tapBoth({
        onFailure: (e) => makeHeaders,
        onSuccess: () => makeHeaders,
      }),
    );
  });
