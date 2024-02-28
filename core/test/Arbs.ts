import * as Domain from "@chuz/domain";
import * as Arbitrary from "@effect/schema/Arbitrary";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Domain.Password.Plaintext.schema)(fc);
    export const Strong = Arbitrary.make(Domain.Password.Strong.schema)(fc);
  }

  export namespace Emails {
    export const Email: fc.Arbitrary<Domain.Email> = fc.emailAddress().map<Domain.Email>(Domain.Email.unsafeFrom);
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(Domain.User.FirstName.schema)(fc);
    export const LastName = Arbitrary.make(Domain.User.LastName.schema)(fc);
    export const OptInMarketing = Arbitrary.make(Domain.User.OptInMarketing.schema)(fc);

    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;
    export const Register = fc.record({
      credentials: fc.record({
        email: Emails.Email,
        password: Passwords.Strong,
      }),
      firstName: FirstName,
      lastName: LastName,
      optInMarketing: OptInMarketing,
    });

    export const User = Arbitrary.make(Domain.User.schema)(fc);

    export const PartialUser: fc.Arbitrary<Domain.User.Partial> = fc.record(
      {
        firstName: FirstName,
        lastName: LastName,
        optInMarketing: OptInMarketing,
      },
      { requiredKeys: [] },
    );
  }
}
