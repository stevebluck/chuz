import * as Core from "core/index";
import { Context, Effect, Layer } from "effect";
import { LayerUtils } from "./LayerUtils";

export class PostgressConfig extends Context.Tag("@app/PostgressConfig")<
  PostgressConfig,
  { connectionString: string }
>() {
  static layer = LayerUtils.config(this);
}

export class Database extends Context.Tag("@app/Database")<Database, Core.Database>() {
  static live = Layer.scoped(
    Database,
    PostgressConfig.pipe(Effect.flatMap((config) => Core.PostgressDatabase.make(config.connectionString))),
  );
}
