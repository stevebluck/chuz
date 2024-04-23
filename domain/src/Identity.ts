import { Array, Data, Option, Record, S } from "@chuz/prelude";
import * as Credential from "./Credential";

export type Identities = Record<Credential.ProviderId, Option.Option<Identity>>;

export type Identity = {
  email: S.EmailAddress;
  providerId: Credential.ProviderId;
};

export const Identity = Data.case<Identity>();

export const hasSocialIdentity = (identities: Identities): boolean => {
  const authProviderCredentials = Record.filter(identities, (_, id) => Credential.isAuthProviderId(id));
  return Array.findFirst(Record.values(authProviderCredentials), Option.isSome).pipe(Option.isSome);
};

export const hasEmailIdentity = (identities: Identities): boolean => {
  return Option.isSome(identities.email);
};

export const fromCredential = (credential: Credential.Secure): Identity =>
  Identity({ email: credential.email, providerId: credential.providerId });
