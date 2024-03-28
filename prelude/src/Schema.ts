import * as S from "@effect/schema/Schema";
import { Brand, Option, Predicate } from "effect";

export * from "@effect/schema/Schema";

export const String100: S.Schema<string & Brand.Brand<"String100">, string> = S.Trim.pipe(
  S.minLength(1),
  S.maxLength(100),
  S.brand("String100"),
);

export const String1000: S.Schema<string & Brand.Brand<"String1000">, string> = S.Trim.pipe(
  S.minLength(1),
  S.maxLength(1000),
  S.brand("String1000"),
);

export const EmailAddress: S.Schema<string & Brand.Brand<"EmailAddress">, string> = S.compose(S.Lowercase, S.Trim).pipe(
  S.minLength(5),
  S.includes("@"),
  S.includes("."),
  S.brand("EmailAddress"),
);

export const CheckboxInput: S.Schema<boolean, string | undefined> = S.transform(
  S.orUndefined(S.NonEmpty),
  S.boolean,
  Predicate.isNotUndefined,
  String,
);

export const OptionStringFromEmptyString: S.Schema<Option.Option<string>, string> = S.transform(
  S.Trim,
  S.option(S.Trim),
  (a) => (a.length > 0 ? { _tag: "Some" as const, value: a } : { _tag: "None" as const }),
  (a) => (a._tag === "Some" ? a.value : ""),
);

export const optionalTextInput = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.compose(OptionStringFromEmptyString, S.optionFromSelf(schema));

export const fromCheckboxInput = <A>(schema: S.Schema<A, boolean>): S.Schema<A, string | undefined> =>
  S.compose(CheckboxInput, schema);
