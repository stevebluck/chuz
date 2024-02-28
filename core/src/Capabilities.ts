import { Clock, Data } from "effect";
import { Passwords } from "./passwords/Passwords";
import { Users } from "./users/Users";

// TODO: make all layers here
// Capabilities.Live
// Capabilities.Test

export class Capabilities extends Data.Class<{
  users: Users;
  clock: Clock.Clock;
}> {}
