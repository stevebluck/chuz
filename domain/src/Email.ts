import { Brand, S } from "@chuz/prelude";

export type Email = S.Schema.Type<typeof Email>;
export const Email: S.Schema<string & Brand.Brand<"Email">, string> = S.suspend(() =>
  S.compose(S.Lowercase, S.Trim)
    .pipe(S.minLength(5), S.includes("@"), S.includes("."), S.brand("Email"))
    .annotations({ arbitrary: () => (fc) => fc.emailAddress().map(S.decodeSync(Email)) }),
);
