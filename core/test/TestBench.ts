import { Credential, Email, Password, User } from "@chuz/domain";
import { ConfigError, Effect, Option, S } from "@chuz/prelude";
import * as Core from "core/index";

export type TestBench = Core.Capabilities;

export namespace TestBench {
  export const make: Effect.Effect<Core.Capabilities, ConfigError.ConfigError> = Effect.gen(function* () {
    const users = yield* Core.Users;

    return { users };
  }).pipe(Effect.provide(Core.ReferenceUsers.layer));

  export type Seeded = Core.Capabilities & { seed: { session: User.Session } };

  export namespace Seeded {
    export const make: Effect.Effect<Seeded, ConfigError.ConfigError> = Effect.gen(function* () {
      const passwords = yield* Core.Passwords;
      const bench = yield* TestBench.make;

      const password = yield* passwords.hash(userRegistration.credentials.password);
      const credential = Credential.Secure.Email({ email: userRegistration.credentials.email, password });

      const registration: Core.Registration = {
        credential: credential,
        firstName: Option.some(userRegistration.firstName),
        lastName: Option.some(userRegistration.lastName),
        optInMarketing: userRegistration.optInMarketing,
      };

      const session = yield* bench.users.register(registration);

      return { seed: { session }, ...bench };
    }).pipe(Effect.orDie, Effect.provide(Core.Passwords.layer));
  }
}

const userRegistration = {
  firstName: User.FirstName("Toby"),
  lastName: User.LastName("Lerone"),
  optInMarketing: User.OptInMarketing(true),
  credentials: new Credential.EmailPassword.Strong({
    email: S.decodeSync(Email)("lonestar@an.com"),
    password: Password.Strong("password"),
  }),
};
