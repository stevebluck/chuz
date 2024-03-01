import { Effect } from "effect";
import { Users } from "./users/Users";

export interface Capabilities {
  users: Users;
}

export namespace Capabilities {
  export const make: Effect.Effect<Capabilities, never, Users> = Effect.all({ users: Users });
}
