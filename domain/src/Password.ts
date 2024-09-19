import { Equivalence, Equal, Brand, Refined } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Email } from "./Email";
import { Id } from "./Identified";
import { Token as T } from "./Token";
import { User } from "./User";

export namespace Password {
  export type Plaintext = Brand.Branded<string, "PlaintextPassword">;
  export type Strong = Brand.Branded<string, "StrongPassword">;
  export type Hashed = Brand.Branded<string, "HashedPassword">;

  export const Plaintext = Refined<Plaintext>("PlaintextPassword", S.NonEmptyString);

  export const Strong = Refined<Strong>("StrongPassword", S.String.pipe(S.minLength(8), S.maxLength(64)));

  export const Hashed = Refined<Hashed>("HashedPassword", S.NonEmptyString);

  export type Reset = [Email, Id<User>];

  export namespace Reset {
    export type Token = T<[Email, Id<User>]>;
    export const eq = Equivalence.make<Reset>(([email1, id1], [email2, id2]) => Equal.equals(email1, email2) && Equal.equals(id1, id2));
  }
}
