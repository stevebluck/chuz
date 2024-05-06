import { Phantom } from "@chuz/prelude";
import { Data, Equal } from "@chuz/prelude";

export type Token<A> = Phantom<A, string>;

export const make = <A>(value: string): Token<A> => Phantom.make<Phantom<A, string>>()(value);

export const equals = <A>(a: Token<A>, b: Token<A>) => Equal.equivalence<Token<A>>()(a, b);

export class TimeToLive extends Data.Class<{ duration: number }> {}
