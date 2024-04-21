import { EmailPassword, Password, User as _User, Credential as _Credentials } from "@chuz/domain";
import { Arbitrary, Option, S } from "@chuz/prelude";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext)(fc);
    export const Strong = Arbitrary.make(Password.Strong)(fc);
  }

  export const Email = Arbitrary.make(S.EmailAddress)(fc);

  export namespace Credentials {
    export const StrongEmailPassword = Arbitrary.make(EmailPassword.Strong)(fc);
    export const SocialCredential = Arbitrary.make(_Credentials.Social)(fc);
  }

  export namespace Users {
    export const FirstName = Arbitrary.make(_User.FirstName)(fc);
    export const LastName = Arbitrary.make(_User.LastName)(fc);
    export const OptInMarketing = Arbitrary.make(_User.OptInMarketing)(fc);

    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;
    export const Register = fc.record({
      credentials: Credentials.StrongEmailPassword,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export const PartialUser = Arbitrary.make(_User.Partial)(fc);
  }
}
