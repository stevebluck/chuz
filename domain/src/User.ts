import { makeRefinement } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Brand, Option } from "effect";
import { Credentials, Email } from ".";

export interface User extends S.Schema.Type<typeof User.schema> {}

export namespace User {
  export const make = Data.case<User>();

  export const schema = S.suspend(() =>
    S.struct({
      email: Email.schema,
      firstName: S.optionFromNullable(User.FirstName.schema),
      lastName: S.optionFromNullable(User.LastName.schema),
      optInMarketing: User.OptInMarketing.schema,
    }),
  );

  export const parse = S.decode(schema);

  export interface Partial extends S.Schema.Type<typeof User.Partial.schema> {}
  export namespace Partial {
    export const schema = S.suspend(() => S.partial(User.schema.pipe(S.omit("email")))).pipe(
      S.identifier("User.Partial"),
    );
  }

  export interface Registration {
    credentials: Credentials.Secure;
    firstName: Option.Option<User.FirstName>;
    lastName: Option.Option<User.LastName>;
    optInMarketing: User.OptInMarketing;
  }

  export namespace Registration {
    export const make = Data.case<Registration>();
  }

  export type OptInMarketing = boolean & Brand.Brand<"User.OptInMarketing">;
  export namespace OptInMarketing {
    export const schema = S.boolean.pipe(
      S.fromBrand(Brand.nominal<OptInMarketing>()),
      S.identifier("User.OptInMarketing"),
    );
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type FirstName = string & Brand.Brand<"User.FirstName">;
  export namespace FirstName {
    export const schema = S.Trim.pipe(
      S.minLength(1),
      S.maxLength(100),
      S.fromBrand(Brand.nominal<FirstName>()),
      S.identifier("User.FirstName"),
    );
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type LastName = string & Brand.Brand<"User.LastName">;
  export namespace LastName {
    export const schema = S.Trim.pipe(
      S.minLength(1),
      S.maxLength(100),
      S.fromBrand(Brand.nominal<LastName>()),
      S.identifier("User.LastName"),
    );
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type UpdateEmailError = User.NotFound | Email.AlreadyInUse;

  export class NotFound extends Data.TaggedError("UserNotFound") {}

  export class Unauthorised extends Data.TaggedError("Unauthorised") {}
}
