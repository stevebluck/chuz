import * as Core from "core/index";
import { ScryptOptions } from "crypto";
import { Context, Effect, Layer } from "effect";
import { LayerUtils } from "./LayerUtils";

export class PasswordHasherConfig extends Context.Tag("@app/PasswordHasherConfig")<
  PasswordHasherConfig,
  ScryptOptions
>() {
  static layer = LayerUtils.config(this);
}

export class PasswordHasher extends Effect.Tag("@app/Passwords")<PasswordHasher, { hash: Core.Passwords.Hash }>() {
  static layer = Layer.effect(
    PasswordHasher,
    PasswordHasherConfig.pipe(
      Effect.map((config) => Core.Passwords.hasher(config)),
      Effect.map((hash) => ({ hash })),
    ),
  );
}
