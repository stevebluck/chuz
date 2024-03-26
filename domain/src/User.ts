import * as S from "@effect/schema/Schema";
import { Data } from "effect";
import { Credential, Email } from ".";

export interface User extends S.Schema.Type<typeof User.schema> {}

export namespace User {
  export const schema = S.suspend(() =>
    S.struct({
      email: Email.schema,
      firstName: S.optionFromNullable(User.FirstName.schema),
      lastName: S.optionFromNullable(User.LastName.schema),
      optInMarketing: User.OptInMarketing.schema,
    }),
  );

  export const make = Data.case<User>();

  export const from = S.decode(schema);
}

export namespace User {
  export type FirstName = S.Schema.Type<typeof User.FirstName.schema>;
  export type LastName = S.Schema.Type<typeof User.LastName.schema>;
  export type OptInMarketing = S.Schema.Type<typeof User.LastName.schema>;

  export interface Partial extends S.Schema.Type<typeof Partial.schema> {}
  export interface Registration extends S.Schema.Type<typeof Registration.schema> {}

  export namespace OptInMarketing {
    export const schema = S.boolean.pipe(S.brand("OptInMarketing"));
    export const unsafeFrom = S.decodeSync(schema);
  }

  export namespace FirstName {
    export const schema = S.Trim.pipe(S.minLength(1), S.maxLength(100), S.brand("FirstName"));
    export const unsafeFrom = S.decodeSync(schema);
  }

  export namespace LastName {
    export const schema = S.Trim.pipe(S.minLength(1), S.maxLength(100), S.brand("LastName"));
    export const unsafeFrom = S.decodeSync(schema);
  }
  export namespace Partial {
    export const schema = S.suspend(() => S.partial(User.schema.pipe(S.omit("email"))));
  }

  export namespace Registration {
    export const schema = S.suspend(() =>
      S.struct({
        credentials: Credential.schema,
        firstName: S.option(User.FirstName.schema),
        lastName: S.option(User.LastName.schema),
        optInMarketing: User.OptInMarketing.schema,
      }),
    );

    export const fromProviderCredential = (credential: Credential.Provider) =>
      make({
        credentials: credential,
        firstName: credential.firstName,
        lastName: credential.lastName,
        optInMarketing: User.OptInMarketing.unsafeFrom(true),
      });

    export const make = Data.case<Registration>();
  }

  export type UpdateEmailError = User.NotFound | Email.AlreadyInUse;

  export class NotFound extends Data.TaggedError("UserNotFound") {}
}
