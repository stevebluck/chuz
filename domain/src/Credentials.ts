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

  export class Secure extends S.Class<Secure>()({
    email: Email.schema,
    password: Password.Hashed.schema,
  }) {
    equals: Equivalence.Equivalence<Secure> = Equal.equals;
  }

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
}
