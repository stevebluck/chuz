import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { ServerResponse } from "@effect/platform/Http/ServerResponse";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { Effect, Scope, Layer, ManagedRuntime, ConfigError } from "effect";
import { NoInfer } from "effect/Types";

type RequestLayer<R> = R | Http.request.ServerRequest | FileSystem.FileSystem | Path.Path | Scope.Scope;

type RemixLoader<A> = (args: LoaderFunctionArgs) => Promise<TypedResponse<A>>;

type RemixAction<A> = (args: ActionFunctionArgs) => Promise<TypedResponse<A>>;

interface RemixRuntime<L, R> {
  loader: <A>(self: Effect.Effect<ServerResponse, never, RequestLayer<L | R>>) => RemixLoader<A>;
  action: <A>(self: Effect.Effect<ServerResponse, never, RequestLayer<L | R>>) => RemixAction<A>;
}

interface RemixSettings<L, R> {
  layer: Layer.Layer<L, ConfigError.ConfigError>;
  requestLayer: Layer.Layer<R, never, RequestLayer<NoInfer<L>>>;
  interpreter: (
    self: Effect.Effect<ServerResponse, never, RequestLayer<L | R>>,
  ) => Effect.Effect<ServerResponse, never, RequestLayer<L | R>>;
}

export namespace Runtime {
  export const make = async <L, R>({
    layer,
    requestLayer,
    interpreter,
  }: RemixSettings<L, R>): Promise<RemixRuntime<L, R>> => {
    const { runtimeEffect } = ManagedRuntime.make(Layer.mergeAll(layer, NodeFileSystem.layer, Path.layer));
    const handler = runtimeEffect.pipe(Effect.map(Http.app.toWebHandlerRuntime));

    const run = await Effect.runPromise(handler);

    const makeHandler = <A>(self: Effect.Effect<ServerResponse, never, RequestLayer<L | R>>) => {
      const runnable = Effect.provide(interpreter(self), requestLayer);

      return ({ request }: LoaderFunctionArgs) => run(runnable)(request).then((a) => a as TypedResponse<A>);
    };

    return {
      loader: makeHandler,
      action: makeHandler,
    };
  };
}
