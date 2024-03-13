import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Multipart from "@effect/platform/Http/Multipart";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import { Issue, formatError } from "@effect/schema/ArrayFormatter";
import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { Effect, Scope, Layer, ManagedRuntime, ReadonlyRecord, ReadonlyArray, Data } from "effect";
import { pretty } from "effect/Cause";
import { isUndefined } from "effect/Predicate";
import { NonEmptyReadonlyArray } from "effect/ReadonlyArray";
import { Redirect } from "./Redirect";

export type RemixEffect<A, R> = Effect.Effect<
  A,
  never,
  R | Http.request.ServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope
>;

interface RemixRuntime<L, R> {
  loader: <A>(name: string, self: RemixEffect<A, R | L>) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A>>;
  action: <A>(name: string, self: RemixEffect<A, R | L>) => (args: ActionFunctionArgs) => Promise<TypedResponse<A>>;
  formDataAction: <A, In, Out extends Partial<Multipart.Persisted>>(
    name: string,
    schema: S.Schema<In, Out>,
    self: (input: In) => RemixEffect<A | ValidationError, R | L>,
  ) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A | ValidationError>>;
}

export interface ValidationError {
  error: Record<string, string[]>;
}

export const ValidationError = Data.case<ValidationError>();

interface RemixSettings<L, R> {
  layer: Layer.Layer<L>;
  requestLayer: Layer.Layer<R, never, Http.request.ServerRequest | L>;
  middleware: (
    self: RemixEffect<Http.response.ServerResponse, R | L>,
  ) => RemixEffect<Http.response.ServerResponse, R | L>;
}

export namespace Remix {
  export const make = async <L, R>({
    layer,
    requestLayer,
    middleware,
  }: RemixSettings<L, R>): Promise<RemixRuntime<L, R>> => {
    const { runtimeEffect } = ManagedRuntime.make(Layer.mergeAll(layer, NodeFileSystem.layer, Path.layer));

    const handlerEffect = runtimeEffect.pipe(Effect.map(Http.app.toWebHandlerRuntime));
    const run = await Effect.runPromise(handlerEffect);

    const makeHandler =
      (type: string) =>
      <A>(name: String, self: RemixEffect<A, L | R>) => {
        const app = Effect.gen(function* (_) {
          return yield* _(
            self,
            Effect.flatMap((result) => {
              if (Redirect.isRedirect(result)) {
                return Http.response.json(null, {
                  status: 302,
                  headers: Http.headers.fromInput({ Location: result.location }),
                });
              }

              if (isUndefined(result)) {
                return Http.response.json(null, { status: 200 });
              }

              return Http.response.json(result, { status: 200 });
            }),
            Effect.catchTags({ BodyError: (e) => Effect.die("body error") }),
            Effect.withSpan(`${name}.${type}`),
            middleware,
            Effect.tapDefect((cause) => Effect.logError(pretty(cause))),
          );
        }).pipe(Effect.provide(requestLayer));

        const handler = run(app);

        return (args: LoaderFunctionArgs | ActionFunctionArgs) => handler(args.request);
      };

    const formDataAction = <A, In, Out extends Partial<Multipart.Persisted>>(
      name: string,
      schema: S.Schema<In, Out>,
      self: (input: In) => RemixEffect<A | ValidationError, R | L>,
    ) => {
      const eff = Http.request.schemaBodyForm(schema).pipe(
        Effect.flatMap(self),
        Effect.catchTags({
          MultipartError: Effect.die,
          ParseError: (e) => Effect.succeed(ValidationError({ error: formatParseError(e) })),
          RequestError: Effect.die,
        }),
      );

      return makeHandler("action")(name, eff);
    };

    return {
      loader: makeHandler("loader"),
      action: makeHandler("action"),
      formDataAction,
    };
  };
}

const formatParseError = (error: ParseError): Record<string, string[]> => {
  return ReadonlyRecord.map(
    ReadonlyArray.groupBy(formatError(error), (i) => i.path.join(".")),
    ReadonlyArray.map((a) => a.message),
  );
};
