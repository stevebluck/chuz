import { Data, Equal, Equivalence, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";

export { EmailPassword };

export type Plain = Data.TaggedEnum<{
  Email: EmailPassword.Plain;
  Google: { email: S.EmailAddress };
  Apple: { email: S.EmailAddress };
}>;

export type Secure = Data.TaggedEnum<{
  Email: EmailPassword.Secure;
  Google: { email: S.EmailAddress };
  Apple: { email: S.EmailAddress };
}>;

export type ProviderId = Secure["_tag"];
export const ProviderId = {
  Email: "Email",
  Google: "Google",
  Apple: "Apple",
} as const;

export type PlainEmail = Data.TaggedEnum.Value<Plain, "Email">;
export type Email = Data.TaggedEnum.Value<Secure, "Email">;
export type Google = Data.TaggedEnum.Value<Secure, "Google">;
export type Apple = Data.TaggedEnum.Value<Secure, "Apple">;

export const Secure = Data.taggedEnum<Secure>();

export const Plain = Data.taggedEnum<Plain>();

export const matchPlain = Match.typeTags<Plain>();

export const matchSecure = Match.typeTags<Secure>();

export const eqv = Equivalence.strict<ProviderId>();

export const is = (
  id: ProviderId,
  credential: Secure | Plain,
): credential is Data.TaggedEnum.Value<Secure | Plain, ProviderId> => Equal.equals(credential._tag, id);

export const isEmail = (credential: Secure): credential is Email => is(ProviderId.Email, credential);
export const isEmailPlain = (credential: Plain): credential is PlainEmail => is(ProviderId.Email, credential);

export class AlreadyExists extends Data.TaggedError("CredentialAlareadyExists") {}
export class NotRecognised extends Data.TaggedError("CredentialNotRecognised") {}
export class NoFallbackAvailable extends Data.TaggedError("NoFallbackCredentialAvailable") {}
