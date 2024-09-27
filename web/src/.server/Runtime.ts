import { Capabilities, Passwords, ReferenceUsers } from "@chuz/core";
import { Clock, ConfigError, Effect } from "@chuz/prelude";
import { Config } from "./Config";

export interface Runtime {
  config: Config;
  capabilities: Capabilities;
}

export namespace Runtime {
  namespace Development {
    export const InMemory = (config: Config.DevInMemory): Effect.Effect<Capabilities> =>
      Effect.gen(function* () {
        const saltRounds = Passwords.SaltRounds(4);
        const clock = Clock.make();
        const users = yield* ReferenceUsers.make(clock, Passwords.match(saltRounds));

        return Capabilities({ users });
      });

    export const Database = (config: Config.DevPersisted): Effect.Effect<Capabilities> => Effect.die("Not implemented");
  }

  const Production = (config: Config.Production): Effect.Effect<Capabilities> => Effect.die("Not implemented");

  export const make: Effect.Effect<Runtime, ConfigError.ConfigError> = Effect.gen(function* (_) {
    const config = yield* Config.make;

    const capabilities = yield* Config.Mode.match(config.mode, {
      DevPersisted: (mode) => Development.Database({ ...config, mode }),
      DevInMemory: (mode) => Development.InMemory({ ...config, mode }),
      Production: (mode) => Production({ ...config, mode }),
    });

    return { capabilities, config };
  });
}
