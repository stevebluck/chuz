import { Data, Effect, Record, S } from "@chuz/prelude";
import { Cookies } from "./Cookies";

export interface FormErrorValue {
  values: unknown;
  errors: Record<string, { message: string; type: S.ArrayFormatter.Issue["_tag"] }>;
}

export class FormError extends Data.TaggedError("FormError")<FormErrorValue> {}

export class Redirect extends Data.TaggedError("Redirect")<{ location: string }> {}

export class NotFound extends Data.TaggedError("NotFound") {}

export class Unauthorized extends Data.TaggedError("Unauthorized") {}

export class Unexpected extends Data.TaggedError("Unexpected")<{ error: string }> {}

export const ServerResponse = {
  FormError: (params: FormErrorValue) => new FormError(params),
  FormRootError: (message: string) => new FormError({ errors: { root: { type: "Type", message } }, values: {} }),
  Unexpected: <E extends { _tag: string }>(e: E) => new Unexpected({ error: e._tag }),
  NotFound: new NotFound(),
  Unauthorized: new Unauthorized(),
  Redirect: (location: string) => new Redirect({ location }),
  ReturnTo: (fallback: string) =>
    Effect.gen(function* () {
      const returnTo = yield* Cookies.returnTo;

      return yield* returnTo.find.pipe(
        Effect.flatten,
        Effect.mapError(() => new Redirect({ location: fallback })),
        Effect.flatMap((url) => new Redirect({ location: url })),
        Effect.merge,
        Effect.tap(() => returnTo.remove),
        Effect.flip,
      );
    }),
};
