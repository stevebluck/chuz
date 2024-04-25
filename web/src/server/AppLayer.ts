import { Config, Effect, Layer, LogLevel, Logger, Match, Secret } from "@chuz/prelude";
import { DevTools } from "@effect/experimental";
import { Auth } from ".";
import { PostgresConfig } from "./Database";
import * as Passwords from "./Passwords";
import { Users } from "./Users";
import * as Cookies from "./cookies/Cookies";

const IsDebug = Config.withDefault(Config.boolean("DEBUG"), false);

const IsProd = Config.map(Config.string("NODE_ENV"), (env) => env === "production");

const AppUrl = Config.withDefault(Config.string("APP_URL"), "http://localhost:5173");

const GoogleConfigLive = Auth.GoogleConfig.layer({
  clientId: Config.string("GOOGLE_CLIENT_ID"),
  clientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUrl: AppUrl,
});

const PostgresConfigLive = PostgresConfig.layer({ connectionString: Config.string("DATABASE_URL") });

const PasswordHasherConfigLive = Passwords.HasherConfig.layer({ N: Config.succeed(16384) });
const PasswordHasherConfigDev = Passwords.HasherConfig.layer({ N: Config.succeed(4) });

const AppCookiesConfigLive = Cookies.Config.layer({
  secure: IsProd,
  secrets: Config.array(Config.secret("COOKIE_SECRET")).pipe(Config.withDefault([Secret.fromString("chuzwozza")])),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const isDebug = yield* IsDebug;
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

const Configs = Layer.mergeAll(AppCookiesConfigLive, GoogleConfigLive, PasswordHasherConfigLive, LogLevelLive);

const Dev = Layer.mergeAll(Users.dev, Cookies.layer, Auth.Google.layer, Passwords.Hasher.layer).pipe(
  Layer.provide(Configs),
  Layer.provide(PasswordHasherConfigDev),
  Layer.provide(DevTools.layer()),
);

const Live = Layer.mergeAll(Users.dev, Cookies.layer, Auth.Google.layer, Passwords.Hasher.layer).pipe(
  Layer.provide(Configs),
  Layer.provide(PostgresConfigLive),
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
