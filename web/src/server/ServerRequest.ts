import { FileSystem } from "@effect/platform/FileSystem";
import { HttpServerRequest, schemaBodyForm } from "@effect/platform/HttpServerRequest";
import { Path } from "@effect/platform/Path";
import { Data, Effect, Record, PR, S, Scope, Array, Option, pipe } from "@chuz/prelude";
import { ArrayFormatter } from "@chuz/prelude/src/Schema";
import { FormError, ServerResponse } from "./ServerResponse";

export const searchParams = <A, Out extends Record<string, string | undefined>>(
  schema: S.Schema<A, Out>,
): Effect.Effect<A, SearchParamsError, HttpServerRequest> =>
  HttpServerRequest.pipe(
    Effect.map((req) => new URL(req.url)),
    Effect.map((url) => Record.fromEntries(url.searchParams.entries()) as Out),
    Effect.flatMap(S.decode(schema, { errors: "all" })),
    Effect.mapError((error) => new SearchParamsError({ error })),
  );

export const formData = <A, Out extends Partial<Record<string, string>>>(
  schema: S.Schema<A, Out>,
): Effect.Effect<A, FormError, HttpServerRequest | FileSystem | Scope.Scope | Path> =>
  schemaBodyForm(schema, { errors: "all", onExcessProperty: "error" }).pipe(
    Effect.catchTags({
      ParseError: (error) =>
        ArrayFormatter.formatError(error).pipe(
          Effect.map((errors) =>
            pipe(
              Array.groupBy(errors, (a) => a.path.join(".")),
              Record.map(Array.head),
              Record.filter(Option.isSome),
              Record.map((e) => ({ message: e.value.message, type: e.value._tag }) as const),
              // TODO: get values from parse error maybe?
              (errors) => ServerResponse.FormError({ values: {}, errors }),
            ),
          ),
          Effect.flip,
        ),
      MultipartError: Effect.die,
      RequestError: Effect.die,
    }),
  );

class SearchParamsError extends Data.TaggedError("SearchParamsError")<{ error: PR.ParseError }> {}

export const ServerRequest = { searchParams, formData };
