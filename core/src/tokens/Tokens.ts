import { Token } from "@chuz/domain";
import { Effect } from "effect";

export interface Tokens<A> {
  issue(value: A, timeToLive: Token.TimeToLive): Effect.Effect<Token<A>>;

  lookup(token: Token<A>): Effect.Effect<A, Token.NoSuchToken>;

  findByValue: (a: A) => Effect.Effect<Array<Token<A>>>;

  revoke(token: Token<A>): Effect.Effect<void>;

  revokeMany(tokens: Array<Token<A>>): Effect.Effect<void>;

  revokeAll(value: A): Effect.Effect<void>;
}
