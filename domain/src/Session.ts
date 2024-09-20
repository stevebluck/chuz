import { Data } from "@chuz/prelude";
import { Id, Identified } from "./Identified";
import { Token } from "./Token";
import { User } from "./User";

export interface Session {
  user: Identified<User>;
  token: Token<Id<User>>;
}

export namespace Session {
  export const make =
    (user: Identified<User>) =>
    (token: Token<Id<User>>): Session =>
      Data.case<Session>()({ user, token });
}
