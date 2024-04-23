import { Data, Option, S } from "@chuz/prelude";
import * as Credential from "./Credential";

export type Identities = [Option.Option<EmailPassword>, Array<Social>];

type EmailPassword = {
  _tag: "Email";
  email: S.EmailAddress;
};

export type Social = {
  _tag: "Social";
  email: S.EmailAddress;
  provider: Credential.SocialProvider;
};

export const Social = Data.tagged<Social>("Social");
export const EmailPassword = Data.tagged<EmailPassword>("Email");

export const fromEmailCredential = (credential: Credential.EmailPassword.Secure): EmailPassword =>
  EmailPassword({ email: credential.email });

export const fromSocialCredential = (credential: Credential.Social): Social =>
  Social({ email: credential.email, provider: credential.provider });

export const fromCredential = Credential.matchSecure({
  Secure: fromEmailCredential,
  Social: fromSocialCredential,
});
