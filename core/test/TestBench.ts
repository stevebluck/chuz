import { Credential, Email, Password, User } from "@chuz/domain";
import { Clock, Effect, Option, S } from "@chuz/prelude";
import * as Core from "core/index";

export type TestBench = Core.Capabilities;

export namespace TestBench {
  export const make: Effect.Effect<Core.Capabilities> = Effect.gen(function* () {
    const clock = Clock.make();
    const userTokens = yield* Core.ReferenceTokens.create(clock, User.eqId);
    const passwordResetTokens = yield* Core.ReferenceTokens.create(clock, Password.resetEquals);

    const users = yield* Core.ReferenceUsers.make(userTokens, passwordResetTokens, match);

    return { users };
  });

  export type Seeded = Core.Capabilities & { seed: { session: User.Session } };

  export namespace Seeded {
    export const make: Effect.Effect<Seeded> = Effect.gen(function* () {
      const bench = yield* TestBench.make;

      const password = yield* hash(userRegistration.credentials.password);
      const credential = Credential.Secure.Email({ email: userRegistration.credentials.email, password });

      const registration: Core.Registration = {
        credential: credential,
        firstName: Option.some(userRegistration.firstName),
        lastName: Option.some(userRegistration.lastName),
        optInMarketing: userRegistration.optInMarketing,
      };

      const session = yield* bench.users.register(registration);

      return { seed: { session }, ...bench };
    }).pipe(Effect.orDie);
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

const match = Core.Passwords.matcher({ N: 2 });
const hash = Core.Passwords.hasher({ N: 2 });
