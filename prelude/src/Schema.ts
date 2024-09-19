import * as S from "@effect/schema/Schema";
import { Option } from "effect";

export * from "@effect/schema/Schema";

export const String100 = S.Trim.pipe(S.minLength(1), S.maxLength(100));

export const String1000 = S.Trim.pipe(S.minLength(1), S.maxLength(1000));

export const OptionFromEmptyString = S.transform(S.String, S.OptionFromSelf(S.NonEmptyString), {
  decode: Option.liftPredicate((value) => value.length > 0),
  encode: Option.getOrElse(() => ""),
});
