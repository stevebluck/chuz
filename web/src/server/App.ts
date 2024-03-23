import { DevTools } from "@effect/experimental";
import { Config, Duration, Effect, Layer, LogLevel, Logger } from "effect";
import { PostgresConfig } from "./Database";
import { Middleware } from "./Middleware";
import { OAuth, OAuthConfig } from "./OAuth";
import { Remix } from "./Remix";
import { CookieRequestState, CookieRequestStateConfig } from "./RequestState/CookieRequestState";
import { Sessions } from "./Sessions";
import { Users } from "./Users";

const debug = Config.withDefault(Config.boolean("DEBUG"), false);

const OAuthConfigLive = OAuthConfig.layer({
  googleClientId: Config.string("GOOGLE_CLIENT_ID"),
  googleClientSecret: Config.string("GOOGLE_CLIENT_SECRET"),
  redirectUri: Config.withDefault(Config.string("AUTH_CALLBACK_URL"), "http://localhost:5173/callback"),
});

const ProstresConfigLive = PostgresConfig.layer({
  connectionString: Config.string("DATABASE_URL"),
});

const CookieRequestStateConfigLive = CookieRequestStateConfig.layer({
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

export const Dev = Layer.mergeAll(Users.dev, OAuth.live).pipe(
  Layer.provideMerge(CookieRequestStateConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(LogLevelLive),
  Layer.provide(DevTools.layer()),
);

export const Live = Layer.mergeAll(Users.live, OAuth.live).pipe(
  Layer.provideMerge(CookieRequestStateConfigLive),
  Layer.provide(OAuthConfigLive),
  Layer.provide(ProstresConfigLive),
  Layer.provide(LogLevelLive),
);

export const App = await Remix.make({
  layer: Dev,
  requestLayer: Sessions.layer.pipe(Layer.provideMerge(CookieRequestState.layer)),
  middleware: Middleware.setCookies,
});
