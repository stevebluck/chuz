import { Token } from "@chuz/domain";
import { Effect } from "effect";

export interface Tokens<A> {
  issue(value: A, timeToLive: Token.TimeToLive): Effect.Effect<Token.Token<A>>;

  lookup(token: Token.Token<A>): Effect.Effect<A, Token.NoSuchToken>;

  findByValue: (a: A) => Effect.Effect<Array<Token.Token<A>>>;

  revoke(token: Token.Token<A>): Effect.Effect<void>;

  revokeMany(tokens: Array<Token.Token<A>>): Effect.Effect<void>;

  revokeAll(value: A): Effect.Effect<void>;
}
