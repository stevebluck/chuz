import * as S from "@effect/schema/Schema";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class ValidationError extends S.TaggedClass<ValidationError>()("ValidationError", {
  errors: S.record(S.string, S.union(S.array(S.string), S.undefined)),
}) {
  static parse = S.decodeUnknownOption(ValidationError);
}
