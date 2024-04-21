import { Data, Effect, Record, PR, S } from "@chuz/prelude";
import * as Http from "@effect/platform/HttpServer";

export const searchParams = <A, Out extends Record<string, string | undefined>>(
  schema: S.Schema<A, Out>,
): Effect.Effect<A, SearchParamsError, Http.request.ServerRequest> =>
  Http.request.ServerRequest.pipe(
    Effect.map((req) => new URL(req.url)),
    Effect.map((url) => Record.fromEntries(url.searchParams.entries()) as Out),
    Effect.flatMap(S.decode(schema, { errors: "all" })),
    Effect.mapError((error) => new SearchParamsError({ error })),
  );

export const formData = <A, Out extends Partial<Record<string, string>>>(schema: S.Schema<A, Out>) =>
  Http.request.schemaBodyForm(schema, { errors: "all" }).pipe(
    Effect.catchTags({
      ParseError: (error) => new InvalidFormData({ error }),
      MultipartError: Effect.die,
      RequestError: Effect.die,
    }),
  );

class SearchParamsError extends Data.TaggedError("SearchParamsError")<{ error: PR.ParseError }> {}
export class InvalidFormData extends Data.TaggedError("InvalidFormData")<{ error: PR.ParseError }> {}
