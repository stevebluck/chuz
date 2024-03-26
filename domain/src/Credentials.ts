import { Data, Equal, Equivalence, Match } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import { schema } from "./Email";
import * as EmailPassword from "./EmailPassword";

export * as EmailPassword from "./EmailPassword";

export type Plain = EmailPassword.Plain | IdentityProvider;

export type Secure = EmailPassword.Secure | IdentityProvider;

export class IdentityProvider extends S.TaggedClass<IdentityProvider>()("IdentityProvider", {
  id: S.string.pipe(S.brand("IdentityProviderId")),
  email: schema,
}) {
  static equals: Equivalence.Equivalence<IdentityProvider> = Equal.equals;
}

export const Plain = S.union(EmailPassword.Plain, IdentityProvider);

export const Secure = S.union(EmailPassword.Secure, IdentityProvider);

export const matchPlain = Match.typeTags<Plain>();

export const isEmailPassword = S.is(EmailPassword.Secure);

export const isProvider = S.is(IdentityProvider);

export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
