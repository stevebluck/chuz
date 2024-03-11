import * as S from "@effect/schema/Schema";
import { Data, Equal, Equivalence } from "effect";
import { Email } from "./Email";
import { Password } from "./Password";

export namespace Credentials {
  export class Plain extends S.Class<Plain>()({
    email: Email.schema,
    password: Password.Plaintext.schema,
  }) {
    static parse = S.decodeUnknown(Plain, { errors: "all" });
  }

  export class Strong extends S.Class<Strong>()({
    email: Email.schema,
    password: Password.Strong.schema,
  }) {}

  export interface Secure {
    email: Email;
    password: Password.Hashed;
  }
  export namespace Secure {
    export const make = Data.case<Secure>();
    export const equals: Equivalence.Equivalence<Secure> = Equal.equals;
  }

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
}
