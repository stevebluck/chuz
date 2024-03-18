import { Id, Session, Token, User } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import { createCookieSessionStorage, createSession } from "@remix-run/node";
import { Cause, Duration, Effect, Layer, Option } from "effect";

// config
const SESSION_COOKIE = "_session";
const SESSION_COOKIE_DURATION = Duration.weeks(2);

type CookieSession = {
  refreshToken: Token<Id<User>>;
};

type CookieSessionFlashData = {
  error: string;
};

export class CookieSessionStorage extends Effect.Tag("@app/CookieSessionStorage")<
  CookieSessionStorage,
  {
    getToken: Effect.Effect<Token<Id<User>>, Cause.NoSuchElementException, Http.request.ServerRequest>;
    commit: (session: Session<User>) => Effect.Effect<string>;
    destroy: (session: Session<User>) => Effect.Effect<string>;
  }
>() {
  static layer = Layer.sync(CookieSessionStorage, () => {
    const storage = createCookieSessionStorage<CookieSession, CookieSessionFlashData>({
      cookie: {
        name: SESSION_COOKIE,
        secrets: ["test"],
        isSigned: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: Duration.toSeconds(SESSION_COOKIE_DURATION),
        httpOnly: true,
      },
    });

    const createRemixSession = (session: Session<User>) =>
      Effect.sync(() =>
        createSession<CookieSession, CookieSessionFlashData>({ refreshToken: session.token }, SESSION_COOKIE),
      );

    return CookieSessionStorage.of({
      getToken: Http.request.schemaHeaders(S.struct({ cookie: S.string })).pipe(
        Effect.andThen(({ cookie }) => storage.getSession(cookie)),
        Effect.flatMap((session) => Option.fromNullable(session.get("refreshToken"))),
        Effect.catchAll(() => Option.none()),
      ),
      commit: (session) =>
        createRemixSession(session).pipe(
          Effect.andThen((remixSession) => storage.commitSession(remixSession)),
          Effect.orDie,
        ),
      destroy: (session) =>
        createRemixSession(session).pipe(
          Effect.andThen((remixSession) => storage.destroySession(remixSession)),
          Effect.orDie,
        ),
    });
  });
}
