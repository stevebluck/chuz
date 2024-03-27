import * as S from "@effect/schema/Schema";
import { Data, Match } from "effect";
import * as EmailPassword from "./EmailPassword";
import { IdentityProvider } from "./IdentityProvider";

export type Plain = EmailPassword.Plain | IdentityProvider;

export type Secure = EmailPassword.Secure | IdentityProvider;

export const Plain = S.union(EmailPassword.Plain, IdentityProvider);

export const Secure = S.union(EmailPassword.Secure, IdentityProvider);

export const matchPlain = Match.typeTags<Plain>();

export const isEmailPassword = S.is(EmailPassword.Secure);

export const isProvider = S.is(IdentityProvider);

export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
