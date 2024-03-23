import * as Http from "@effect/platform/HttpServer";
import { Effect, Option } from "effect";
import { RequestState } from "./RequestState/RequestState";
import { RequestSession, Sessions } from "./Sessions";

export namespace Middleware {
  export const setCookies = <E, R>(
    self: Effect.Effect<Http.response.ServerResponse, E, R>,
  ): Effect.Effect<Http.response.ServerResponse, E, Sessions | RequestState | R> =>
    Effect.flatMap(self, (res) => {
      return Sessions.get.pipe(
        Effect.tap(setToken),
        Effect.flatMap(() => RequestState.commit),
        Effect.flatMap((cookie) => Http.response.setHeader(res, "Set-Cookie", cookie)),
        Effect.merge,
      );
    });
}

const setToken = RequestSession.match({
  Set: ({ session }) => RequestState.set("token", Option.some(session.token.value)),
  Unset: () => RequestState.set("token", Option.none()),
  InvalidToken: () => RequestState.set("token", Option.none()),
  NotProvided: () => Effect.unit,
  Provided: () => Effect.unit,
});
