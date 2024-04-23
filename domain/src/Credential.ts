import { Data, Equal, Equivalence, Match, Number, Option, Tuple } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";
import { identity } from "./User";

export { EmailPassword };

export type Plain = EmailPassword.Plain | Social;

export type Secure = EmailPassword.Secure | Social;

export type Provider = SocialProvider | "email";

export type SocialProvider = "google" | "apple";

export type SocialId = S.Schema.Type<typeof SocialId>;
export const SocialId = S.NonEmpty.pipe(S.brand("SocialId"));

export const SocialProvider: S.Schema<SocialProvider> = S.Literal("google", "apple");

export class Social extends S.TaggedClass<Social>()("Social", {
  id: SocialId,
  provider: SocialProvider,
  email: S.EmailAddress,
}) {
  static equals: Equivalence.Equivalence<Social> = Equal.equals;
}

export const hasFallbackCredential = (identities: identity.Identities) =>
  Option.isSome(Tuple.getFirst(identities)) || Number.greaterThan(Tuple.getSecond(identities).length, 1);

export const Plain = S.Union(EmailPassword.Plain, Social);

export const Secure = S.Union(EmailPassword.Secure, Social);

export const matchPlain = Match.typeTags<Plain>();

export const matchSecure = Match.typeTags<Secure>();

export const isEmailPassword = (credential: Secure): credential is EmailPassword.Secure =>
  S.is(EmailPassword.Secure)(credential);

export const isSocialIdentity = (credential: Secure): credential is EmailPassword.Secure => S.is(Social)(credential);

export const equals = Equal.equals<Secure>;

export class AlreadyExists extends Data.TaggedError("CredentialAlareadyExists") {}
export class NotRecognised extends Data.TaggedError("CredentialNotRecognised") {}
export class NoFallbackAvailable extends Data.TaggedError("NoFallbackCredentialAvailable") {}
