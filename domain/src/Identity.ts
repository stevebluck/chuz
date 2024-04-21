import { Data, Option, S } from "@chuz/prelude";
import * as Credentials from "./Credential";

export type Identities = [Option.Option<EmailPassword>, Array<Social>];

export const Identities = S.tuple(S.option(Credentials.EmailPassword.Secure), S.array(Credentials.Social));

type EmailPassword = {
  email: S.EmailAddress;
};

export type Social = {
  email: S.EmailAddress;
  provider: Credentials.SocialProvider;
};

const Social = Data.case<Social>();
const EmailPassword = Data.case<EmailPassword>();

export const fromCredential = Credentials.matchSecure({
  Secure: (secure) => EmailPassword({ email: secure.email }),
  Social: (social) => Social({ email: social.email, provider: social.provider }),
});
