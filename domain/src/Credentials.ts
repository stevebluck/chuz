import * as S from "@effect/schema/Schema";
import { Brand, Data, Equal, Equivalence } from "effect";
import { Email } from "./Email";
import { Password } from "./Password";

export namespace Credentials {
  export type AuthCode = string & Brand.Brand<"AuthCode">;
  export namespace AuthCode {
    export const schema: S.Schema<AuthCode, string> = S.string.pipe(S.brand("AuthCode"));
  }

  export class Plain extends S.Class<Plain>("Plain")({
    email: Email.schema,
    password: Password.Plaintext.schema,
  }) {
    static parse = S.decodeUnknown(Plain, { errors: "all" });
  }

  export class Strong extends S.Class<Strong>("Strong")({
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

  export class InvalidAuthCode extends Data.TaggedError("InvalidAuthCode")<{ error: unknown }> {}
}
