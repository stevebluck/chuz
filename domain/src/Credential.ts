import { Data, S } from "@chuz/prelude";
import { Email } from "./Email";
import * as Password from "./Password";

export type Tag = (typeof Tag)[keyof typeof Tag];

export const Tag = {
  EmailPassword: "EmailPassword",
  Google: "Google",
  Apple: "Apple",
} as const;

export class EmailPasswordPlain extends S.TaggedClass<EmailPasswordPlain>()(Tag.EmailPassword, {
  email: Email,
  password: Password.Plaintext,
}) {}

export class EmailPasswordStrong extends S.TaggedClass<EmailPasswordStrong>()(Tag.EmailPassword, {
  email: Email,
  password: Password.Strong,
}) {}

export class EmailPasswordSecure extends S.TaggedClass<EmailPasswordSecure>()(Tag.EmailPassword, {
  email: Email,
  password: Password.Hashed,
}) {}

export class Google extends S.TaggedClass<Google>()(Tag.Google, {
  email: Email,
}) {}

export class Apple extends S.TaggedClass<Apple>()(Tag.Apple, {
  email: Email,
}) {}

export type Plain = EmailPasswordPlain | Google | Apple;

export type Secure = EmailPasswordSecure | Google | Apple;

export const Plain = Data.taggedEnum<Plain>();

export const Secure = Data.taggedEnum<Secure>();
