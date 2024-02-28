import { makeRefinement } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Equivalence, Brand, Equal } from "effect";
import { Email, Id, Identified } from ".";

export namespace Password {
  export type Plaintext = string & Brand.Brand<{ readonly Plaintext: unique symbol }["Plaintext"]>;
  export namespace Plaintext {
    const PlaintextBrand = Brand.nominal<Plaintext>();
    export const schema = S.NonEmpty.pipe(
      S.message(() => "A password is required"),
      S.fromBrand(PlaintextBrand),
    );
    export const { from, unsafeFrom, is } = makeRefinement(schema);
    export const fromStrong = (password: Strong): Plaintext => unsafeFrom(password);
  }

  export type Strong = string & Brand.Brand<{ readonly Strong: unique symbol }["Strong"]>;
  export namespace Strong {
    const StrongBrand = Brand.nominal<Strong>();
    export const schema = S.string.pipe(S.minLength(8), S.maxLength(64), S.fromBrand(StrongBrand));
    export const { from, unsafeFrom, is } = makeRefinement(schema);
  }

  export type Hashed = string & Brand.Brand<{ readonly Hashed: unique symbol }["Hashed"]>;
  export namespace Hashed {
    const HashedBrand = Brand.nominal<Hashed>();
    export const schema = S.string.pipe(S.fromBrand(HashedBrand));
    export const { from, unsafeFrom, is } = makeRefinement(schema);
    export const equals = Equivalence.strict<Hashed>();
  }

  export type Reset<A> = [Email, Id<A>];
  export namespace Reset {
    export const equals = Equivalence.make<Reset<any>>(
      ([email1, id1], [email2, id2]) => Email.equals(email1, email2) && Identified.equals(id1, id2),
    );
  }
}
