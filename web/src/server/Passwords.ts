import * as Core from "core/index";
import { ScryptOptions } from "crypto";
import { Context, Effect, Layer } from "effect";
import { LayerUtils } from "./LayerUtils";

export class HasherConfig extends Context.Tag("@app/Passwords/HasherConfig")<HasherConfig, ScryptOptions>() {
  static layer = LayerUtils.config(this);
}

export class Hasher extends Effect.Tag("@app/Passwords/Hasher")<Hasher, { hash: Core.Passwords.Hash }>() {
  static layer = Layer.effect(
    Hasher,
    HasherConfig.pipe(
      Effect.map((config) => Core.Passwords.hasher(config)),
      Effect.map((hash) => ({ hash })),
    ),
  );
}
