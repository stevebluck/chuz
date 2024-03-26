import * as S from "@effect/schema/Schema";

export * from "@effect/schema/Schema";

export const String100 = S.Trim.pipe(S.minLength(1), S.maxLength(100));
