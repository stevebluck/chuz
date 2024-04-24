import { Option, S } from "@chuz/prelude";

export const optionalTextInput = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.compose(S.OptionFromString, S.OptionFromSelf(schema));

export const fromCheckboxInput = <A>(schema: S.Schema<A, boolean>): S.Schema<A, string | undefined> =>
  S.compose(S.BooleanFromString, schema);
