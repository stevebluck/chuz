import { Option } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";

const CheckboxInput = S.transform(
  S.orUndefined(S.literal("on")),
  S.boolean,
  (a) => a === "on",
  (a) => (a ? "on" : undefined),
);

const OptionFromEmptyString: S.Schema<Option.Option<string>, string> = S.transform(
  S.string,
  S.option(S.string),
  (a) => (a.length > 0 ? { _tag: "Some" as const, value: a } : { _tag: "None" as const }),
  (a) => (a._tag === "Some" ? a.value : ""),
);

export const optionFromEmptyString = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.compose(OptionFromEmptyString, S.optionFromSelf(schema));

export const fromCheckboxInput = <A>(schema: S.Schema<A, boolean>): S.Schema<A, "on" | undefined> =>
  S.compose(CheckboxInput, schema);
