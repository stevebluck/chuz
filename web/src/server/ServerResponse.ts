import { Context, Data, Effect, Record, S } from "@chuz/prelude";
import { Cookies } from "./Cookies";
import type { Serializable } from "./Remix";

export type ServerResponse<A extends Serializable> =
  | Ok<A>
  | FormError
  | Redirect
  | NotFound
  | Unauthorized
  | Unexpected;

export class Ok<A extends Serializable> extends Data.TaggedClass("Ok")<{ data: A }> {}

export class FormError extends Data.TaggedError("FormError")<{
  values: unknown;
  errors: Record<string, { message: string; type: S.ArrayFormatter.Issue["_tag"] }>;
}> {}
export class Redirect extends Data.TaggedError("Redirect")<{ location: string }> {}
export class NotFound extends Data.TaggedError("NotFound") {}
export class Unauthorized extends Data.TaggedError("Unauthorized") {}
export class Unexpected extends Data.TaggedError("Unexpected")<{ error: string }> {}

export const ServerResponse = {
  Ok: <A extends Serializable>(data: A) => new Ok({ data }),
  FormError: (params: ConstructorParameters<typeof FormError>[0]) => new FormError(params),
  FormRootError: (message: string) => new FormError({ errors: { root: { type: "Type", message } }, values: {} }),
  Unexpected: <E extends { _tag: string }>(e: E) => new Unexpected({ error: e._tag }),
  NotFound: new NotFound(),
  Unauthorized: new Unauthorized(),
  Redirect: (location: string) => new Redirect({ location }),
  isUnauthorized: <A extends Serializable>(res: ServerResponse<A>): res is Unauthorized => res._tag === "Unauthorized",
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

export interface Response {
  readonly _: unique symbol;
}
export const Response = Context.GenericTag<Response, { headers: Headers; status: number | undefined }>(
  "@services/Response",
);
