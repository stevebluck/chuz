import * as Domain from "@chuz/domain";
import * as Core from "core/index";
import { Clock, Effect } from "effect";
import { Passwords } from "../src/auth/Passwords";

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
        credentials: new Domain.Credentials.Secure({
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

interface UserRegistation {
  firstName: Domain.User.FirstName;
  lastName: Domain.User.LastName;
  optInMarketing: Domain.User.OptInMarketing;
  credentials: Domain.Credentials.Strong;
}
const UserRegistation = (
  firstName: Domain.User.FirstName,
  lastName: Domain.User.LastName,
  optInMarketing: Domain.User.OptInMarketing,
  credentials: Domain.Credentials.Strong,
): UserRegistation => ({ firstName, lastName, credentials, optInMarketing });

const userRegistration = UserRegistation(
  Domain.User.FirstName.unsafeFrom("John"),
  Domain.User.LastName.unsafeFrom("Lonestar"),
  Domain.User.OptInMarketing.unsafeFrom(true),
  new Domain.Credentials.Strong({
    email: Domain.Email.unsafeFrom("lonestar@an.com"),
    password: Domain.Password.Strong.unsafeFrom("password"),
  }),
);
