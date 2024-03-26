import * as Domain from "@chuz/domain";
import * as Arbitrary from "@effect/schema/Arbitrary";
import { Option } from "effect";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Domain.Password.Plaintext.schema)(fc);
    export const Strong = Arbitrary.make(Domain.Password.Strong.schema)(fc);
  }

  export namespace Emails {
    export const Email = fc.emailAddress().map<Domain.Email>(Domain.Email.unsafeFrom);
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(Domain.User.FirstName.schema)(fc);
    export const LastName = Arbitrary.make(Domain.User.LastName.schema)(fc);
    export const OptInMarketing = Arbitrary.make(Domain.User.OptInMarketing.schema)(fc);

    export const StrongCredentials: fc.Arbitrary<Domain.Credential.EmailPassword.Strong> = fc.record({
      _tag: fc.constant("Strong"),
      email: Emails.Email,
      password: Passwords.Strong,
    });

    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;
    export const Register = fc.record({
      credentials: StrongCredentials,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export const User = Arbitrary.make(Domain.User.schema)(fc);

    export const ProviderCredential = Arbitrary.make(Domain.Credential.Provider)(fc);

    export const PartialUser: fc.Arbitrary<Domain.User.Partial> = fc.record(
      {
        firstName: FirstName.map((firstName) => Option.some(firstName)),
        lastName: LastName.map((lastName) => Option.some(lastName)),
        optInMarketing: OptInMarketing,
      },
      { requiredKeys: [] },
    );
  }
}
