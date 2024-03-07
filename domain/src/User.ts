import { makeRefinement } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Brand } from "effect";
import { Credentials, Email } from ".";

export interface User extends S.Schema.To<typeof User.schema> {}

export namespace User {
  export const make = Data.case<User>();

  export const schema = S.suspend(() =>
    S.struct({
      firstName: User.FirstName.schema,
      lastName: User.LastName.schema,
      email: Email.schema,
      optInMarketing: User.OptInMarketing.schema,
    }),
  );

  export interface Partial extends S.Schema.To<typeof User.Partial.schema> {}
  export namespace Partial {
    export const schema = S.suspend(() => S.partial(User.schema.pipe(S.omit("email"))));
  }

  export interface Registration extends S.Schema.To<typeof Registration.schema> {}
  export namespace Registration {
    export const schema = S.suspend(() =>
      S.struct({
        credentials: Credentials.Secure,
        firstName: FirstName.schema,
        lastName: LastName.schema,
        optInMarketing: OptInMarketing.schema,
      }),
    );
  }

  export type OptInMarketing = boolean & Brand.Brand<"OptInMarketing">;
  export namespace OptInMarketing {
    export const schema = S.boolean.pipe(S.fromBrand(Brand.nominal<OptInMarketing>()));
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type FirstName = string & Brand.Brand<"FirstName">;
  export namespace FirstName {
    export const schema = S.Trim.pipe(S.minLength(1), S.maxLength(100), S.fromBrand(Brand.nominal<FirstName>()));
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type LastName = string & Brand.Brand<"LastName">;
  export namespace LastName {
    export const schema = S.Trim.pipe(S.minLength(1), S.maxLength(100), S.fromBrand(Brand.nominal<LastName>()));
    export const { from, is, unsafeFrom } = makeRefinement(schema);
  }

  export type UpdateEmailError = User.NotFound | Email.AlreadyInUse;

  export class NotFound extends Data.TaggedError("UserNotFound") {}

  export class Unauthorised extends Data.TaggedError("Unauthorised") {}
}
