import * as Core from "@chuz/core";
import { Context, Effect, Layer } from "@chuz/prelude";
import { LayerUtils } from "./LayerUtils";

interface Config {
  connectionString: string;
}

export class PostgresConfig extends Context.Tag("@app/PostgressConfig")<PostgresConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class Database extends Context.Tag("@app/Database")<Database, Core.Database>() {
  static live = Layer.scoped(
    Database,
    PostgresConfig.pipe(Effect.flatMap((config) => Core.PostgressDatabase.make(config.connectionString))),
  );
}
