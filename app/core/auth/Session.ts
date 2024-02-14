import { Data } from "effect";
import { Id, Identified } from "../Identified";
import { Token } from "../tokens/Tokens";

export interface Session<A> {
  user: Identified<A>;
  token: Token<Id<A>>;
}

export const Session = <A>(user: Identified<A>, token: Token<Id<A>>) => Data.case<Session<A>>()({ user, token });
