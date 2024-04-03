import { Data, Equal, Equivalence, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";

export { EmailPassword };

export type Plain = EmailPassword.Plain | Social;

export type Secure = EmailPassword.Secure | Social;

export type SocialProvider = S.Schema.Type<typeof SocialProvider>;

export type SocialId = S.Schema.Type<typeof SocialId>;

export class Social extends S.TaggedClass<Social>()("Social", {
  id: S.NonEmpty.pipe(S.brand("SocialId")),
  provider: S.literal("google", "apple"),
  email: S.EmailAddress,
}) {
  static equals: Equivalence.Equivalence<Social> = Equal.equals;
}

export const SocialId = Social.fields.id;

export const SocialProvider = Social.fields.provider;

export const Plain = S.union(EmailPassword.Plain, Social);

export const Secure = S.union(EmailPassword.Secure, Social);

export const matchPlain = Match.typeTags<Plain>();

export const matchSecure = Match.typeTags<Secure>();

export const isEmailPassword = (credential: Secure): credential is EmailPassword.Secure =>
  S.is(EmailPassword.Secure)(credential);

export const isSocialIdentity = (credential: Secure): credential is EmailPassword.Secure => S.is(Social)(credential);

export const equals: Equivalence.Equivalence<Secure> = Equal.equals;

export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
