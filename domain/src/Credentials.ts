import { Data, Equal, Equivalence, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";

export type PlainCredential = EmailPassword.Plain | SocialCredential;

export type SecureCredential = EmailPassword.Secure | SocialCredential;

export type SocialCredentialProvider = S.Schema.Type<typeof SocialCredentialProvider>;

export type SocialCredentialId = S.Schema.Type<typeof SocialCredentialId>;

export class SocialCredential extends S.TaggedClass<SocialCredential>()("SocialCredential", {
  id: S.NonEmpty.pipe(S.brand("SocialCredentialId")),
  provider: S.literal("google", "apple"),
  email: S.EmailAddress,
}) {
  static equals: Equivalence.Equivalence<SocialCredential> = Equal.equals;
}

export const SocialCredentialId = SocialCredential.fields.id;

export const SocialCredentialProvider = SocialCredential.fields.provider;

export const PlainCredential = S.union(EmailPassword.Plain, SocialCredential);

export const SecureCredential = S.union(EmailPassword.Secure, SocialCredential);

export const matchPlain = Match.typeTags<PlainCredential>();

export const matchSecure = Match.typeTags<SecureCredential>();

export const isEmailPassword = S.is(EmailPassword.Secure);

export const isSocialIdentity = S.is(SocialCredential);

export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
