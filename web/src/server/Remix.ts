import { Id, Token, User } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { Config, Duration, Effect, Layer, LogLevel, Logger, Option, Ref } from "effect";
import { pretty } from "effect/Cause";
import { PostgresConfig } from "./Database";
import { OAuth, OAuthConfig } from "./OAuth";
import { Runtime } from "./Runtime";
import { ServerResponse } from "./ServerResponse";
import { RequestSession, Session } from "./Sessions";
import { Users } from "./Users";
import { TokenCookie, TokenCookieConfig } from "./cookies/TokenCookie";

const debug = Config.withDefault(Config.boolean("DEBUG"), false);

const mode = Config.withDefault(Config.literal("dev", "live")("APP_MODE"), "dev" as const);

const OAuthConfigLive = OAuthConfig.layer({
  googleClientId: Config.string("GOOGLE_CLIENT_ID"),
  googleClientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUri: Config.withDefault(Config.string("AUTH_CALLBACK_URL"), "http://localhost:5173/callback"),
});

const ProstresConfigLive = PostgresConfig.layer({
  connectionString: Config.string("DATABASE_URL"),
});

const TokenCookieConfigLive = TokenCookieConfig.layer({
  secure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  name: Config.withDefault(Config.string("SESSION_COOKIE_NAME"), "_session"),
  maxAge: Config.withDefault(Config.number("SESSION_COOKIE_DURATION_SECONDS"), Duration.toSeconds(Duration.days(365))),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    const isDebug = yield* _(debug);
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

const Dev = Layer.mergeAll(Users.dev, OAuth.layer, TokenCookie.layer).pipe(
  Layer.provide(TokenCookieConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(LogLevelLive),
  Layer.provide(DevTools.layer()),
);

const Live = Layer.mergeAll(Users.live, OAuth.layer, TokenCookie.layer).pipe(
  Layer.provide(TokenCookieConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(ProstresConfigLive),
  Layer.provide(LogLevelLive),
);

// TODO move to the schema definition so don't need to new up a token
const Sessions = Layer.effect(
  Session,
  TokenCookie.parse.pipe(
    Effect.map((token) => Token.make<Id<User>>(token)),
    Effect.flatMap(Users.identify),
    Effect.map((session) => RequestSession.Provided({ session })),
    Effect.orElseSucceed(() => RequestSession.NotProvided()),
    Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
    Effect.map(Session.make),
  ),
);

export const Remix = await Runtime.make({
  layer: Layer.unwrapEffect(mode.pipe(Effect.map((mode) => (mode === "dev" ? Dev : Live)))),
  requestLayer: Sessions,
  interpreter: (self) => {
    return Effect.flatMap(self, (response) =>
      Effect.gen(function* (_) {
        const cookie = yield* _(TokenCookie);

        const requestSession = yield* _(Session.get);

        return yield* _(
          requestSession,
          RequestSession.match({
            Set: ({ session }) => ServerResponse.setCookie(cookie, Option.some(session.token.value))(response),
            Unset: () => ServerResponse.setCookie(cookie, Option.none())(response),
            InvalidToken: () => ServerResponse.setCookie(cookie, Option.none())(response),
            NotProvided: () => Effect.succeed(response),
            Provided: () => Effect.succeed(response),
          }),
        );
      }),
    ).pipe(Effect.tapDefect((cause) => Effect.logError(pretty(cause))));
  },
});
