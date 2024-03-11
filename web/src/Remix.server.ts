import { User, UserSession } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as ParseResult from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { RequestSession, Sessions, UserSessions } from "core/index";
import { Console, Effect, Layer, Option, ReadonlyRecord } from "effect";
import { Cookie } from "./Cookies";
import { Remix } from "./Remix";
import { Runtime } from "./Runtime";

const SESSION_COOKIE = "_session";

export const RemixServer = Remix.make({
  layer: Runtime.Dev,
  requestLayer: Layer.suspend(() => SessionsLive),
  middleware: (self) => Effect.flatMap(self, setSessionCookie),
});

const setSessionCookie = (
  res: Http.response.ServerResponse,
): Effect.Effect<Http.response.ServerResponse, never, Sessions<User>> =>
  Sessions.pipe(
    Effect.flatMap((sessions) => sessions.get),
    Effect.flatMap(Cookie.fromRequestSession),
    Effect.map(
      Option.match({
        onNone: () => res,
        onSome: (cookie) => Http.response.setHeader(res, "Set-Cookie", cookie),
      }),
    ),
  );

const AuthenticatedHeaders = S.struct({ cookie: S.string });

const SessionFromCookie = S.transformOrFail(
  S.string,
  UserSession,
  (cookie) =>
    Cookie.parse(cookie).pipe(
      Effect.flatMap(ReadonlyRecord.get(SESSION_COOKIE)),
      Effect.flatMap(UserSession.fromString),
      Effect.catchTags({
        ParseError: (error) => Effect.fail(error.error),
        NoSuchElementException: (error) => Effect.fail(ParseResult.type(S.string.ast, cookie, error.message)),
      }),
    ),
  (session) =>
    ParseResult.fail(ParseResult.forbidden(UserSession.ast, session, "Cannot encode headers from a session")),
);

const SessionsLive: Layer.Layer<Sessions<User>, never, Http.request.ServerRequest> = Layer.effect(
  Sessions,
  Http.request.schemaHeaders(AuthenticatedHeaders).pipe(
    Effect.tap(Console.log),
    Effect.map((headers) => headers.cookie),
    Effect.flatMap(S.decode(SessionFromCookie)),
    Effect.flatMap((session) => UserSessions.make(RequestSession.Provided({ session }))),
    Effect.catchAll(() => UserSessions.make(RequestSession.NotProvided())),
  ),
);
