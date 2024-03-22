import * as S from "@effect/schema/Schema";
import { Data, Match } from "effect";
import { Email } from "./Email";
import { Password } from "./Password";
import { User } from "./User";

export namespace Credentials {
  export class Provider extends S.TaggedClass<Provider>()("Provider", {
    id: S.string,
    user: User.schema,
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
    }) {}
  }

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
  export const match = Match.typeTags<Credential>();
}

export type Credential = Credentials.EmailPassword.Plain | Credentials.Provider;
