import { DevTools } from "@effect/experimental";
import { Config, Duration, Effect, Layer, LogLevel, Logger } from "effect";
import { PostgressConfig } from "./Database";
import { Middleware } from "./Middleware";
import { OAuth, OAuthConfig } from "./OAuth";
import { Remix } from "./Remix";
import { SessionStorage, SessionStorageConfig } from "./SessionStorage";
import { Sessions } from "./Sessions";
import { Users } from "./Users";

const debug = Config.withDefault(Config.boolean("DEBUG"), false);

const OAuthConfigLive = OAuthConfig.layer({
  googleClientId: Config.string("GOOGLE_CLIENT_ID"),
  googleClientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUri: Config.withDefault(Config.string("AUTH_CALLBACK_URL"), "http://localhost:5173/callback"),
});

const ProstregreConfigLive = PostgressConfig.layer({
  connectionString: Config.string("DATABASE_URL"),
});

const CookieSessionStorageConfigLive = SessionStorageConfig.layer({
  cookieSecure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  cookieName: Config.withDefault(Config.string("SESSION_COOKIE_NAME"), "_session"),
  cookieMaxAgeSeconds: Config.withDefault(
    Config.number("SESSION_COOKIE_DURATION_SECONDS"),
    Duration.toSeconds(Duration.days(365)),
  ),
});

const LogLevelLive = Layer.unwrapEffect(
  Effect.gen(function* (_) {
    const isDebug = yield* _(debug);
    const level = isDebug ? LogLevel.All : LogLevel.Info;
    return Logger.minimumLogLevel(level);
  }),
);

namespace AppLayer {
  export const dev = Layer.mergeAll(Users.dev, SessionStorage.layer, OAuth.live).pipe(
    Layer.provide(OAuthConfigLive),
    Layer.provide(CookieSessionStorageConfigLive),
    Layer.provide(LogLevelLive),
    Layer.provide(DevTools.layer()),
  );
  export const live = Layer.mergeAll(Users.live, SessionStorage.layer, OAuth.live).pipe(
    Layer.provide(OAuthConfigLive),
    Layer.provide(ProstregreConfigLive),
    Layer.provide(LogLevelLive),
    Layer.provide(CookieSessionStorageConfigLive),
    Layer.provide(DevTools.layer()),
  );
}

export const App = await Remix.make({
  layer: AppLayer.dev,
  requestLayer: Sessions.layer,
  middleware: Middleware.setSessionCookie,
});
