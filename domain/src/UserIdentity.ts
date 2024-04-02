import { Data, Equal, Equivalence, S } from "@chuz/prelude";
import * as Credentials from "./Credentials";

export type Identity = Data.TaggedEnum<{
  EmailPassword: {
    email: S.EmailAddress;
  };
  SocialProvider: {
    provider: Credentials.SocialCredentialProvider;
    email: S.EmailAddress;
  };
}> & {};

export const { EmailPassword, SocialProvider } = Data.taggedEnum<Identity>();

export const fromCredential = Credentials.matchSecure({
  Secure: (secure) => EmailPassword({ email: secure.email }),
  SocialCredential: (social) => SocialProvider({ email: social.email, provider: social.provider }),
});

export const equals: Equivalence.Equivalence<Identity> = Equal.equals;
