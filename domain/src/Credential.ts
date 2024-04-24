import { Data, Equal, Equivalence, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";

export { EmailPassword };

// TODO: Make my own TaggedEnum with support for match, is and as

export type Plain = Data.TaggedEnum<{
  Email: EmailPassword.Plain;
  Google: { email: S.EmailAddress };
  Apple: { email: S.EmailAddress };
}>;

export namespace Plain {
  export type Email = Data.TaggedEnum.Value<Plain, "Email">;
  export const { Apple, Email, Google } = Data.taggedEnum<Plain>();
  export const match = Match.typeTags<Plain>();
}

export type Secure = Data.TaggedEnum<{
  Email: EmailPassword.Secure;
  Google: { email: S.EmailAddress };
  Apple: { email: S.EmailAddress };
}>;

export namespace Secure {
  export type Email = Data.TaggedEnum.Value<Secure, "Email">;
  export type Google = Data.TaggedEnum.Value<Secure, "Google">;
  export type Apple = Data.TaggedEnum.Value<Secure, "Apple">;

  export const { Apple, Email, Google } = Data.taggedEnum<Secure>();

  export const match = Match.typeTags<Secure>();
}

export type ProviderId = Secure["_tag"];
export const ProviderId = {
  Email: "Email",
  Google: "Google",
  Apple: "Apple",
} as const;

export const eqv = Equivalence.strict<ProviderId>();

export const is = (
  id: ProviderId,
  credential: Secure | Plain,
): credential is Data.TaggedEnum.Value<Secure | Plain, ProviderId> => Equal.equals(credential._tag, id);

export const isEmailPassword = (credential: Secure): credential is Secure.Email => is(ProviderId.Email, credential);

export const isPlainEmailPassword = (credential: Plain): credential is Plain.Email => is(ProviderId.Email, credential);

export class AlreadyExists extends Data.TaggedError("CredentialAlareadyExists") {}
export class NotRecognised extends Data.TaggedError("CredentialNotRecognised") {}
export class NoFallbackAvailable extends Data.TaggedError("NoFallbackCredentialAvailable") {}
