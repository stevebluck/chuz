import { Data, Equal, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as EmailPassword from "./EmailPassword";

export { EmailPassword };

export type Plain = EmailPassword.Plain | AuthProvider;

export type Secure = EmailPassword.Secure | AuthProvider;

export type ProviderId = (typeof ProviderId)[keyof typeof ProviderId];

export const ProviderId = {
  email: "email",
  google: "google",
  apple: "apple",
} as const;

export class AuthProvider extends S.TaggedClass<AuthProvider>()("AuthProvider", {
  providerId: S.Literal(ProviderId.email, ProviderId.apple, ProviderId.google),
  email: S.EmailAddress,
}) {}

export const Plain = S.Union(EmailPassword.Plain, AuthProvider);

export const Secure = S.Union(EmailPassword.Secure, AuthProvider);

export const matchPlain = Match.typeTags<Plain>();

export const matchSecure = Match.typeTags<Secure>();

export const equals = Equal.equals<Secure>;

export const isEmailProvider = (id: ProviderId): boolean => id === ProviderId.email;

export const isAuthProviderId = (id: ProviderId): boolean => id !== ProviderId.email;

export const isGoogle = (credential: AuthProvider) => credential.providerId === ProviderId.google;

export const isApple = (credential: AuthProvider) => credential.providerId === ProviderId.apple;

export class AlreadyExists extends Data.TaggedError("CredentialAlareadyExists") {}
export class NotRecognised extends Data.TaggedError("CredentialNotRecognised") {}
export class NoFallbackAvailable extends Data.TaggedError("NoFallbackCredentialAvailable") {}
