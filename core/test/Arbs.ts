import { EmailPassword, Password, User as _User, Credential as _Credentials, Credential } from "@chuz/domain";
import { Arbitrary, Option, S } from "@chuz/prelude";
import * as fc from "fast-check";

export namespace Arbs {
  export namespace Passwords {
    export const Plaintext = Arbitrary.make(Password.Plaintext);
    export const Strong = Arbitrary.make(Password.Strong);
  }

  export const Email = Arbitrary.make(S.EmailAddress);

  export namespace Credentials {
    export const Email = Arbitrary.make(EmailPassword.Strong);
    export const Google = Arbitrary.make(_Credentials.AuthProvider).map(
      (provider) => new _Credentials.AuthProvider({ ...provider, providerId: Credential.ProviderId.google }),
    );
    export const Apple = Arbitrary.make(_Credentials.AuthProvider).map(
      (provider) => new _Credentials.AuthProvider({ ...provider, providerId: Credential.ProviderId.apple }),
    );
  }

  export namespace Registration {
    const firstName = Arbitrary.make(_User.FirstName).map(Option.fromNullable);
    const lastName = Arbitrary.make(_User.LastName).map(Option.fromNullable);
    const optInMarketing = Arbitrary.make(_User.OptInMarketing);

    export type Email = typeof Email extends fc.Arbitrary<infer A> ? A : never;
    export const Email = fc.record({
      credentials: Credentials.Email,
      firstName,
      lastName,
      optInMarketing,
    });

    export type Google = typeof Google extends fc.Arbitrary<infer A> ? A : never;
    export const Google = fc.record({
      credentials: Credentials.Google,
      firstName,
      lastName,
      optInMarketing,
    });

    export type Apple = typeof Apple extends fc.Arbitrary<infer A> ? A : never;
    export const Apple = fc.record({
      credentials: Credentials.Google,
      firstName,
      lastName,
      optInMarketing,
    });
  }

  export namespace Users {
    export const Partial = Arbitrary.make(_User.Partial);
  }
}
