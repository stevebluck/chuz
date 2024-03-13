import { Id, Session, Token, User } from "@chuz/domain";
import { createCookieSessionStorage, createSession } from "@remix-run/node";
import { Duration, Effect, Layer, Option } from "effect";
import { NoSuchElementException } from "effect/Cause";

// config
const SESSION_COOKIE = "_session";
const SESSION_COOKIE_DURATION = Duration.weeks(2);

type CookieSession = {
  token: Token<Id<User>>;
};

type CookieSessionFlashData = {
  error: string;
};

export class CookieSessionStorage extends Effect.Tag("CookieSessionStorage")<
  CookieSessionStorage,
  {
    getToken: (cookieHeader: string) => Effect.Effect<Token<Id<User>>, NoSuchElementException>;
    commit: (session: Session<User>) => Effect.Effect<string>;
    destroy: (session: Session<User>) => Effect.Effect<string>;
    unsetToken: (session: Session<User>) => Effect.Effect<string>;
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
      Effect.sync(() => createSession<CookieSession, CookieSessionFlashData>({ token: session.token }, SESSION_COOKIE));

    return CookieSessionStorage.of({
      getToken: (cookieHeader) =>
        Effect.promise(() => storage.getSession(cookieHeader)).pipe(
          Effect.flatMap((a) => Option.fromNullable(a.get("token"))),
          Effect.map((a) => Token.make(a.value)),
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
      unsetToken: (session) =>
        createRemixSession(session).pipe(
          Effect.tap((remixSession) => remixSession.unset("token")),
          Effect.andThen((remixSession) => storage.commitSession(remixSession)),
          Effect.orDie,
        ),
    });
  });
}
