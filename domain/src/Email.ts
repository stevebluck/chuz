import { Brand, Refined, S } from "@chuz/prelude";

export type Email = Brand.Branded<string, "Email">;

export const Email = Refined<Email>(
  "Email",
  S.Lowercase.pipe(
    S.compose(S.Trim),
    // Extracted from https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#basic_validation
    S.pattern(/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/),
  ),
);
