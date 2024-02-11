import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Either } from "effect";

export type Refinement<I, O> = {
  from: (i: I) => Either.Either<ParseError, O>;
  unsafeFrom: (i: I) => O;
  is: (o: unknown) => o is O;
};
export const Refinement = <I, O>(schema: S.Schema<O, I>): Refinement<I, O> => {
  return {
    from: S.decodeEither(schema),
    unsafeFrom: S.decodeSync(schema),
    is: S.is(schema),
  };
};
