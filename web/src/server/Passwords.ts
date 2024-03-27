import * as Core from "core/index";
import { ScryptOptions } from "crypto";
import { Context, Effect, Layer } from "effect";
import { LayerUtils } from "./LayerUtils";

export class HashConfig extends Context.Tag("@app/Passwords/HashConfig")<HashConfig, ScryptOptions>() {
  static layer = LayerUtils.config(this);
}

export class Hash extends Effect.Tag("@app/Passwords/Hash")<Hash, { hash: Core.Passwords.Hash }>() {
  static layer = Layer.effect(
    Hash,
    HashConfig.pipe(
      Effect.map((config) => Core.Passwords.hasher(config)),
      Effect.map((hash) => ({ hash })),
    ),
  );
}
