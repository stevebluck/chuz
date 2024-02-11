import { Clock, Context } from "effect";
import { Decks } from ".";
import { Passwords } from "./auth/Passwords";
import { Users } from "./users/Users";

export interface Capabilities {
  hasher: Passwords.Hasher;
  users: Users;
  decks: Decks;
  clock: Clock.Clock;
}

export class CapabilitiesTag extends Context.Tag("Capabilities")<CapabilitiesTag, Capabilities>() {}

export namespace Capabilities {
  export const make = (hasher: Passwords.Hasher, users: Users, decks: Decks, clock: Clock.Clock): Capabilities => ({
    hasher,
    users,
    decks,
    clock,
  });
}
