import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer } from "effect";
import { DurationInput } from "effect/Duration";
import { LayerUtils } from "../LayerUtils";
import { Cookie } from "./Cookie";

interface Config {
  name: string;
  maxAge: DurationInput;
  secure: boolean;
}

export class TokenCookieConfig extends Context.Tag("@app/TokenCookieConfig")<TokenCookieConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class TokenCookie extends Effect.Tag("@app/TokenCookie")<TokenCookie, Cookie<string>>() {
  static layer = Layer.effect(
    TokenCookie,
    Effect.gen(function* (_) {
      const config = yield* _(TokenCookieConfig);

      return new Cookie(config.name, S.string, {
        secret: "test",
        secure: config.secure,
        path: "/",
        sameSite: "lax",
        maxAge: config.maxAge,
        httpOnly: true,
      });
    }),
  );
}
