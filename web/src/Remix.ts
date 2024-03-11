import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Multipart from "@effect/platform/Http/Multipart";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import * as S from "@effect/schema/Schema";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { Effect, Scope, Layer } from "effect";
import { isUndefined } from "effect/Predicate";
import { Redirect } from "./Redirect";

type RemixEffect<A, R> = Effect.Effect<
  A,
  never,
  R | Http.request.ServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope
>;

interface RemixRuntime<L, R> {
  loader: <A>(self: RemixEffect<A | Redirect, R | L>) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A>>;
  action: <A, In, Out extends Multipart.Persisted>(
    schema: S.Schema<In, Out>,
    self: (input: In) => RemixEffect<A | Redirect | ValidationError, R | L>,
  ) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A | ValidationError>>;
}

type ValidationError = { error: string };

interface RemixSettings<L, R> {
  layer: Layer.Layer<L>;
  requestLayer: Layer.Layer<R, never, Http.request.ServerRequest>;
  middleware: (
    self: RemixEffect<Http.response.ServerResponse, R | L>,
  ) => RemixEffect<Http.response.ServerResponse, R | L>;
}

export namespace Remix {
  export const make = <L, R>({ layer, requestLayer, middleware }: RemixSettings<L, R>): RemixRuntime<L, R> => {
    const makeHandler = <A>(self: RemixEffect<A, L | R>) => {
      const app = self
        .pipe(
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
          Effect.catchTags({ BodyError: Effect.die }),
          middleware,
        )
        .pipe(Effect.provide(requestLayer));

      const { handler } = Http.app.toWebHandlerLayer(app, Layer.mergeAll(layer, NodeFileSystem.layer, Path.layer));

      return (args: LoaderFunctionArgs | ActionFunctionArgs) => handler(args.request);
    };

    const formDataAction = <A, In, Out extends Multipart.Persisted>(
      schema: S.Schema<In, Out>,
      self: (input: In) => RemixEffect<A | ValidationError, R | L>,
    ) => {
      const eff = Http.request.schemaBodyForm(schema).pipe(
        Effect.flatMap(self),
        Effect.catchTags({
          MultipartError: (e) => Effect.succeed({ error: "Multipart error" } as ValidationError),
          ParseError: (e) => Effect.succeed({ error: "Parse error" } as ValidationError),
          RequestError: Effect.die,
        }),
      );

      return makeHandler(eff);
    };

    return {
      loader: makeHandler,
      action: formDataAction,
    };
  };
}
