import { Data, Effect, S } from "@chuz/prelude";
import { Email } from "./Email";
import * as Password from "./Password";

export class Plain extends S.Class<Plain>("PlainEmailPassword")({
  email: Email,
  password: Password.Plaintext,
}) {}

export class Strong extends S.Class<Strong>("StrongEmailPassword")({
  email: Email,
  password: Password.Strong,
}) {
  static make = (email: Email, password: Password.Strong) => Effect.sync(() => new Strong({ email, password }));
}

export interface Secure {
  email: Email;
  password: Password.Hashed;
}

export const Secure = Data.case<Secure>();
