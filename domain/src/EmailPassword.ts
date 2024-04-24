import { Data, S } from "@chuz/prelude";
import * as Password from "./Password";

export class Plain extends S.Class<Plain>("Plain")({
  email: S.EmailAddress,
  password: Password.Plaintext,
}) {}

export class Strong extends S.Class<Strong>("Strong")({
  email: S.EmailAddress,
  password: Password.Strong,
}) {}

export interface Secure {
  email: S.EmailAddress;
  password: Password.Hashed;
}

export const Secure = Data.case<Secure>();
