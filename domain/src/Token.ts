import { Phantom } from "@chuz/prelude";
import { Data, Equal } from "effect";

export type Token<A> = Phantom<A, string>;

export namespace Token {
  export const make = <A>(value: string): Token<A> => Phantom.make<Phantom<A, string>>()(value);
  export class NoSuchToken extends Data.TaggedError("NoSuchToken") {}
  export class InvalidToken extends Data.TaggedError("InvalidToken") {}
  export const equals = Equal.equivalence<Token<any>>();
  export class TimeToLive extends Data.Class<{ duration: number }> {}
}
