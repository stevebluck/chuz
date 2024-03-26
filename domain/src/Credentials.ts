import * as S from "@effect/schema/Schema";
import { Data, Equal, Equivalence, Match } from "effect";
import { User } from ".";
import { Email } from "./Email";
import { Password } from "./Password";

export type Credential = Credential.EmailPassword.Secure | Credential.Provider;

export namespace Credential {
  export class Provider extends S.TaggedClass<Provider>()("Provider", {
    id: S.string,
    email: Email.schema,
    firstName: S.option(User.FirstName.schema),
    lastName: S.option(User.LastName.schema),
  }) {
    static make = Data.tagged<Provider>("Provider");
  }

  export namespace EmailPassword {
    export class Plain extends S.TaggedClass<Plain>()("Plain", {
      email: Email.schema,
      password: Password.Plaintext.schema,
    }) {}

    export class Strong extends S.TaggedClass<Strong>()("Strong", {
      email: Email.schema,
      password: Password.Strong.schema,
    }) {
      static unsafeFromPlain = (plain: Plain) =>
        new Strong({ email: plain.email, password: Password.Strong.unsafeFrom(plain.password) });
    }

    export class Secure extends S.TaggedClass<Secure>()("Secure", {
      email: Email.schema,
      password: Password.Hashed.schema,
    }) {}
  }

  export const schema = S.union(Credential.EmailPassword.Secure, Credential.Provider);

  export const isEmailPassword = S.is(EmailPassword.Secure);
  export const isProvider = S.is(Provider);

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
  export const match = Match.typeTags<Credential>();

  export const equals: Equivalence.Equivalence<Credential> = Equal.equals;
}

export type AuthenticateCredential = Credential.EmailPassword.Plain | Credential.Provider;
export namespace AuthenticateCredential {
  export const AuthenticateCredential = S.union(Credential.EmailPassword.Plain, Credential.Provider);
  export const match = Match.typeTags<AuthenticateCredential>();
  export const equals: Equivalence.Equivalence<Credential> = Equal.equals;
}
