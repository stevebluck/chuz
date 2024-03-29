import { Phantom } from "@chuz/prelude";
import { Data, Equal } from "@chuz/prelude";

export type Token<A> = Phantom<A, string>;

export const make = <A>(value: string): Token<A> => Phantom.make<Phantom<A, string>>()(value);
export class NoSuchToken extends Data.TaggedError("NoSuchToken") {}
export const equals = Equal.equivalence<Token<any>>();
export class TimeToLive extends Data.Class<{ duration: number }> {}
