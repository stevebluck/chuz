import { S } from "@chuz/prelude";
import { User } from ".";
import * as Password from "./Password";

export class Plain extends S.TaggedClass<Plain>()("Plain", {
  email: User.Email,
  password: Password.Plaintext,
}) {}

export class Strong extends S.TaggedClass<Strong>()("Strong", {
  email: User.Email,
  password: Password.Strong,
}) {}

export class Secure extends S.TaggedClass<Secure>()("Secure", {
  email: User.Email,
  password: Password.Hashed,
}) {}
