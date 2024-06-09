import { Password, User, Email, Credential } from "@chuz/domain";
import { Arbitrary, Option, fc } from "@chuz/prelude";

export type EmailPasswordRegistration =
  typeof Arbs.Registration.EmailPassword extends fc.Arbitrary<infer A> ? A : never;

export const Arbs = {
  Passwords: {
    Plaintext: Arbitrary.make(Password.Plaintext),
    Strong: Arbitrary.make(Password.Strong),
  },
  Email: Arbitrary.make(Email),
  Credentials: {
    EmailPassword: Arbitrary.make(Credential.EmailPasswordStrong),
    Apple: Arbitrary.make(Credential.Apple),
    Google: Arbitrary.make(Credential.Google),
  },
  Registration: {
    // TODO: Update this to use a Registration schema
    EmailPassword: fc.record({
      credential: Arbitrary.make(Credential.EmailPasswordStrong),
      firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
      lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
      optInMarketing: Arbitrary.make(User.OptInMarketing),
    }),
    Google: fc.record({
      credential: Arbitrary.make(Credential.Google),
      firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
      lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
      optInMarketing: Arbitrary.make(User.OptInMarketing),
    }),
    Apple: fc.record({
      credential: Arbitrary.make(Credential.Apple),
      firstName: Arbitrary.make(User.FirstName).map(Option.fromNullable),
      lastName: Arbitrary.make(User.LastName).map(Option.fromNullable),
      optInMarketing: Arbitrary.make(User.OptInMarketing),
    }),
  },
  Users: {
    Partial: Arbitrary.make(User.Partial),
  },
};
