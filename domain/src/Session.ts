import { Data } from "@chuz/prelude";
import { Id, Identified } from "./Identified";
import { Token } from "./Token";

export class Session<A> extends Data.Class<{
  user: Identified<A>;
  token: Token<Id<A>>;
}> {}
