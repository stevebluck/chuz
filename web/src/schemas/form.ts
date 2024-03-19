import * as S from "@effect/schema/Schema";
import { Option } from "effect";

export const CheckboxInput = S.transform(
  S.orUndefined(S.literal("on")),
  S.boolean,
  (a) => a === "on",
  (a) => (a ? "on" : undefined),
);

export const optionFromEmptyString = <A>(schema: S.Schema<A, string>): S.Schema<Option.Option<A>, string> =>
  S.transform(
    S.string,
    S.option(schema),
    (a) => (a.length > 0 ? Option.some(a) : Option.none()),
    (a) => (a._tag === "Some" ? a.value : ""),
  );
