import * as Http from "@effect/platform/HttpServer";
import { formatError } from "@effect/schema/ArrayFormatter";
import { ParseError } from "@effect/schema/ParseResult";
import { Effect, Predicate, ReadonlyArray, ReadonlyRecord } from "effect";
import { Context as _Context } from "effect";

export namespace ServerResponse {
  export const Ok = <A>(data: A | void) =>
    Http.response
      .json(Predicate.isUndefined(data) ? null : data)
      .pipe(Effect.catchTag("BodyError", (e) => Effect.die(e)));

  export const Redirect = (location: string) =>
    Http.response.json(null, { status: 302 }).pipe(
      Effect.flatMap(Http.response.setHeader("Location", location)),
      Effect.catchTag("BodyError", (e) => Effect.die(e)),
    );

  export const Unauthorized = Http.response
    .json(null, { status: 401 })
    .pipe(Effect.catchTag("BodyError", (e) => Effect.die(e)));

  export const ValidationError = (error: Record<string, string[]> | ParseError) => {
    const res =
      error instanceof ParseError
        ? Http.response.json(formatParseError(error), { status: 400 })
        : Http.response.json(error, { status: 400 });

    return Effect.catchTag(res, "BodyError", (e) => Effect.die(e));
  };

  const formatParseError = (error: ParseError): Record<string, string[]> => {
    return ReadonlyRecord.map(
      ReadonlyArray.groupBy(formatError(error), (i) => i.path.join(".")),
      ReadonlyArray.map((a) => a.message),
    );
  };
}
