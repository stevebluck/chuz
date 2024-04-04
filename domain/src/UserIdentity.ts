import { Data, Equal, Equivalence, Match, S } from "@chuz/prelude";
import * as Credentials from "./Credentials";

export type Identity = Data.TaggedEnum<{
  Email: {
    email: S.EmailAddress;
  };
  Social: {
    provider: Credentials.SocialProvider;
    email: S.EmailAddress;
  };
}> & {};

export const { Email, Social } = Data.taggedEnum<Identity>();

export const fromCredential = Credentials.matchSecure({
  Secure: (secure) => Email({ email: secure.email }),
  Social: (social) => Social({ email: social.email, provider: social.provider }),
});

export const equals: Equivalence.Equivalence<Identity> = Equal.equals;

export const isEmail = (identity: Identity): identity is ReturnType<typeof Email> => identity._tag === "Email";

export const match = Match.typeTags<Identity>();
