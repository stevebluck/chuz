import { Id, Token, User } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { ServerRequest } from "@effect/platform/Http/ServerRequest";
import * as Http from "@effect/platform/HttpServer";
import { Config, Duration, Effect, Layer, LogLevel, Logger, Ref } from "effect";
import { PostgresConfig } from "./Database";
import { OAuth, OAuthConfig } from "./OAuth";
import { PasswordHasher, PasswordHasherConfig } from "./Passwords";
import { Remix } from "./Remix";
import { RequestSession, Session } from "./Sessions";
import { Users } from "./Users";
import { TokenCookie, TokenCookieConfig } from "./cookies/TokenCookie";

const debug = Config.withDefault(Config.boolean("DEBUG"), false);

const mode = Config.withDefault(Config.literal("dev", "live")("APP_MODE"), "dev" as const);

const OAuthConfigLive = OAuthConfig.layer({
  googleClientId: Config.string("GOOGLE_CLIENT_ID"),
  googleClientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUri: Config.withDefault(Config.string("AUTH_CALLBACK_URL"), "http://localhost:5173/login"),
});

const ProstresConfigLive = PostgresConfig.layer({
  connectionString: Config.string("DATABASE_URL"),
});

const PasswordsConfigLive = PasswordHasherConfig.layer({
  N: Config.succeed(16384),
});

const PasswordsConfigDev = PasswordHasherConfig.layer({
  N: Config.succeed(4),
});

const TokenCookieConfigLive = TokenCookieConfig.layer({
  secure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  name: Config.withDefault(Config.string("SESSION_COOKIE_NAME"), "_session"),
  maxAge: Config.withDefault(Config.number("SESSION_COOKIE_DURATION_MILLIS"), Duration.toMillis("365 days")),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    const isDebug = yield* _(debug);
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

const Dev = Layer.mergeAll(Users.dev, OAuth.layer, TokenCookie.layer, PasswordHasher.layer).pipe(
  Layer.provide(TokenCookieConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(PasswordsConfigDev),
  Layer.provide(LogLevelLive),
  Layer.provide(DevTools.layer()),
);

const Live = Layer.mergeAll(Users.live, OAuth.layer, TokenCookie.layer, PasswordHasher.layer).pipe(
  Layer.provide(TokenCookieConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(PasswordsConfigLive),
  Layer.provide(ProstresConfigLive),
  Layer.provide(LogLevelLive),
);

// TODO move to the schema definition so don't need to new up a token
const Sessions = Layer.effect(
  Session,
  TokenCookie.read.pipe(
    Effect.map((token) => Token.make<Id<User>>(token)),
    Effect.flatMap(Users.identify),
    Effect.map((session) => RequestSession.Provided({ session })),
    Effect.orElseSucceed(() => RequestSession.NotProvided()),
    Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
    Effect.map(Session.make),
  ),
);

export const AppLayer = Layer.unwrapEffect(mode.pipe(Effect.map((mode) => (mode === "dev" ? Dev : Live))));

export const RequestLayer = Sessions;

export const middleware = <E, R>(
  self: Effect.Effect<Http.response.ServerResponse, E, R>,
): Effect.Effect<Http.response.ServerResponse, E, R | TokenCookie | Session | ServerRequest> =>
  Effect.gen(function* (_) {
    const cookie = yield* _(TokenCookie);

    const requestSession = yield* _(Session.get);

    const response = yield* _(self);

    return yield* _(
      requestSession,
      RequestSession.match({
        Set: ({ session }) => cookie.save(session.token.value)(response),
        Unset: () => cookie.remove(response),
        InvalidToken: () => cookie.remove(response),
        NotProvided: () => Effect.succeed(response),
        Provided: () => Effect.succeed(response),
      }),

      Effect.catchTag("CookieError", () => response),
    );
  }).pipe(Effect.tapErrorCause(Effect.logError));
