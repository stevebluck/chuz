import { User } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import { Capabilities, RequestSession, Sessions, UserSessions } from "core/index";
import { Effect, Layer } from "effect";
import { App } from "./App";
import { CookieSessionStorage } from "./CookieSessionStorage";
import { Remix } from "./Remix";

export const RemixServer = await Remix.make({
  layer: App.Dev,
  requestLayer: Layer.suspend(() => SessionsLive.pipe(Layer.provideMerge(CookieSessionStorage.layer))),
  middleware: (self) => self.pipe(Effect.flatMap(setSessionCookie)),
});

const setSessionCookie = (
  res: Http.response.ServerResponse,
): Effect.Effect<Http.response.ServerResponse, never, Sessions<User> | CookieSessionStorage> =>
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.get),
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
    Effect.orElseSucceed(() => res),
  );

const SessionsLive: Layer.Layer<
  Sessions<User>,
  never,
  Http.request.ServerRequest | Capabilities | CookieSessionStorage
> = Layer.effect(
  Sessions,
  Http.request.schemaHeaders(S.struct({ cookie: S.string })).pipe(
    Effect.flatMap((headers) => CookieSessionStorage.getToken(headers.cookie)),
    Effect.flatMap((token) => Capabilities.pipe(Effect.flatMap(({ users }) => users.identify(token)))),
    Effect.map((session) => RequestSession.Provided({ session })),
    Effect.mapError(() => RequestSession.NotProvided()),
    Effect.merge,
    Effect.flatMap(UserSessions.make),
  ),
);
