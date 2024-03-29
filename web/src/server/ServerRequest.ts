import { Data, Effect, ReadonlyRecord } from "@chuz/prelude";
import { PR } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import * as Http from "@effect/platform/HttpServer";

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

  class SearchParamsError extends Data.TaggedError("SearchParamsError")<{ error: PR.ParseError }> {}
}
