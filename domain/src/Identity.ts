import { Data, S } from "@chuz/prelude";
import * as Credential from "./Credential";
import { Email } from "./Email";

export class EmailPassword extends S.TaggedClass<EmailPassword>()("EmailPassword", {
  email: Email,
}) {
  static make = (email: Email) => new EmailPassword({ email });
  static fromCredential = (credential: Credential.EmailPasswordSecure): EmailPassword => this.make(credential.email);
}

export class Google extends S.TaggedClass<Google>()("Google", {
  email: Email,
}) {
  static make = (email: Email) => new Google({ email });
  static fromCredential = (credential: Credential.Google): Google => this.make(credential.email);
}

export class Apple extends S.TaggedClass<Apple>()("Apple", {
  email: Email,
}) {
  static make = (email: Email) => new Apple({ email });
  static fromCredential = (credential: Credential.Apple): Apple => this.make(credential.email);
}

export type Type = EmailPassword | Google | Apple;
export const Type = S.Union(EmailPassword, Google, Apple);

export const { $match: match, $is: is } = Data.taggedEnum<Type>();
