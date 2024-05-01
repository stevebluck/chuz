import { Data, Equal, Option } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as identity from "./Identity";
import { Email } from "./emails/Email";
import type * as Domain from "./index";

export { identity };

export interface User {
  email: Email;
  firstName: Option.Option<FirstName>;
  lastName: Option.Option<LastName>;
  optInMarketing: OptInMarketing;
}

// TODO: remove
export type Id = Domain.Id<User>;
export type Session = Domain.Session<User>;
export type Token = Domain.Token.Token<Id>;
export type Identified = Domain.Identified<User>;

export type FirstName = S.Schema.Type<typeof FirstName>;
export type LastName = S.Schema.Type<typeof LastName>;
export type OptInMarketing = S.Schema.Type<typeof OptInMarketing>;
export interface Partial extends S.Schema.Type<typeof Partial> {}

export const OptInMarketing = S.Boolean.pipe(S.brand("OptInMarketing"));

export const FirstName = S.String100.pipe(S.brand("FirstName"));

export const LastName = S.String100.pipe(S.brand("LastName"));

// TODO: change to class and put methods here
export const User = S.Struct({
  email: Email,
  firstName: S.Option(FirstName),
  lastName: S.Option(LastName),
  optInMarketing: OptInMarketing,
});

export const make = Data.case<User>();
export const eqId = Equal.equivalence<Id>();

export const Partial = User.pipe(S.omit("email"));
