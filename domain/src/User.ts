import { Data, Equal, Option, Record, S } from "@chuz/prelude";
import { Email } from "./Email";
import { Id } from "./Identified";
import * as Identity from "./Identity";

export const OptInMarketing = S.Boolean.pipe(S.brand("OptInMarketing"));

export const FirstName = S.String100.pipe(S.brand("FirstName"));

export const LastName = S.String100.pipe(S.brand("LastName"));

export class User extends S.Class<User>("User")({
  email: Email,
  firstName: S.Option(FirstName),
  lastName: S.Option(LastName),
  optInMarketing: OptInMarketing,
}) {}

export const make = Data.case<User>();

export const eqId = Equal.equivalence<Id<User>>();

export class Partial extends S.Class<Partial>("Partial")({
  firstName: S.Option(FirstName),
  lastName: S.Option(LastName),
  optInMarketing: OptInMarketing,
}) {}

export class Draft extends S.Class<Draft>("Draft")({
  firstName: S.Option(FirstName),
  lastName: S.Option(LastName),
  optInMarketing: OptInMarketing,
}) {
  static make = Data.case<Draft>();
}

export class Identities extends S.Class<Identities>("Identities")({
  EmailPassword: S.OptionFromNullOr(Identity.EmailPassword),
  Google: S.OptionFromNullOr(Identity.Google),
  Apple: S.OptionFromNullOr(Identity.Apple),
}) {
  static encode = S.encode(this);
}

export const hasFallbackIdentity = (identities: Identities): boolean =>
  Record.values(identities).filter(Option.isSome<Identity.Type>).length > 1;
