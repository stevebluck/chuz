import * as S from "@effect/schema/Schema";
import { Brand, Data, Equivalence } from "effect";
import { Refinement } from "~/lib/Refinement";

export type Email = string & Brand.Brand<"Email">;

export namespace Email {
  export const schema = S.compose(S.Lowercase, S.Trim).pipe(
    S.pattern(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    ),
    S.fromBrand(Brand.nominal<Email>()),
  );
  // Extracted from https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
  export const { from, unsafeFrom, is } = Refinement(schema);

  export const toLowerCase = (e: Email): Email => unsafeFrom(e.toLowerCase());
  export const toUpperCase = (email: Email): Email => Email.unsafeFrom(email.toUpperCase());

  export const equals: Equivalence.Equivalence<Email> = Equivalence.string;

  export class AlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{ email: Email }> {}
}
