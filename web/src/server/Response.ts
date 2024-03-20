import { Data, Effect } from "effect";
import { Context as _Context } from "effect";

export class Redirect extends Data.TaggedClass("Redirect")<{ location: string }> {
  static make = (location: string) => Effect.sync(() => new Redirect({ location }));
  static is = <A>(a: A | Redirect): a is Redirect => a instanceof Redirect;
}

export class ValidationError extends Data.TaggedClass("ValidationError")<{ error: Record<string, string[]> }> {
  static make = (error: Record<string, string[]>) => Effect.sync(() => new ValidationError({ error }));
  static is = <A>(a: A | ValidationError): a is ValidationError => a instanceof ValidationError;
}

export class Unauthorized extends Data.TaggedClass("Unauthorized")<{}> {
  static make = Effect.sync(() => new Unauthorized());
  static is = <A>(a: A | Unauthorized): a is Unauthorized => a instanceof ValidationError;
}
