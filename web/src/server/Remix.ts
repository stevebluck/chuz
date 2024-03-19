import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Multipart from "@effect/platform/Http/Multipart";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import { formatError } from "@effect/schema/ArrayFormatter";
import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { Effect, Scope, Layer, ManagedRuntime, ReadonlyRecord, ReadonlyArray, Data, ConfigError } from "effect";
import { pretty } from "effect/Cause";
import { isUndefined } from "effect/Predicate";
import { NoInfer } from "effect/Types";
import { Redirect, Unauthorized, ValidationError } from "./Response";

type RemixEffect<A, R> = Effect.Effect<A, never, RequestLayer<R>>;

type RequestLayer<R> = R | Http.request.ServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope;

interface RemixRuntime<L, R> {
  loader: <A>(name: string, self: RemixEffect<A, L | R>) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A>>;
  action: <A>(name: string, self: RemixEffect<A, L | R>) => (args: ActionFunctionArgs) => Promise<TypedResponse<A>>;
  loaderSearchParams: <A, In, Out extends Readonly<Record<string, string>>>(
    name: string,
    schema: S.Schema<In, Out>,
    self: (input: In) => RemixEffect<A | ValidationError, L | R>,
  ) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A | ValidationError>>;
  formDataAction: <A, In, Out extends Partial<Multipart.Persisted>>(
    name: string,
    schema: S.Schema<In, Out>,
    self: (input: In) => RemixEffect<A | ValidationError, L | R>,
  ) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A | ValidationError>>;
}

interface RemixSettings<L, R> {
  layer: Layer.Layer<L, ConfigError.ConfigError>;
  requestLayer: Layer.Layer<R, never, RequestLayer<NoInfer<L>>>;
  middleware: (
    self: RemixEffect<Http.response.ServerResponse, NoInfer<L | R>>,
  ) => RemixEffect<Http.response.ServerResponse, NoInfer<L | R>>;
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

            // TODO: maybe move this to a middleware
            Effect.flatMap((result) => {
              if (Redirect.is(result)) {
                return Http.response.json(null, {
                  status: 302,
                  headers: Http.headers.fromInput({ Location: result.location }),
                });
              }

              if (Unauthorized.is(result)) {
                return Http.response.json(null, { status: 401 });
              }

              if (ValidationError.is(result)) {
                return Http.response.json(result, { status: 400 });
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

    const loaderSearchParams = <A, In, Out extends Readonly<Record<string, string>>>(
      name: string,
      schema: S.Schema<In, Out>,
      self: (input: In) => RemixEffect<A | ValidationError, L | R>,
    ) => {
      const eff = Http.request.schemaBodyUrlParams(schema).pipe(
        Effect.flatMap(self),
        Effect.catchTags({
          ParseError: (e) => ValidationError.make(formatParseError(e)),
          RequestError: Effect.die,
        }),
      );

      return makeHandler("action")(name, eff);
    };

    const formDataAction = <A, In, Out extends Partial<Multipart.Persisted>>(
      name: string,
      schema: S.Schema<In, Out>,
      self: (input: In) => RemixEffect<A | ValidationError, L | R>,
    ) => {
      const eff = Http.request.schemaBodyForm(schema).pipe(
        Effect.flatMap(self),
        Effect.catchTags({
          MultipartError: Effect.die,
          ParseError: (e) => ValidationError.make(formatParseError(e)),
          RequestError: Effect.die,
        }),
      );

      return makeHandler("action")(name, eff);
    };

    return {
      loader: makeHandler("loader"),
      action: makeHandler("action"),
      loaderSearchParams,
      formDataAction,
    };
  };
}

const formatParseError = (error: ParseError): Record<string, string[]> => {
  console.log(formatError(error));
  return ReadonlyRecord.map(
    ReadonlyArray.groupBy(formatError(error), (i) => i.path.join(".")),
    ReadonlyArray.map((a) => a.message),
  );
};
