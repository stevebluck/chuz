import * as S from "@effect/schema/Schema";

export const FormCheckbox = S.transform(
  S.orUndefined(S.literal("on")),
  S.boolean,
  (a) => a === "on",
  (a) => (a ? "on" : undefined),
);
