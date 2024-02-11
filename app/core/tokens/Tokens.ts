import { Data, Effect, Equal, Equivalence } from "effect";
import { Phantom } from "~/lib/Phantom";

export interface Tokens<A> {
  issue(value: A, timeToLive: TimeToLive): Effect.Effect<Token<A>>;

  lookup(token: Token<A>): Effect.Effect<A, NoSuchToken>;

  findByValue: (a: A) => Effect.Effect<Array<Token<A>>>;

  revoke(token: Token<A>): Effect.Effect<void>;

  revokeMany(tokens: Array<Token<A>>): Effect.Effect<void>;

  revokeAll(value: A): Effect.Effect<void>;
}

export type Token<A> = Phantom<A, string>;

export const Token = <A>(value: string): Token<A> => Phantom.make<Phantom<A, string>>()(value);
export class NoSuchToken extends Data.TaggedError("NoSuchToken") {}

export const tokenEq: Equivalence.Equivalence<Token<any>> = Equal.equals;

export interface TimeToLive {
  duration: number;
}
export const TimeToLive = (duration: number) => Data.case<TimeToLive>()({ duration });
