import { Id, Session, Token, User } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import { createCookieSessionStorage, createSession } from "@remix-run/node";
import { Cause, Context, Duration, Effect, Layer, Option } from "effect";
import { LayerUtils } from "./LayerUtils";

type CookieSession = {
  token: Token<Id<User>>;
  refreshToken: Token<string>;
};

type CookieSessionFlashData = {
  error: string;
};

interface Config {
  cookieName: string;
  cookieMaxAgeSeconds: number;
}

const make = (config: Config) =>
  Effect.gen(function* (_) {
    const storage = createCookieSessionStorage<CookieSession, CookieSessionFlashData>({
      cookie: {
        name: config.cookieName,
        secrets: ["test"],
        isSigned: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: "lax",
        maxAge: config.cookieMaxAgeSeconds,
        httpOnly: true,
      },
    });

    const createRemixSession = (session: Session<User>) =>
      Effect.sync(() =>
        createSession<CookieSession, CookieSessionFlashData>(
          { refreshToken: session.refreshToken, token: session.token },
          config.cookieName,
        ),
      );

    return CookieSessionStorage.of({
      get: Http.request.schemaHeaders(S.struct({ cookie: S.string })).pipe(
        Effect.andThen(({ cookie }) => storage.getSession(cookie)),
        Effect.bind("refreshToken", (session) => Option.fromNullable(session.get("refreshToken"))),
        Effect.bind("token", (session) => Option.fromNullable(session.get("token"))),
        Effect.catchAll(() => Option.none()),
      ),
      commit: (session) =>
        createRemixSession(session).pipe(
          // TODO: check cookie limit, maybe need to set two separate cookies
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

export class CookieSessionStorageConfig extends Context.Tag("@app/CookieSessionStorageConfig")<
  CookieSessionStorageConfig,
  Config
>() {
  static layer = LayerUtils.config(this);
}

export class CookieSessionStorage extends Effect.Tag("@app/CookieSessionStorage")<
  CookieSessionStorage,
  {
    get: Effect.Effect<CookieSession, Cause.NoSuchElementException, Http.request.ServerRequest>;
    commit: (session: Session<User>) => Effect.Effect<string>;
    destroy: (session: Session<User>) => Effect.Effect<string>;
  }
>() {
  static layer = Layer.effect(CookieSessionStorage, CookieSessionStorageConfig.pipe(Effect.flatMap(make)));
}
