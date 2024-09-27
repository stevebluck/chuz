import { Data, Effect, Config as C, ConfigError } from "@chuz/prelude";

export interface Config<Mode extends Config.Mode = Config.Mode> {
  mode: Mode;
}

export namespace Config {
  export type DevInMemory = Config<Mode.DevInMemory>;
  export type DevPersisted = Config<Mode.DevPersisted>;
  export type Production = Config<Mode.Production>;

  export const make: Effect.Effect<Config, ConfigError.ConfigError> = Effect.gen(function* () {
    const config = yield* Mode.config;

    switch (config.mode) {
      case "dev-in-memory": {
        return { mode: Mode.DevInMemory.make() };
      }
      case "dev-persistent": {
        return { mode: Mode.DevPersisted.make() };
      }
      case "production": {
        return { mode: Mode.Production.make() };
      }
    }
  });

  export type Mode = Data.TaggedEnum<{
    DevInMemory: {};
    DevPersisted: {};
    Production: {};
  }>;

  export namespace Mode {
    export type DevInMemory = Data.TaggedEnum.Value<Mode, "DevInMemory">;
    export type DevPersisted = Data.TaggedEnum.Value<Mode, "DevPersisted">;
    export type Production = Data.TaggedEnum.Value<Mode, "Production">;

    const Mode = Data.taggedEnum<Mode>();

    export const match = Mode.$match;

    export namespace DevInMemory {
      export const config = C.all({
        mode: C.literal("dev-in-memory")("MODE"),
      });

      export const make = Mode.DevInMemory;
    }

    export namespace DevPersisted {
      export const config = C.all({
        mode: C.literal("dev-persistent")("MODE"),
      });

      export const make = Mode.DevPersisted;
    }

    export namespace Production {
      export const config = C.all({
        mode: C.literal("production")("MODE"),
      });

      export const make = Mode.Production;
    }

    export const config = DevInMemory.config.pipe(
      C.orElse(() => DevPersisted.config),
      C.orElse(() => Production.config),
      C.withDefault({ mode: "dev-in-memory" }),
    );
  }
}
