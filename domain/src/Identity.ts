import { Data, S } from "@chuz/prelude";
import { Email } from "./Email";

export class EmailPassword extends S.TaggedClass<EmailPassword>()("EmailPassword", { email: Email }) {}
export class Google extends S.TaggedClass<Google>()("Google", { email: Email }) {}
export class Apple extends S.TaggedClass<Apple>()("Apple", { email: Email }) {}

export type Type = typeof Type.Type;
export const Type = S.Union(EmailPassword, Google, Apple);

export const { $match: match, $is: is } = Data.taggedEnum<Type>();
