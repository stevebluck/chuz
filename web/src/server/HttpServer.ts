import { PR, Predicate, ReadonlyArray, ReadonlyRecord } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import * as Http from "@effect/platform/HttpServer";

export namespace ServerResponse {
  export const Ok = <A>(data: A | void) => Http.response.json(Predicate.isUndefined(data) ? null : data);
  export const Unit = () => Http.response.json(null);

  export const Redirect = (location: string) =>
    Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

  export const Unauthorized = Http.response.json(null, { status: 401 });

  export const ServerError = (message?: string) =>
    Http.response.json({ message: message || "Unexpected server error" }, { status: 500 });

  export const FormError = (error: PR.ParseError) => {
    const res =
      error instanceof PR.ParseError
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

  const formatParseError = (error: PR.ParseError): Record<string, string[]> => {
    return ReadonlyRecord.map(
      ReadonlyArray.groupBy(ArrayFormatter.formatError(error), (i) => i.path.join(".")),
      ReadonlyArray.map((a) => a.message),
    );
  };
}
