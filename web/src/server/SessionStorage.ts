import { Id, Session, Token, User } from "@chuz/domain";
import * as Http from "@effect/platform/HttpServer";
import * as S from "@effect/schema/Schema";
import { createCookieSessionStorage, createSession } from "@remix-run/node";
import { Cause, Context, Effect, Layer, Option } from "effect";
import { LayerUtils } from "./LayerUtils";

interface CookieSession {
  token: Token<Id<User>>;
}

interface CookieSessionFlashData {
  error: string;
}

interface Config {
  cookieName: string;
  cookieMaxAgeSeconds: number;
  cookieSecure: boolean;
}

const CookieSessionStorage = (config: Config) =>
  Effect.gen(function* (_) {
    const storage = createCookieSessionStorage<CookieSession, CookieSessionFlashData>({
      cookie: {
        name: config.cookieName,
        secrets: ["test"],
        isSigned: true,
        secure: config.cookieSecure,
        path: "/",
        sameSite: "lax",
        maxAge: config.cookieMaxAgeSeconds,
        httpOnly: true,
      },
    });

    const createRemixSession = (session: Session<User>) =>
      Effect.sync(() =>
        createSession<CookieSession, CookieSessionFlashData>({ token: session.token }, config.cookieName),
      );

    return SessionStorage.of({
      getToken: Http.request.schemaHeaders(S.struct({ cookie: S.string })).pipe(
        Effect.andThen(({ cookie }) => storage.getSession(cookie)),
        Effect.flatMap((session) => Option.fromNullable(session.get("token"))),
        // TODO: Make a proper schema for phantom types
        Effect.map((token) => Token.make<Id<User>>(token.value)),
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

export class SessionStorageConfig extends Context.Tag("@app/SessionStorageConfig")<SessionStorageConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class SessionStorage extends Effect.Tag("@app/SessionStorage")<
  SessionStorage,
  {
    getToken: Effect.Effect<Token<Id<User>>, Cause.NoSuchElementException, Http.request.ServerRequest>;
    commit: (session: Session<User>) => Effect.Effect<string>;
    destroy: (session: Session<User>) => Effect.Effect<string>;
  }
>() {
  static layer = Layer.effect(SessionStorage, SessionStorageConfig.pipe(Effect.flatMap(CookieSessionStorage)));
}
