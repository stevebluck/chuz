import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer, Secret } from "effect";
import { LayerUtils } from "../LayerUtils";
import { Auth } from "../oauth/Auth";
import { Cookie } from "./Cookie";

interface Config {
  secure: boolean;
  secrets: readonly Secret.Secret[];
}

export class AppCookiesConfig extends Context.Tag("@app/TokenCookieConfig")<AppCookiesConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class AppCookies extends Effect.Tag("@app/AppCookies")<
  AppCookies,
  {
    token: Cookie<string>;
    authState: Cookie<Auth.State>;
  }
>() {
  static layer = Layer.effect(
    AppCookies,
    Effect.gen(function* (_) {
      const { secure, secrets } = yield* _(AppCookiesConfig);

      // TODO: support multiple secrets
      const secret = Secret.value(secrets[0]);

      return AppCookies.of({
        token: new Cookie("_session", S.string, {
          secure,
          path: "/",
          sameSite: "lax",
          maxAge: "365 days",
          httpOnly: true,
          secret,
        }),
        authState: new Cookie("_authstate", Auth.State.schema, {
          path: "/",
          maxAge: "30 minutes",
          secure,
          httpOnly: true,
          secret,
        }),
      });
    }),
  );
}
