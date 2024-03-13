import { makeRefinement } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Brand, Equivalence } from "effect";

export type Email = string & Brand.Brand<{ readonly Email: unique symbol }["Email"]>;

export namespace Email {
  export const schema = S.compose(S.Lowercase, S.Trim).pipe(
    S.pattern(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    ),
    S.fromBrand(Brand.nominal<Email>()),
    S.message(() => "Invalid email address"),
    S.identifier("Email"),
  );

  export const { from, unsafeFrom, is } = makeRefinement(schema);

  export const toLowerCase = (e: Email): Email => unsafeFrom(e.toLowerCase());
  export const toUpperCase = (email: Email): Email => Email.unsafeFrom(email.toUpperCase());

  export const equals = Equivalence.strict<Email>();

  export class AlreadyInUse extends S.TaggedError<AlreadyInUse>()("EmailAlreadyInUse", { email: Email.schema }) {}
}
