import { Data } from "@chuz/prelude";
import { Tokens } from "./tokens/Tokens";
import { Users } from "./users/Users";

export interface Capabilities {
  users: Users;
}

export const Capabilities = Data.case<Capabilities>();
