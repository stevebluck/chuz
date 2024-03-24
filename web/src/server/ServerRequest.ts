import * as Http from "@effect/platform/HttpServer";
import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Data, Effect, ReadonlyRecord } from "effect";
import { Context as _Context } from "effect";

export namespace ServerRequest {
  export const searchParams = <A, Out extends Record<string, string | undefined>>(
    schema: S.Schema<A, Out>,
  ): Effect.Effect<A, SearchParamsError, Http.request.ServerRequest> =>
    Http.request.ServerRequest.pipe(
      Effect.map((req) => new URL(req.url)),
      Effect.map((url) => ReadonlyRecord.fromEntries(url.searchParams.entries()) as Out),
      Effect.flatMap(S.decode(schema, { errors: "all" })),
      Effect.mapError((error) => new SearchParamsError({ error })),
    );

  export const formData = <A, Out extends Partial<Record<string, string>>>(schema: S.Schema<A, Out>) =>
    Http.request.ServerRequest.pipe(
      Effect.flatMap((req) => req.urlParamsBody),
      Effect.map((_) => Object.fromEntries(_) as Out),
      Effect.flatMap(S.decode(schema, { errors: "all" })),
      Effect.catchTags({ RequestError: Effect.die }),
      Effect.mapError((error) => new FormDataError({ error })),
    );

  class SearchParamsError extends Data.TaggedError("SearchParamsError")<{ error: ParseError }> {}
  class FormDataError extends Data.TaggedError("FormDataError")<{ error: ParseError }> {}
}
