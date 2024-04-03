import { Data, Option } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as Domain from ".";
import * as identity from "./UserIdentity";

export { identity };

export interface User {
  email: S.EmailAddress;
  firstName: Option.Option<FirstName>;
  lastName: Option.Option<LastName>;
  optInMarketing: OptInMarketing;
}

export type Id = Domain.Id<User>;
export type Session = Domain.Session<User>;
export type Token = Domain.Token.Token<Id>;
export type Identified = Domain.Identified<User>;

export type FirstName = S.Schema.Type<typeof FirstName>;
export type LastName = S.Schema.Type<typeof LastName>;
export type OptInMarketing = S.Schema.Type<typeof OptInMarketing>;
export interface Partial extends S.Schema.Type<typeof Partial> {}
export interface Registration extends S.Schema.Type<typeof Registration> {}

export const schema = S.suspend(() =>
  S.struct({
    email: S.EmailAddress,
    firstName: S.optionFromNullable(FirstName),
    lastName: S.optionFromNullable(LastName),
    optInMarketing: OptInMarketing,
  }),
);

export const make = Data.case<User>();

export const from = S.decode(schema);

export const OptInMarketing = S.boolean.pipe(S.brand("OptInMarketing"));

export const FirstName = S.String100.pipe(S.brand("FirstName"));

export const LastName = S.String100.pipe(S.brand("LastName"));

export const Partial = S.suspend(() => schema.pipe(S.omit("email")));

export const Registration = S.suspend(() =>
  S.struct({
    credentials: Domain.Credentials.SecureCredential,
    firstName: S.option(FirstName),
    lastName: S.option(LastName),
    optInMarketing: OptInMarketing,
  }),
);

export type UpdateEmailError = NotFound | EmailAlreadyInUse;

export class NotFound extends Data.TaggedError("UserNotFound") {}

export class EmailAlreadyInUse extends S.TaggedError<EmailAlreadyInUse>()("EmailAlreadyInUse", {
  email: S.EmailAddress,
}) {}
export class LastCredentialError extends S.TaggedError<LastCredentialError>()("LastCredentialError", {}) {}
export class CredentialInUse extends S.TaggedError<LastCredentialError>()("CredentialInUse", {}) {}
