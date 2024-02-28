import { Credentials, Email, Password, Session, User } from "@chuz/domain";
import { Effect } from "effect";
import { Capabilities } from "../src/Capabilities";
import { Passwords } from "../src/passwords/Passwords";

export namespace TestSeed {
  const credentials = new Credentials.Strong({
    email: Email.unsafeFrom("lonestar@an.com"),
    password: Password.Strong.unsafeFrom("password"),
  });

  export class Seeded {
    static make = (capabiliities: Capabilities): Effect.Effect<Seeded> =>
      Effect.gen(function* (_) {
        const session = yield* _(
          capabiliities.users.register({
            firstName: User.FirstName.unsafeFrom("John"),
            lastName: User.LastName.unsafeFrom("Lonestar"),
            optInMarketing: User.OptInMarketing.unsafeFrom(true),
            credentials: new Credentials.Secure({
              email: credentials.email,
              password: yield* _(Passwords.hash(credentials.password)),
            }),
          }),
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
