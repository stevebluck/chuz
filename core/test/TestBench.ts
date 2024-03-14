import * as Domain from "@chuz/domain";
import { Passwords } from "core/auth/Passwords";
import * as Core from "core/index";
import { Clock, Effect } from "effect";

export type TestBench = Core.Capabilities;

export namespace TestBench {
  export const make: Effect.Effect<Core.Capabilities> = Effect.gen(function* (_) {
    const clock = Clock.make();
    const userTokens = yield* _(Core.ReferenceTokens.create(clock, Domain.Identified.equals));
    const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Domain.Password.Reset.equals));

    const users = yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens));

    return { users };
  });

  export type Seeded = Core.Capabilities & { seed: { session: Domain.Session<Domain.User> } };

  export namespace Seeded {
    export const make: Effect.Effect<Seeded> = Effect.gen(function* (_) {
      const bench = yield* _(TestBench.make);
      const hashed = yield* _(Passwords.hash(userRegistration.credentials.password));

      const registration = Domain.User.Registration.make({
        credentials: Domain.Credentials.Secure.make({
          email: userRegistration.credentials.email,
          password: hashed,
        }),
        firstName: userRegistration.firstName,
        lastName: userRegistration.lastName,
        optInMarketing: userRegistration.optInMarketing,
      });

      const session = yield* _(bench.users.register(registration));

      return { seed: { session }, ...bench };
    }).pipe(Effect.orDie);
  }
}

const userRegistration = {
  firstName: Domain.User.FirstName.unsafeFrom("Toby"),
  lastName: Domain.User.LastName.unsafeFrom("Lerone"),
  optInMarketing: Domain.User.OptInMarketing.unsafeFrom(true),
  credentials: new Domain.Credentials.Strong({
    email: Domain.Email.unsafeFrom("lonestar@an.com"),
    password: Domain.Password.Strong.unsafeFrom("password"),
  }),
};