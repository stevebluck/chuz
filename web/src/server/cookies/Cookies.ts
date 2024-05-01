import { OAuth } from "@chuz/domain";
import { Config, Context, Effect, Layer, Secret } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Cookie } from "./Cookie";

const CookieConfig = Config.all({
  secure: Config.map(Config.string("NODE_ENV"), (env) => env === "production"),
  secrets: Config.array(Config.secret("COOKIE_SECRET")).pipe(Config.withDefault([Secret.fromString("chuzwozza")])),
});

export class Token extends Context.Tag("@app/cookies/Token")<Token, Cookie<string>>() {
  static layer = Layer.effect(
    Token,
    Effect.gen(function* () {
      const { secure, secrets } = yield* CookieConfig;

      // TODO: support multiple secrets
      const secret = Secret.value(secrets[0]);

      return new Cookie("_session", S.String, {
        secure,
        path: "/",
        sameSite: "lax",
        maxAge: "365 days",
        httpOnly: true,
        secret,
      });
    }),
  );
}

export class ReturnTo extends Context.Tag("@app/cookies/ReturnTo")<ReturnTo, Cookie<string>>() {
  static layer = Layer.effect(
    ReturnTo,
    Effect.gen(function* () {
      const { secure, secrets } = yield* CookieConfig;

      // TODO: support multiple secrets
      const secret = Secret.value(secrets[0]);

      return new Cookie("_returnTo", S.String, {
        path: "/",
        maxAge: "30 minute",
        secure,
        httpOnly: true,
        secret,
      });
    }),
  );
}

export class AuthState extends Context.Tag("@app/cookies/AuthState")<AuthState, Cookie<OAuth.State>>() {
  static layer = Layer.effect(
    AuthState,
    Effect.gen(function* () {
      const { secure, secrets } = yield* CookieConfig;

      // TODO: support multiple secrets
      const secret = Secret.value(secrets[0]);

      return new Cookie("_authstate", OAuth.StateFromString, {
        path: "/",
        maxAge: "30 minutes",
        secure,
        httpOnly: true,
        secret,
      });
    }),
  );
}

export const layer = Layer.mergeAll(Token.layer, ReturnTo.layer, AuthState.layer);
