import { Context } from "effect";
import { Users } from "./users/Users";

export type Capabilities = {
  users: Users;
};

export const Capabilities = Context.GenericTag<Capabilities>("Capabilities");
