import { Context, Effect, Layer, Secret } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { LayerUtils } from "../LayerUtils";
import * as Auth from "../auth/Auth";
import { Cookie } from "./Cookie";

interface CookieConfig {
  secure: boolean;
  secrets: readonly Secret.Secret[];
}

export class Config extends Context.Tag("@app/cookies/Config")<Config, CookieConfig>() {
  static layer = LayerUtils.config(this);
}

export class Token extends Context.Tag("@app/cookies/Token")<Token, Cookie<string>>() {
  static layer = Layer.effect(
    Token,
    Effect.gen(function* () {
      const { secure, secrets } = yield* Config;

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
      const { secure, secrets } = yield* Config;

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

export class AuthState extends Context.Tag("@app/cookies/AuthState")<AuthState, Cookie<Auth.State>>() {
  static layer = Layer.effect(
    AuthState,
    Effect.gen(function* () {
      const { secure, secrets } = yield* Config;

      // TODO: support multiple secrets
      const secret = Secret.value(secrets[0]);

      return new Cookie("_authstate", Auth.State, {
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
