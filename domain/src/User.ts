import { Data, Option } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import * as _ from ".";
import { Email } from "./Email";

export interface User {
  email: Email;
  firstName: Option.Option<FirstName>;
  lastName: Option.Option<LastName>;
  optInMarketing: OptInMarketing;
}

export type Id = _.Id<User>;
export type Session = _.Session<User>;
export type Token = _.Token.Token<Id>;
export type Identified = _.Identified<User>;

export type FirstName = S.Schema.Type<typeof FirstName>;
export type LastName = S.Schema.Type<typeof LastName>;
export type OptInMarketing = S.Schema.Type<typeof OptInMarketing>;
export interface Partial extends S.Schema.Type<typeof Partial> {}
export interface Registration extends S.Schema.Type<typeof Registration> {}

export const schema = S.suspend(() =>
  S.struct({
    email: _.Email.schema,
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

export const Partial = S.suspend(() => S.partial(schema.pipe(S.omit("email"))));

export const Registration = S.suspend(() =>
  S.struct({
    credentials: _.Credentials.Secure,
    firstName: S.option(FirstName),
    lastName: S.option(LastName),
    optInMarketing: OptInMarketing,
  }),
);

export type UpdateEmailError = NotFound | _.Email.AlreadyInUse;

export class NotFound extends Data.TaggedError("UserNotFound") {}
