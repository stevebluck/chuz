import { Brand, Equivalence } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";

export type Email = string & Brand.Brand<"Email">;

export const schema = S.compose(S.Lowercase, S.Trim).pipe(
  S.pattern(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  ),
  S.fromBrand(Brand.nominal<Email>()),
  S.identifier("Email"),
);

export const unsafeFrom = S.decodeSync(schema);

export const toLowerCase = (e: Email): Email => unsafeFrom(e.toLowerCase());
export const toUpperCase = (email: Email): Email => unsafeFrom(email.toUpperCase());

export const equals = Equivalence.strict<Email>();

export class AlreadyInUse extends S.TaggedError<AlreadyInUse>()("EmailAlreadyInUse", { email: schema }) {}
