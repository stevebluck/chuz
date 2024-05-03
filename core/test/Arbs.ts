import { Password, User, Email } from "@chuz/domain";
import { Arbitrary, Option, fc } from "@chuz/prelude";

export type EmailPasswordRegistration = typeof EmailPasswordRegistration extends fc.Arbitrary<infer A> ? A : never;
const EmailPasswordRegistration = fc.record({
  credential: fc.record({ email: Arbitrary.make(Email), password: Arbitrary.make(Password.Strong) }),
  firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
  lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
  optInMarketing: Arbitrary.make(User.OptInMarketing),
});

export const Arbs = {
  Passwords: {
    Plaintext: Arbitrary.make(Password.Plaintext),
    Strong: Arbitrary.make(Password.Strong),
  },
  Email: Arbitrary.make(Email),
  Credentials: {
    EmailPassword: fc.record({ email: Arbitrary.make(Email), password: Arbitrary.make(Password.Strong) }),
    Apple: fc.record({ _tag: fc.constant("Apple" as const), email: Arbitrary.make(Email) }),
    Google: fc.record({ _tag: fc.constant("Google" as const), email: Arbitrary.make(Email) }),
  },
  Registration: {
    EmailPassword: EmailPasswordRegistration,
    Google: fc.record({
      credential: fc.record({ _tag: fc.constant("Google" as const), email: Arbitrary.make(Email) }),
      firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
      lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
      optInMarketing: Arbitrary.make(User.OptInMarketing),
    }),
    Apple: fc.record({
      credential: fc.record({ _tag: fc.constant("Apple" as const), email: Arbitrary.make(Email) }),
      firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
      lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
      optInMarketing: Arbitrary.make(User.OptInMarketing),
    }),
  },
  Users: {
    Partial: Arbitrary.make(User.Partial),
  },
};
