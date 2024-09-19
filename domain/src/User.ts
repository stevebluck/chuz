import { Brand, Data, Equal, Option, Refined, S } from "@chuz/prelude";
import { Email } from "./Email";
import { Id } from "./Identified";

export interface User {
  email: Email;
  firstName: Option.Option<User.FirstName>;
  lastName: Option.Option<User.LastName>;
  optInMarketing: User.OptInMarketing;
}

export namespace User {
  export type FirstName = Brand.Branded<string, "FirstName">;
  export type LastName = Brand.Branded<string, "LastName">;
  export type OptInMarketing = Brand.Branded<boolean, "OptInMarketing">;

  export const OptInMarketing = Refined<OptInMarketing>("OptInMarketing", S.Boolean);
  export const FirstName = Refined<FirstName>("FirstName", S.String100);
  export const LastName = Refined<LastName>("LastName", S.String100);

  export const make = Data.case<User>();

  export const eqId = Equal.equivalence<Id<User>>();

  export interface Patch {
    firstName?: Option.Option<FirstName>;
    lastName?: Option.Option<LastName>;
    optInMarketing?: OptInMarketing;
  }

  const type = "User";

  export class NotFound extends Data.TaggedError(`${type}NotFound`) {}
}
