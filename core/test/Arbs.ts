import { Credentials, Email, Password, User } from "@chuz/domain";
import { Option } from "@chuz/prelude";
import * as Arbitrary from "@effect/schema/Arbitrary";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext)(fc);
    export const Strong = Arbitrary.make(Password.Strong)(fc);
  }

  export const EmailArb = fc.emailAddress().map<Email.Email>(Email.unsafeFrom);

  export namespace Users {
    export const FirstName = Arbitrary.make(User.FirstName)(fc);
    export const LastName = Arbitrary.make(User.LastName)(fc);
    export const OptInMarketing = Arbitrary.make(User.OptInMarketing)(fc);

    export const StrongCredentials: fc.Arbitrary<Credentials.EmailPassword.Strong> = fc.record({
      _tag: fc.constant("Strong"),
      email: EmailArb,
      password: Passwords.Strong,
    });

    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;
    export const Register = fc.record({
      credentials: StrongCredentials,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export const UserArb = Arbitrary.make(User.schema)(fc);

    export const ProviderCredential = Arbitrary.make(Credentials.IdentityProvider)(fc);

    export const PartialUser: fc.Arbitrary<User.Partial> = fc.record(
      {
        firstName: FirstName.map((firstName) => Option.some(firstName)),
        lastName: LastName.map((lastName) => Option.some(lastName)),
        optInMarketing: OptInMarketing,
      },
      { requiredKeys: [] },
    );
  }
}
