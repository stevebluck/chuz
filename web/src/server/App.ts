import { DevTools } from "@effect/experimental";
import { Config, Duration, Effect, Layer, LogLevel, Logger } from "effect";
import { SupabaseConfig } from "./Auth";
import { PostgressConfig } from "./Database";
import { Middleware } from "./Middleware";
import { Remix } from "./Remix";
import { SessionStorage, SessionStorageConfig } from "./SessionStorage";
import { Sessions } from "./Sessions";
import { SupabaseUsersConfig, Users } from "./Users";

const SupbabaseConfigLive = SupabaseConfig.layer({
  url: Config.string("SUPABASE_URL"),
  serviceKey: Config.string("SUPABASE_SERVICE_KEY"),
});

const ProstregreConfigLive = PostgressConfig.layer({
  connectionString: Config.string("DATABASE_URL"),
});

const SupabaseUsersConfigLive = SupabaseUsersConfig.layer({
  callbackUrl: Config.withDefault(Config.string("AUTH_CALLBACK_URL"), "http://localhost:3000/authenticate"),
});

const CookieSessionStorageConfigLive = SessionStorageConfig.layer({
  cookieSecure: Config.string("NODE_ENV").pipe(Config.map((env) => env === "production")),
  cookieName: Config.withDefault(Config.string("SESSION_COOKIE_NAME"), "_session"),
  cookieMaxAgeSeconds: Config.withDefault(
    Config.number("SESSION_COOKIE_DURATION_SECONDS"),
    Duration.toSeconds(Duration.days(365)),
  ),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    const debug = yield* _(Config.withDefault(Config.boolean("DEBUG"), false));
    const level = debug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

namespace AppLayer {
  export const dev = Layer.mergeAll(Users.dev, SessionStorage.layer).pipe(
    Layer.provide(CookieSessionStorageConfigLive),
    Layer.provide(LogLevelLive),
    Layer.provide(DevTools.layer()),
  );

  export const live = Layer.mergeAll(Users.live, SessionStorage.layer).pipe(
    Layer.provide(SupbabaseConfigLive),
    Layer.provide(ProstregreConfigLive),
    Layer.provide(SupabaseUsersConfigLive),
    Layer.provide(LogLevelLive),
    Layer.provide(CookieSessionStorageConfigLive),
    Layer.provide(DevTools.layer()),
  );
}

export const App = await Remix.make({
  layer: AppLayer.live,
  requestLayer: Sessions.layer,
  middleware: Middleware.setSessionCookie,
});
