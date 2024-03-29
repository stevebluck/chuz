import { Data } from "@chuz/prelude";
import { Id, Identified, Token } from ".";

export class Session<A> extends Data.Class<{
  user: Identified<A>;
  token: Token.Token<Id<A>>;
}> {}
