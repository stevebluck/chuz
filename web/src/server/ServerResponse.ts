import { Effect, PR, Predicate, ReadonlyArray, ReadonlyRecord } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import * as Http from "@effect/platform/HttpServer";

type ServerResponseEffect = Effect.Effect<Http.response.ServerResponse, Http.body.BodyError>;

export const Unit: ServerResponseEffect = Http.response.json(null);

export const Unauthorized: ServerResponseEffect = Http.response.json(null, { status: 401 });

export const ok = <A>(data: A): ServerResponseEffect => Http.response.json(Predicate.isUndefined(data) ? null : data);

export const redirect = (location: string): ServerResponseEffect =>
  Http.response.empty({ status: 302, headers: Http.headers.fromInput({ location }) });

export const validationError = (error: PR.ParseError): ServerResponseEffect =>
  Http.response.json(
    { _tag: "FormError", error: ReadonlyRecord.map(formatParseError(error), (a) => a[0]) },
    { status: 400 },
  );

export const badRequest = <E extends { _tag: string }>(error: E): ServerResponseEffect =>
  Http.response.json(error, { status: 400 });

// TODO: add metric counter
export const serverError = (error: unknown): ServerResponseEffect =>
  Http.response.empty({ status: 500 }).pipe(Effect.tap(() => Effect.logError(error)));

const formatParseError = (error: PR.ParseError): Record<string, string[]> => {
  return ReadonlyRecord.map(
    ReadonlyArray.groupBy(ArrayFormatter.formatError(error), (i) => i.path.join(".")),
    ReadonlyArray.map((a) => a.message),
  );
};
