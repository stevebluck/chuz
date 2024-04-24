import * as S from "@effect/schema/Schema";
import { Brand, Option, Predicate } from "effect";

export * from "@effect/schema/Schema";
export * as PR from "@effect/schema/ParseResult";
export * as ArrayFormatter from "@effect/schema/ArrayFormatter";

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

// TODO Rename BooleanFromString
export const BooleanFromString: S.Schema<boolean, string | undefined> = S.transform(
  S.UndefinedOr(S.String),
  S.Boolean,
  {
    decode: Predicate.isNotUndefined,
    encode: String,
  },
);

export const OptionFromString: S.Schema<Option.Option<string>, string> = S.transform(S.Trim, S.Option(S.Trim), {
  decode: (a) => (a.length > 0 ? { _tag: "Some" as const, value: a } : { _tag: "None" as const }),
  encode: (a) => (a._tag === "Some" ? a.value : ""),
});
