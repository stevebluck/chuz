import { Array, Data, Option, Record } from "@chuz/prelude";
import * as Credential from "./auth/Credential";
import { Email } from "./emails/Email";

export type Identities = Record<Identity["_tag"], Option.Option<{ email: Email }>>;

export type Identity = Data.TaggedEnum<{
  Email: { email: Email };
  // TODO: email can be optional
  Google: { email: Email };
  // TODO: email can be optional
  Apple: { email: Email };
}>;

export const Identity = Data.taggedEnum<Identity>();

export const hasSocialIdentity = (identities: Identities): boolean => {
  const authProviderCredentials = Record.filter(
    identities,
    (_, id) => !Credential.eqv(id, Credential.ProviderId.Email),
  );
  return Array.findFirst(Record.values(authProviderCredentials), Option.isSome).pipe(Option.isSome);
};

export const hasEmailIdentity = (identities: Identities): boolean => {
  return Option.isSome(identities.Email);
};

export const fromCredential: (credential: Credential.Secure) => Identity = Credential.Secure.match({
  Email: ({ email }) => Identity.Email({ email }),
  Google: ({ email }) => Identity.Google({ email }),
  Apple: ({ email }) => Identity.Apple({ email }),
});
