import { Data, Effect, PR, S } from "@chuz/prelude";
import { Cookies } from "./Cookies";

export interface Succeed<A> {
  _tag: "Succeed";
  data: A;
}

export const Succeed = <A>(data: A) => Data.tagged<Succeed<A>>("Succeed")({ data });

export interface ValidationError {
  _tag: "ValidationError";
  error: Array<S.ArrayFormatter.Issue>;
}

export const ValidationError = Data.tagged<ValidationError>("ValidationError");

export interface BadRequest<E extends { _tag: string }> {
  _tag: "BadRequest";
  error: E;
}
export const BadRequest = <E extends { _tag: string }>(e: E) => Data.tagged<BadRequest<E>>("BadRequest")({ error: e });

export class Redirect extends Data.TaggedClass("Redirect")<{ location: string }> {}

export class NotFound extends Data.TaggedError("NotFound") {}

export class Unexpected extends Data.TaggedError("Unexpected")<{ error: string }> {}

export class Unauthorized extends Data.TaggedError("Unauthorized") {}

const ReturnTo = (fallback: string) =>
  Effect.gen(function* () {
    const returnTo = yield* Cookies.returnTo;

    return yield* Cookies.returnTo.pipe(
      Effect.flatMap((returnTo) => returnTo.find),
      Effect.flatten,
      Effect.tap(() => returnTo.remove),
      Effect.map((url) => ActionResponse.Redirect(url)),
      Effect.mapError(() => ActionResponse.Redirect(fallback)),
    );
  });

export const ActionResponse = {
  Redirect: (location: string) => new Redirect({ location }),
  FailWithRedirect: (location: string) => Effect.fail(new Redirect({ location })),
  NotFound: new NotFound(),
  Unauthorized: new Unauthorized(),
  Unexpected: <E extends { _tag: string }>(error: E) => new Unexpected({ error: error._tag }),
  ValidationError: (error: PR.ParseError): Effect.Effect<never, BadRequest<ValidationError>> => {
    return Effect.failSync(() => BadRequest(ValidationError({ error: S.ArrayFormatter.formatErrorSync(error) })));
  },
  BadRequest: <A, I extends { _tag: string }, R>(schema: S.Schema<A, I, R>) => {
    const encode = S.encode(schema);
    return (a: A): Effect.Effect<never, BadRequest<I>, R> =>
      encode(a).pipe(
        Effect.orDie,
        Effect.flatMap((e) => Effect.failSync(() => BadRequest(e))),
      );
  },
  ReturnTo,
};

export const LoaderResponse = {
  Succeed: <A>(data: A) => Succeed(data),
  Redirect: (location: string) => new Redirect({ location }),
  FailWithRedirect: (location: string) => Effect.fail(new Redirect({ location })),
  NotFound: new NotFound(),
  Unauthorized: new Unauthorized(),
  ReturnTo,
  Unexpected: <E extends { _tag: string }>(error: E) => new Unexpected({ error: error._tag }),
};
