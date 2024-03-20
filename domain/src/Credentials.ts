import * as S from "@effect/schema/Schema";
import { Brand, Data } from "effect";
import { Email } from "./Email";
import { Password } from "./Password";

export namespace Credentials {
  export type Code = string & Brand.Brand<"Code">;
  export namespace Code {
    export const schema: S.Schema<Code, string> = S.string.pipe(S.brand("Code"));
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

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}

  export class InvalidCode extends Data.TaggedError("InvalidCode")<{ error: unknown }> {}
}
