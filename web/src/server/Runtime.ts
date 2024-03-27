import { Token, User } from "@chuz/domain";
import { Config, Effect, Layer, LogLevel, Logger, Match, Ref, Secret } from "@chuz/prelude";
import { DevTools } from "@effect/experimental";
import { BodyError } from "@effect/platform/Http/Body";
import { ServerRequest } from "@effect/platform/Http/ServerRequest";
import * as Http from "@effect/platform/HttpServer";
import { ServerResponse } from ".";
import { PostgresConfig } from "./Database";
import { PasswordHasher, PasswordHasherConfig } from "./Passwords";
import { RequestSession, Session } from "./Sessions";
import { Users } from "./Users";
import { Auth } from "./auth/Auth";
import { GoogleSocialAuthConfig } from "./auth/GoogleSocialAuth";
import { AppCookies, AppCookiesConfig } from "./cookies/AppCookies";

const IsDebug = Config.withDefault(Config.boolean("DEBUG"), false);

const IsProduction = Config.map(Config.string("NODE_ENV"), (env) => env === "production");

const GoogleSocialAuthConfigLive = GoogleSocialAuthConfig.layer({
  clientId: Config.string("GOOGLE_CLIENT_ID"),
  clientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUri: Config.string("AUTH_CALLBACK_URL").pipe(Config.withDefault("http://localhost:5173/login?_tag=google")),
});

const PostgresConfigLive = PostgresConfig.layer({ connectionString: Config.string("DATABASE_URL") });

const PasswordHasherConfigLive = PasswordHasherConfig.layer({ N: Config.succeed(16384) });
const PasswordHasherConfigDev = PasswordHasherConfig.layer({ N: Config.succeed(4) });

const AppCookiesConfigLive = AppCookiesConfig.layer({
  secure: IsProduction,
  secrets: Config.array(Config.secret("COOKIE_SECRET")).pipe(Config.withDefault([Secret.fromString("chuzwozza")])),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    const isDebug = yield* _(IsDebug);
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

const Configs = Layer.mergeAll(
  AppCookiesConfigLive,
  GoogleSocialAuthConfigLive,
  PasswordHasherConfigLive,
  LogLevelLive,
);

const Dev = Layer.mergeAll(Users.dev, Auth.layer, AppCookies.layer, PasswordHasher.layer).pipe(
  Layer.provide(Configs),
  Layer.provide(PasswordHasherConfigDev),
  Layer.provide(DevTools.layer()),
);

const Live = Layer.mergeAll(Users.live, Auth.layer, AppCookies.layer, PasswordHasher.layer).pipe(
  Layer.provide(Configs),
  Layer.provide(PostgresConfigLive),
);

const Sessions = Layer.effect(
  Session,
  AppCookies.token.pipe(
    Effect.flatMap((token) => token.read),
    Effect.map((token) => Token.make<User.Id>(token)),
    Effect.flatMap(Users.identify),
    Effect.map((session) => RequestSession.Provided({ session })),
    Effect.orElseSucceed(() => RequestSession.NotProvided()),
    Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
    Effect.map(Session.make),
  ),
);

type AppMode = Effect.Effect.Success<typeof AppMode>;
const AppMode = Config.literal("live", "dev")("APP_MODE").pipe(Config.withDefault("dev" as const));

export const AppLayer = Layer.unwrapEffect(
  Effect.map(
    AppMode,
    Match.type<AppMode>().pipe(
      Match.when("live", () => Live),
      Match.when("dev", () => Dev),
      Match.exhaustive,
    ),
  ),
);

export const RequestLayer = Sessions;

export const middleware = <E, R>(
  self: Effect.Effect<Http.response.ServerResponse, BodyError, R>,
): Effect.Effect<Http.response.ServerResponse, E, R | AppCookies | Session | ServerRequest> =>
  Effect.gen(function* (_) {
    const cookie = yield* _(AppCookies.token);

    const response = yield* _(self);

    const requestSession = yield* _(Session.get);

    return yield* _(
      requestSession,
      RequestSession.match({
        Set: ({ session }) => cookie.save(session.token.value)(response),
        Unset: () => cookie.remove(response),
        InvalidToken: () => cookie.remove(response),
        NotProvided: () => Effect.succeed(response),
        Provided: () => Effect.succeed(response),
      }),
    );
  }).pipe(
    Effect.catchTags({
      CookieError: (e) => ServerResponse.ServerError(`Something went wrong with setting a cookie: ${e.reason}`),
    }),
    Effect.catchTags({ BodyError: (e) => Effect.die(e) }),
    Effect.tapErrorCause(Effect.logError),
  );
