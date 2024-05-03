import { Config, ConfigError, Console, Data, Effect, Layer, Secret } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Cookie as HttpCookie } from "@effect/platform/Http/Cookies";
import * as Http from "@effect/platform/HttpServer";
import { createHmac, timingSafeEqual } from "crypto";
import { State, StateFromString } from "./internals/oauth";

const CookieConfig = Config.all({
  secure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  secrets: Config.array(Config.secret("COOKIE_SECRET")).pipe(Config.withDefault([Secret.fromString("chuzwozza")])),
});

interface Cookie<A> {
  read: Effect.Effect<A, CookieNotPresent, Http.request.ServerRequest>;
  set: (value: A) => (res: Http.response.ServerResponse) => Effect.Effect<Http.response.ServerResponse>;
  remove: (
    res: Http.response.ServerResponse,
  ) => Effect.Effect<Http.response.ServerResponse, never, Http.request.ServerRequest>;
}

export const Cookie = <A>(
  name: string,
  schema: S.Schema<A, string>,
  options?: Omit<HttpCookie["options"], "secure">,
): Effect.Effect<Cookie<A>, ConfigError.ConfigError> =>
  Effect.gen(function* () {
    const { secure, secrets } = yield* CookieConfig;
    const opts: HttpCookie["options"] = {
      path: "/",
      maxAge: "30 minutes",
      secure,
      httpOnly: true,
      ...options,
    };

    // TODO: support multiple secrets
    const secret = Secret.value(secrets[0]);

    const sign = (val: string) => {
      return Effect.sync(() => val + "." + createHmac("sha256", secret).update(val).digest("base64"));
    };

    const unsign = (input: string) =>
      Effect.gen(function* () {
        const tentativeValue = input.slice(0, input.lastIndexOf("."));
        const expectedInput = yield* sign(tentativeValue);
        const expectedBuffer = Buffer.from(expectedInput);
        const inputBuffer = Buffer.from(input);

        return yield* expectedBuffer.length === inputBuffer.length && timingSafeEqual(expectedBuffer, inputBuffer)
          ? Effect.succeed(tentativeValue)
          : Effect.fail(new UnsignError());
      });

    const read = Http.request.ServerRequest.pipe(
      Effect.map((req) => req.cookies),
      Effect.flatMap((cookies) => Effect.fromNullable(cookies[name])),
      Effect.flatMap((a) => unsign(a)),
      Effect.flatMap(S.decode(schema)),
      Effect.mapError(() => new CookieNotPresent()),
    );

    const set = (value: A) => (res: Http.response.ServerResponse) =>
      Effect.succeed(value).pipe(
        Effect.flatMap(S.encode(schema)),
        Effect.tap(Console.log),
        Effect.flatMap(sign),
        Effect.flatMap((value) => Http.response.setCookie(name, value, opts)(res)),
        Effect.orElseSucceed(() => res),
      );

    const remove = (res: Http.response.ServerResponse) =>
      read.pipe(
        Effect.flatMap(() => Http.response.setCookie(name, "", { ...opts, maxAge: 0 })(res)),
        Effect.orElseSucceed(() => res),
      );

    return {
      remove,
      set,
      read,
    };
  });

interface AppCookies {
  token: Cookie<string>;
  returnTo: Cookie<string>;
  authState: Cookie<State>;
}

const make = Effect.gen(function* () {
  return {
    token: yield* Cookie("_token", S.String, {
      path: "/",
      maxAge: "365 days",
    }),
    returnTo: yield* Cookie("_returnTo", S.String, {
      path: "/",
      maxAge: "60 minutes",
    }),
    authState: yield* Cookie("_authState", StateFromString, {
      path: "/",
      maxAge: "60 minutes",
    }),
  };
});

export class Cookies extends Effect.Tag("@web/Cookies")<Cookies, AppCookies>() {
  static layer = Layer.effect(Cookies, make);
}

class CookieNotPresent extends Data.TaggedError("CookieNotPresent") {}

class UnsignError extends Data.TaggedError("UnsignError") {}
