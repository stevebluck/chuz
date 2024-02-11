import { Effect } from "effect";
import { Capabilities, Credentials, Email, Password, Session, User } from "~/core";

export namespace TestSeed {
  interface UserRegistation {
    firstName: User.FirstName;
    lastName: User.LastName;
    optInMarketing: User.OptInMarketing;
    credentials: Credentials.Strong;
  }
  const UserRegistation = (
    firstName: User.FirstName,
    lastName: User.LastName,
    optInMarketing: User.OptInMarketing,
    credentials: Credentials.Strong,
  ): UserRegistation => ({ firstName, lastName, credentials, optInMarketing });

  const userRegistration = UserRegistation(
    User.FirstName.unsafeFrom("John"),
    User.LastName.unsafeFrom("Lonestar"),
    User.OptInMarketing(true),
    Credentials.Strong(Email.unsafeFrom("lonestar@an.com"), Password.Strong.unsafeFrom("password")),
  );

  export class Seeded {
    static make = (capabiliities: Capabilities): Effect.Effect<Seeded> =>
      Effect.gen(function* (_) {
        const hashed = yield* _(capabiliities.hasher(userRegistration.credentials.password));
        const secureCredentials = Credentials.Secure(userRegistration.credentials.email, hashed);

        const session = yield* _(
          capabiliities.users.register(
            secureCredentials,
            userRegistration.firstName,
            userRegistration.lastName,
            userRegistration.optInMarketing,
          ),
        );

        return new Seeded({ session });
      }).pipe(Effect.orDie);

    private constructor(
      readonly seed: {
        session: Session<User>;
      },
    ) {}
  }
}
