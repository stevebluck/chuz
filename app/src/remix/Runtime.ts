import * as S from "@effect/schema/Schema";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse, json, redirect } from "@remix-run/node";
import { Effect, Layer, Runtime, Exit, Cause, Scope } from "effect";
import { pretty } from "effect/Cause";
import { makeFiberFailure } from "effect/Runtime";
import { Response } from "../Response";

type Route<A, E, R> = Effect.Effect<A, E | Response.Redirect, R>;

interface RemixRuntime<L, R> {
  loader: <A, E>(self: Route<A, E, R | L>) => (args: LoaderFunctionArgs) => Promise<TypedResponse<A>>;
  action: <A, E, In, Out>(
    schema: S.Schema<In, Out>,
    self: (input: In) => Effect.Effect<A, E, R | L>,
  ) => (args: ActionFunctionArgs) => Promise<TypedResponse<Response.Result<A, E>>>;
}

type Settings<L, R> = {
  runtimeLayer: Layer.Layer<L>;
  requestLayer: (args: LoaderFunctionArgs) => Layer.Layer<R>;
  route: (
    args: LoaderFunctionArgs,
  ) => <A, E>(self: Route<A, E, R | L>) => Effect.Effect<Remix.Result<A>, Remix.Result<E | Response.Redirect>, R | L>;
};

export namespace Remix {
  export type Result<A> = { result: A; init: RequestInit };
  export const Result =
    <A>(init: RequestInit) =>
    (result: A): Result<A> => ({ result, init });

  export const make = <L, R>({ route, runtimeLayer, requestLayer }: Settings<L, R>): RemixRuntime<L, R> => {
    // TODO close scope when node process ends
    const scope = Effect.runSync(Scope.make());
    const runtime = Layer.toRuntime(runtimeLayer).pipe(
      Scope.extend(scope),
      Effect.tap(Effect.logInfo("Creating runtime")),
      Effect.runSync,
    );

    const run = Runtime.runPromiseExit(runtime);

    const handler =
      <A, E>(self: Route<A, E, R | L>) =>
      async (args: LoaderFunctionArgs): Promise<TypedResponse<A>> => {
        const runnable = route(args)(self).pipe(Effect.provide(requestLayer(args)));

        const val = run(runnable).then(
          Exit.match({
            onFailure: (cause) => {
              if (Cause.isFailType(cause) && Response.isRedirect(cause.error.result)) {
                throw redirect(cause.error.result.location, cause.error.init);
              }

              const fiberFailure = makeFiberFailure(cause);
              const error = new Error(fiberFailure.message);
              error.name = fiberFailure.name;
              error.stack = pretty(cause);
              throw error;
            },
            onSuccess: (a) => {
              if (Response.isRedirect(a)) {
                throw redirect(a.location, a.init);
              }

              return json(a.result, a.init);
            },
          }),
        );

        return val;
      };

    const Action =
      <A, E, In, Out>(schema: S.Schema<In, Out>, self: (input: In) => Effect.Effect<A, E, R | L>) =>
      async (args: ActionFunctionArgs): Promise<TypedResponse<Response.Result<A, E>>> => {
        // TODO set a global error message / flash cookie
        const eff = parseFormData(schema, args.request).pipe(
          Effect.flatMap(self),
          Effect.flatMap((a) => Response.Result.succeed<A, E>(a)),
          Effect.catchAll((error) => Response.Result.fail<A, E>(error as E)),
        );

        return handler(eff)(args);
      };

    return {
      loader: handler,
      action: Action,
    };
  };
}

const parseFormData = <In, Out>(schema: S.Schema<In, Out>, request: Request) =>
  Effect.promise(() => request.formData()).pipe(
    Effect.map(Object.fromEntries),
    Effect.flatMap(S.decodeUnknown(schema, { errors: "all", onExcessProperty: "error" })),
    Effect.withSpan("Remix.parseFormData"),
  );
