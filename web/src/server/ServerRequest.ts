import { Data, Effect, ReadonlyRecord } from "@chuz/prelude";
import { Context as _Context } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import * as Http from "@effect/platform/HttpServer";
import { ParseError } from "@effect/schema/ParseResult";

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
    Http.request
      .schemaBodyForm(schema, { errors: "all" })
      .pipe(Effect.catchTags({ MultipartError: Effect.die, RequestError: Effect.die }));

  class SearchParamsError extends Data.TaggedError("SearchParamsError")<{ error: ParseError }> {}
}
