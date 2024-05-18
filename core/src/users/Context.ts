import { Context, Layer } from "@chuz/prelude";
import { Passwords } from "../auth/Passwords";
import * as ReferenceUsers from "./ReferenceUsers";
import { Users as UsersImpl } from "./Users";

export class Users extends Context.Tag("@core/Users")<Users, UsersImpl>() {
  static reference = Layer.effect(Users, ReferenceUsers.make).pipe(Layer.provide(Passwords.layer));
}
