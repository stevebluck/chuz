import { Data } from "effect";
import { Id, Identified } from "../Identified";
import { Token } from "../tokens/Tokens";
import { User } from "../users/Users";

export interface Session<A extends User> {
  user: Identified<A>;
  token: Token<Id<A>>;
}

export const Session = <A extends User>(user: Identified<A>, token: Token<Id<A>>) =>
  Data.case<Session<A>>()({ user, token });
