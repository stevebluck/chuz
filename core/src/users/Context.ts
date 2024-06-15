import { Context } from "@chuz/prelude";
import { Users as UsersImpl } from "./Users";

export class Users extends Context.Tag("@core/Users")<Users, UsersImpl>() {}
