import { EmailPassword, Password, User as _User, IdentityProvider } from "@chuz/domain";
import * as Arbitrary from "@effect/schema/Arbitrary";
import { Option } from "effect";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext)(fc);
    export const Strong = Arbitrary.make(Password.Strong)(fc);
  }

  export const Email = Arbitrary.make(_User.Email)(fc);

  export namespace Users {
    export const FirstName = Arbitrary.make(_User.FirstName)(fc);
    export const LastName = Arbitrary.make(_User.LastName)(fc);
    export const OptInMarketing = Arbitrary.make(_User.OptInMarketing)(fc);
    const StrongEmailPassword = Arbitrary.make(EmailPassword.Strong)(fc);

    export type Register = typeof Register extends fc.Arbitrary<infer A> ? A : never;
    export const Register = fc.record({
      credentials: StrongEmailPassword,
      firstName: FirstName.map(Option.fromNullable),
      lastName: LastName.map(Option.fromNullable),
      optInMarketing: OptInMarketing,
    });

    export const User = Arbitrary.make(_User.schema)(fc);

    export const ProviderCredential = Arbitrary.make(IdentityProvider)(fc);

    export const PartialUser = Arbitrary.make(_User.Partial)(fc);
  }
}
