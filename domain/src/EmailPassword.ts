import * as S from "@chuz/prelude/Schema";
import * as Email from "./Email";
import * as Password from "./Password";

export class Plain extends S.TaggedClass<Plain>()("Plain", {
  email: Email.schema,
  password: Password.Plaintext,
}) {}

export class Strong extends S.TaggedClass<Strong>()("Strong", {
  email: Email.schema,
  password: Password.Strong,
}) {}

export class Secure extends S.TaggedClass<Secure>()("Secure", {
  email: Email.schema,
  password: Password.Hashed,
}) {}
