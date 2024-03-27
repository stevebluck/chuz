import * as Http from "@effect/platform/HttpServer";
import { formatError } from "@effect/schema/ArrayFormatter";
import { ParseError } from "@effect/schema/ParseResult";
import { Effect, Predicate, ReadonlyArray, ReadonlyRecord } from "effect";

export namespace ServerResponse {
  export const Ok = <A>(data: A | void) => Http.response.json(Predicate.isUndefined(data) ? null : data);
  export const Unit = () => Http.response.json(null);

  export const Redirect = (location: string) =>
    Http.response.json(null, { status: 302 }).pipe(Effect.flatMap(Http.response.setHeader("Location", location)));

  export const Unauthorized = Http.response.json(null, { status: 401 });

  export const ServerError = (error: string) => Http.response.json({ error }, { status: 500 });

  export const FormError = (error: ParseError) => {
    const res =
      error instanceof ParseError
        ? Http.response.json(
            { _tag: "FormError", error: ReadonlyRecord.map(formatParseError(error), (a) => a[0]) },
            { status: 400 },
          )
        : Http.response.json(error, { status: 400 });

    return res;
  };

  export const BadRequest = <E extends { _tag: string }>(error: E) => {
    return Http.response.json(error, { status: 400 });
  };

  const formatParseError = (error: ParseError): Record<string, string[]> => {
    return ReadonlyRecord.map(
      ReadonlyArray.groupBy(formatError(error), (i) => i.path.join(".")),
      ReadonlyArray.map((a) => a.message),
    );
  };
}
