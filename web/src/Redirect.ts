import { Data, Effect } from "effect";
import { Context as _Context } from "effect";

export class Redirect extends Data.TaggedClass("Redirect")<{ location: string }> {
  static make = (location: string) => Effect.sync(() => new Redirect({ location }));
  static isRedirect = <A>(a: A | Redirect): a is Redirect => a instanceof Redirect;
}
