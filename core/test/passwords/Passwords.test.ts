import { Passwords } from "../../src";
import { Property } from "../Property";
import { PasswordSpec } from "./PasswordSpec";

const saltRounds = Passwords.SaltRounds(4);

const hash = Passwords.hash(saltRounds);
const match = Passwords.match(saltRounds);

PasswordSpec.run(hash, match, Property.Config.default);
