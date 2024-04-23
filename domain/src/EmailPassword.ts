import { S } from "@chuz/prelude";
import * as Password from "./Password";

export class Plain extends S.TaggedClass<Plain>()("Plain", {
  email: S.EmailAddress,
  password: Password.Plaintext,
}) {}

export class Strong extends S.TaggedClass<Strong>()("Strong", {
  email: S.EmailAddress,
  password: Password.Strong,
}) {}

export class Secure extends S.TaggedClass<Secure>()("Secure", {
  providerId: S.Literal("email"),
  email: S.EmailAddress,
  password: Password.Hashed,
}) {}
