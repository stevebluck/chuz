import { Data, Equal, Equivalence } from "effect";
import { Email } from "../emails/Email";
import { Password, Passwords } from "./Passwords";

export namespace Credentials {
  export interface Plain {
    email: Email;
    password: Password.Plaintext;
  }
  export const Plain = (email: Email, password: Password.Plaintext): Plain => Data.case<Plain>()({ email, password });

  export interface Strong {
    email: Email;
    password: Password.Strong;
  }
  export const Strong = (email: Email, password: Password.Strong): Strong => Data.case<Strong>()({ email, password });

  export interface Secure {
    email: Email;
    password: Passwords.Hashed;
  }
  export const Secure = (email: Email, password: Passwords.Hashed) => Data.case<Secure>()({ email, password });

  export const equals: Equivalence.Equivalence<Secure> = Equal.equals;

  export class NotRecognised extends Data.TaggedError("CredentialsNotRecognised") {}
}
