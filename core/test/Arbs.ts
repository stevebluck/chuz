import { EmailPassword, Password, User as _User, Credential as _Credentials } from "@chuz/domain";
import { Arbitrary, Option, S } from "@chuz/prelude";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext);
    export const Strong = Arbitrary.make(Password.Strong);
  }

  export const Email = Arbitrary.make(S.EmailAddress);

  export namespace Credentials {
    export const StrongEmailPassword = Arbitrary.make(EmailPassword.Strong);
    export const SocialCredential = Arbitrary.make(_Credentials.Social);
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(_User.FirstName);
    export const LastName = Arbitrary.make(_User.LastName);
    export const OptInMarketing = Arbitrary.make(_User.OptInMarketing);

    export type EmailRegistration = typeof EmailRegistration extends fc.Arbitrary<infer A> ? A : never;
    export const EmailRegistration = fc.record({
      credentials: Credentials.StrongEmailPassword,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export type SocialRegistration = typeof SocialRegistration extends fc.Arbitrary<infer A> ? A : never;
    export const SocialRegistration = fc.record({
      credentials: Credentials.SocialCredential,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export const PartialUser = Arbitrary.make(_User.Partial);
  }
}
