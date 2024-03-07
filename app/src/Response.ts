import { Data, Effect } from "effect";
import { Context as _Context } from "effect";

export namespace Response {
  export class Redirect extends Data.TaggedError("Redirect")<{ location: string }> {
    static make = (location: string) => new Redirect({ location });
  }

  export type Failure<E> = { _tag: "Failure"; error: E };
  export const Failure = <E>(error: E): Failure<E> => ({ _tag: "Failure", error });

  export type Success<A> = { _tag: "Success"; data: A };
  export const Success = <A>(data: A): Success<A> => ({ _tag: "Success", data });

  export class Result<A, E> extends Data.TaggedClass("Result")<{
    value: Success<A> | Failure<E>;
  }> {
    static fail = <A, E>(error: E) => Effect.sync(() => new Result<A, E>({ value: Failure(error) }));

    static succeed = <A, E>(data: A) => Effect.sync(() => new Result<A, E>({ value: Success(data) }));
  }

  export const isRedirect = (e: unknown): e is Redirect => e instanceof Redirect;
}

export const Result = Response.Result;
export const Redirect = Response.Redirect;
