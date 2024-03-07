import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Either } from "effect";

export type Refinement<I, O> = {
  from: (i: O) => Either.Either<I, ParseError>;
  unsafeFrom: (i: O) => I;
  is: (a: unknown) => a is I;
};

export const makeRefinement = <I, O>(schema: S.Schema<I, O>): Refinement<I, O> => {
  return {
    from: S.decodeEither(schema, { errors: "all" }),
    unsafeFrom: S.decodeSync(schema, { errors: "all" }), // TODO: don't throw
    is: S.is(schema),
  };
};
