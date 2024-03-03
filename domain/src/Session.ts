import { Phantom } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data } from "effect";
import { Id, Identified, Token, User } from ".";

export class Session<A> extends Data.Class<{
  user: Identified<A>;
  token: Token<Id<A>>;
}> {}

export class UserSession extends S.Class<Session<User>>()({
  user: Identified.makeSchema(User.schema),
  token: Phantom.makeSchema<Id<User>>(),
}) {
  static fromString = S.decode(S.parseJson(UserSession));
  static toString = S.encodeSync(S.parseJson(UserSession));
}
