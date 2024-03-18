import * as Http from "@effect/platform/HttpServer";
import { RequestSession } from "core/index";
import { Effect, Layer } from "effect";
import { App } from "./App";
import { CookieSessionStorage } from "./CookieSessionStorage";
import { Remix } from "./Remix";
import { Sessions } from "./Sessions";

export const Runtime = await Remix.make({
  layer: App.Live,
  requestLayer: Sessions.layer.pipe(Layer.provideMerge(CookieSessionStorage.layer)),
  middleware: (self) => self.pipe(Effect.flatMap(setSessionCookie)),
});

const setSessionCookie = (
  res: Http.response.ServerResponse,
): Effect.Effect<Http.response.ServerResponse, never, Sessions | CookieSessionStorage> =>
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
  );
