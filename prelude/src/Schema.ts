import { AST } from "@effect/schema";
import * as S from "@effect/schema/Schema";
import { Brand, Option, Predicate } from "effect";

export * from "@effect/schema/Schema";
export * as PR from "@effect/schema/ParseResult";
export * as ArrayFormatter from "@effect/schema/ArrayFormatter";

export const taggedStruct = <Name extends AST.LiteralValue | symbol, Fields extends S.Struct.Fields>(
  name: Name,
  fields: Fields,
  // @ts-expect-error
) => S.Struct(fields).pipe(S.attachPropertySignature("_tag", name));

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

// TODO: Move to domain
export type EmailAddress = S.Schema.Type<typeof EmailAddress>;
export const EmailAddress: S.Schema<string & Brand.Brand<"EmailAddress">, string> = S.compose(S.Lowercase, S.Trim)
  .pipe(S.minLength(5), S.includes("@"), S.includes("."), S.brand("EmailAddress"))
  .annotations({
    arbitrary: () => (fc) => fc.emailAddress().map(S.decodeSync(EmailAddress)),
    message: () => "Looks like you have a typo in your email address.",
  });

// TODO Rename BooleanFromString
export const CheckboxInput: S.Schema<boolean, string | undefined> = S.transform(S.UndefinedOr(S.NonEmpty), S.Boolean, {
  decode: Predicate.isNotUndefined,
  encode: String,
});

// TODO: Rename OptionFromString
export const OptionStringFromEmptyString: S.Schema<Option.Option<string>, string> = S.transform(
  S.Trim,
  S.Option(S.Trim),
  {
    decode: (a) => (a.length > 0 ? { _tag: "Some" as const, value: a } : { _tag: "None" as const }),
    encode: (a) => (a._tag === "Some" ? a.value : ""),
  },
);

// TODO: Move to web
export const optionalTextInput = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.compose(OptionStringFromEmptyString, S.OptionFromSelf(schema));

// TODO: Move to web
export const fromCheckboxInput = <A>(schema: S.Schema<A, boolean>): S.Schema<A, string | undefined> =>
  S.compose(CheckboxInput, schema);
