import { ServerRequest, schemaHeaders } from "@effect/platform/Http/ServerRequest";
import { CookieOptions, createCookie as remixCreateCookie } from "@remix-run/node";
import { Config, ConfigError, Duration, Effect, Layer, Option, Secret } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { ResponseHeaders } from "./ResponseHeaders";
import { State, StateFromString } from "./internals/oauth";

interface AppCookies {
  token: CookieImpl<string>;
  returnTo: CookieImpl<string>;
  authState: CookieImpl<State>;
}

const CookieConfig = Config.all({
  secure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  secrets: Config.array(Config.secret("COOKIE_SECRET")).pipe(Config.withDefault([Secret.fromString("chuzwozza")])),
});

const make = Effect.gen(function* () {
  const { secure, secrets } = yield* CookieConfig;

  return {
    token: yield* createCookie("_token", S.String, {
      path: "/",
      maxAge: "365 days",
      secure,
      secrets,
    }),
    returnTo: yield* createCookie("_returnTo", S.String, {
      path: "/",
      maxAge: "60 minutes",
      secure,
      secrets,
    }),
    authState: yield* createCookie("_authState", StateFromString, {
      path: "/",
      maxAge: "60 minutes",
      secure,
      secrets,
    }),
  };
});

interface CookieImpl<T> {
  find: Effect.Effect<Option.Option<T>, never, ServerRequest>;
  set: (value: T) => Effect.Effect<Option.Option<string>, never, ResponseHeaders>;
  remove: Effect.Effect<Option.Option<string>, never, ServerRequest | ResponseHeaders>;
}

type CookieOpts = Omit<CookieOptions, "maxAge" | "secrets"> & {
  maxAge: Duration.DurationInput;
  secrets: ReadonlyArray<Secret.Secret>;
};

const createCookie = <T>(
  name: string,
  schema: S.Schema<T, string>,
  options: CookieOpts,
): Effect.Effect<CookieImpl<T>, ConfigError.ConfigError> =>
  Effect.gen(function* () {
    const cookie = remixCreateCookie(name, {
      ...options,
      maxAge: Duration.toSeconds(options?.maxAge || "30 days"),
      secrets: options.secrets.map(Secret.value),
    });

    const find = schemaHeaders(S.Struct({ cookie: S.String })).pipe(
      Effect.andThen((headers) => cookie.parse(headers.cookie)),
      Effect.flatMap(S.decode(schema)),
      Effect.option,
    );

    const set = (value: T) =>
      Effect.succeed(value).pipe(
        Effect.flatMap(S.encode(schema)),
        Effect.andThen((value) => cookie.serialize(value)),
        Effect.tap((cookie) => ResponseHeaders.append("Set-Cookie", cookie)),
        Effect.option,
      );

    const remove = find.pipe(
      Effect.andThen((value) => cookie.serialize(value, { maxAge: 0 })),
      Effect.tap((cookie) => ResponseHeaders.append("Set-Cookie", cookie)),
      Effect.option,
    );

    return {
      find,
      set,
      remove,
    };
  });

export class Cookies extends Effect.Tag("@web/Cookies")<Cookies, AppCookies>() {
  static layer = Layer.effect(Cookies, make);
}
