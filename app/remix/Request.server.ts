import { formatError } from "@effect/schema/ArrayFormatter";
import { ParseError } from "@effect/schema/ParseResult";
import { Effect, Either, ReadonlyArray, ReadonlyRecord } from "effect";

export namespace Request {
  export type FormErrors = Record<string, readonly string[] | undefined>;

  export const formData = <A>(
    request: globalThis.Request,
    parser: (u: unknown) => Effect.Effect<A, ParseError>,
  ): Effect.Effect<Either.Either<FormErrors, A>> => {
    const result = Effect.promise(() => request.formData()).pipe(
      Effect.map((data) => Object.fromEntries(data.entries())),
      Effect.flatMap(parser),
      Effect.mapError(formatError),
      Effect.mapError(ReadonlyArray.groupBy((a) => a.path.join("."))),
      Effect.mapError(ReadonlyRecord.map(ReadonlyArray.map((issue) => issue.message))),
      Effect.either,
    );

    return result;
  };
}
