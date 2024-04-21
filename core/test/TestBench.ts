import { EmailPassword, Password, Session, User } from "@chuz/domain";
import { Clock, Effect, Option, S } from "@chuz/prelude";
import * as Core from "core/index";

export type TestBench = Core.Capabilities;

export namespace TestBench {
  export const make: Effect.Effect<Core.Capabilities> = Effect.gen(function* (_) {
    const clock = Clock.make();
    const userTokens = yield* _(Core.ReferenceTokens.create(clock, User.eqId));
    const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.resetEquals));

    const users = yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens, match));

    return { users };
  });

  export type Seeded = Core.Capabilities & { seed: { session: Session<User.User> } };

  export namespace Seeded {
    export const make: Effect.Effect<Seeded> = Effect.gen(function* (_) {
      const bench = yield* _(TestBench.make);

      const password = yield* _(hash(userRegistration.credentials.password));
      const credential = new EmailPassword.Secure({
        email: userRegistration.credentials.email,
        password,
      });

      const registration: Core.Registration = {
        credentials: credential,
        firstName: Option.some(userRegistration.firstName),
        lastName: Option.some(userRegistration.lastName),
        optInMarketing: userRegistration.optInMarketing,
      };

      const session = yield* _(bench.users.register(registration));

      return { seed: { session }, ...bench };
    }).pipe(Effect.orDie);
  }
}

const userRegistration = {
  firstName: User.FirstName("Toby"),
  lastName: User.LastName("Lerone"),
  optInMarketing: User.OptInMarketing(true),
  credentials: new EmailPassword.Strong({
    email: S.decodeSync(S.EmailAddress)("lonestar@an.com"),
    password: Password.Strong("password"),
  }),
};

const match = Core.Passwords.matcher({ N: 2 });
const hash = Core.Passwords.hasher({ N: 2 });
