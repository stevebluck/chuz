import * as S from "@effect/schema/Schema";
import { Data, Equal, Equivalence, Match } from "effect";
import { Email } from "./Email";
import { Password } from "./Password";

export type Credential = Credential.EmailPassword.Secure | Credential.Provider;

export namespace Credential {
  export type ProviderId = S.Schema.Type<typeof ProviderId>;
  export namespace ProviderId {
    export const schema = S.string.pipe(S.brand("ProviderId"));
    export const unsafeFrom = S.decodeSync(schema);
  }

  export class Provider extends S.TaggedClass<Provider>()("Provider", {
    id: ProviderId.schema,
    email: Email.schema,
  }) {
    static make = Data.tagged<Provider>("Provider");
    static equals = Equal.equivalence<Credential.Provider>();
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
        new Strong({
          email: plain.email,
          password: Password.Strong.unsafeFrom(plain.password),
        });
    }

    export class Secure extends S.TaggedClass<Secure>()("Secure", {
      email: Email.schema,
      password: Password.Hashed.schema,
    }) {}
  }

  export const schema = S.union(EmailPassword.Secure, Provider);

  export const isEmailPassword = S.is(EmailPassword.Secure);
  export const isProvider = S.is(Provider);

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
  export const match = Match.typeTags<Credential>();

  export const equals: Equivalence.Equivalence<Credential> = Equal.equals;
}

export type PlainCredential = Credential.EmailPassword.Plain | Credential.Provider;
export namespace PlainCredential {
  export const match = Match.typeTags<PlainCredential>();
  export const equals: Equivalence.Equivalence<Credential> = Equal.equals;
}
