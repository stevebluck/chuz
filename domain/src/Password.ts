import { Equivalence, Brand, Equal } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import { Id, Identified, User } from ".";

export type Plaintext = string & Brand.Brand<"PlaintextPassword">;
export type Strong = string & Brand.Brand<"StrongPassword">;
export type Hashed = string & Brand.Brand<"HashedPassword">;
export type Reset<A> = [User.Email, Id<A>];

export const Plaintext = S.NonEmpty.pipe(S.brand("PlaintextPassword"));

export const Strong = S.string.pipe(S.minLength(8), S.maxLength(64), S.brand("StrongPassword"));
export const strongFrom = S.decodeEither(Strong);

export const Hashed = S.NonEmpty.pipe(S.brand("HashedPassword"));

export const equals = Equivalence.strict<Hashed>();

export const resetEquals = Equivalence.make<Reset<any>>(
  ([email1, id1], [email2, id2]) => Equal.equals(email1, email2) && Identified.equals(id1, id2),
);
