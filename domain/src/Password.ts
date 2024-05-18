import { Equivalence, Brand, Equal } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Email } from "./Email";
import { Id } from "./Identified";

export type Plaintext = string & Brand.Brand<"PlaintextPassword">;
export type Strong = string & Brand.Brand<"StrongPassword">;
export type Hashed = string & Brand.Brand<"HashedPassword">;
export type Reset<A> = [Email, A];

export const Plaintext = S.NonEmpty.pipe(S.brand("PlaintextPassword"));

export const Strong = S.String.pipe(
  S.minLength(8),
  S.maxLength(64),
  S.brand("StrongPassword"),
  S.message(() => "Your password needs to be a bit stronger!"),
);

export const Hashed = S.NonEmpty.pipe(S.brand("HashedPassword"));

export const resetEquals = Equivalence.make<Reset<Id<any>>>(
  ([email1, id1], [email2, id2]) => Equal.equals(email1, email2) && Equal.equals(id1, id2),
);
