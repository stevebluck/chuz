import { makeRefinement } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Equivalence, Brand } from "effect";
import { Email, Id, Identified } from ".";

export namespace Password {
  export type Plaintext = string & Brand.Brand<"Plaintext">;
  export namespace Plaintext {
    const PlaintextBrand = Brand.nominal<Plaintext>();
    export const schema = S.NonEmpty.pipe(
      S.message(() => "A password is required"),
      S.fromBrand(PlaintextBrand),
      S.identifier("Password.Plaintext"),
    );
    export const { from, unsafeFrom, is } = makeRefinement(schema);
    export const fromStrong = (password: Strong): Plaintext => unsafeFrom(password);
  }

  export type Strong = string & Brand.Brand<"Strong">;
  export namespace Strong {
    const StrongBrand = Brand.nominal<Strong>();
    export const schema = S.string.pipe(
      S.minLength(8),
      S.maxLength(64),
      S.fromBrand(StrongBrand),
      S.identifier("Password.Strong"),
    );
    export const { from, unsafeFrom, is } = makeRefinement(schema);
  }

  export type Reset<A> = [Email, Id<A>];
  export namespace Reset {
    export const equals = Equivalence.make<Reset<any>>(
      ([email1, id1], [email2, id2]) => Email.equals(email1, email2) && Identified.equals(id1, id2),
    );
  }
}
