import { Password, User as _User, Credential as _Credentials, Credential, Email as _Email } from "@chuz/domain";
import { Arbitrary, Option } from "@chuz/prelude";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext);
    export const Strong = Arbitrary.make(Password.Strong);
  }

  export const Email = Arbitrary.make(_Email);

  export namespace Credentials {
    export const EmailPassword = Arbitrary.make(Credential.EmailPassword.Strong);

    export type Apple = typeof Apple extends fc.Arbitrary<infer A> ? A : never;
    export const Apple: fc.Arbitrary<Credential.Secure.Apple> = fc.record({
      _tag: fc.constant(Credential.ProviderId.Apple),
      email: Email,
    });

    export type Google = typeof Google extends fc.Arbitrary<infer A> ? A : never;
    export const Google = fc.record({
      _tag: fc.constant(Credential.ProviderId.Google),
      email: Email,
    });
  }

  export namespace Registration {
    const firstName = Arbitrary.make(_User.FirstName).map(Option.fromNullable);
    const lastName = Arbitrary.make(_User.LastName).map(Option.fromNullable);
    const optInMarketing = Arbitrary.make(_User.OptInMarketing);

    const make = <A>(credential: fc.Arbitrary<A>) =>
      fc.record({
        credential,
        firstName,
        lastName,
        optInMarketing,
      });

    export type EmailPassword = typeof EmailPassword extends fc.Arbitrary<infer A> ? A : never;
    export const EmailPassword = fc.record({
      credential: Credentials.EmailPassword,
      firstName,
      lastName,
      optInMarketing,
    });

    export type Google = typeof Google extends fc.Arbitrary<infer A> ? A : never;
    export const Google = make(Credentials.Google);

    export type Apple = typeof Apple extends fc.Arbitrary<infer A> ? A : never;
    export const Apple = make(Credentials.Apple);
  }

  export namespace Users {
    export const Partial = Arbitrary.make(_User.Partial);
  }
}
