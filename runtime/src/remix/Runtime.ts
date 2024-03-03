import { Sessions } from "@chuz/core";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse, json } from "@remix-run/node";
import { Context, Effect, Exit, Fiber, Layer, Runtime, Scope, Either, Cause, Metric } from "effect";
import { pretty } from "effect/Cause";
import { makeFiberFailure } from "effect/Runtime";
import { Requests } from "..";
import { Response } from "../Response";
import { RemixRequests, RemixSessions, RequestContext } from "./RequestLayer";
import { setRequestHeaders } from "./setRequestHeaders";

const runtimeSymbol = Symbol.for("@globals/RemixRuntime");

type RemixResponse<A> = Either.Either<TypedResponse<A>, TypedResponse<Response.Fail>>;

interface RemixRuntimeArgs<AppLayer> {
  runtimeLayer: Layer.Layer<AppLayer>;
  toRemixResponse: <A>(res: Either.Either<A, Response.Fail>, headers: Headers) => RemixResponse<A>;
}

export const makeRuntime = <AppLayer>({ runtimeLayer, toRemixResponse }: RemixRuntimeArgs<AppLayer>) => {
  const fibers = new Set<Fiber.RuntimeFiber<any, any>>();

  let closed = false;

  const onExit = () => {
    if (!closed) {
      closed = true;
      make
        .then(({ close }) => Effect.runPromise(close))
        .then(() => {
          process.exit(0);
        });
    }
  };

  const make = Effect.gen(function* (_) {
    const scope = yield* _(Scope.make());
    const runtime = yield* _(Layer.toRuntime(runtimeLayer), Scope.extend(scope));
    const close = Scope.close(scope, Exit.unit);

    yield* _(Effect.logInfo("Remix Effect runtime initiated"));

    const closeLoop: Effect.Effect<void> = Fiber.interruptAll(fibers).pipe(
      Effect.flatMap(() => (fibers.size > 0 ? closeLoop : Effect.unit)),
    );

    const finalClose = Effect.flatMap(
      Effect.flatMap(closeLoop, () => close),
      () =>
        Effect.sync(() => {
          process.removeListener("SIGTERM", onExit);
          process.removeListener("SIGINT", onExit);
        }),
    );

    if (runtimeSymbol in globalThis) {
      yield* _((globalThis as any)[runtimeSymbol] as typeof finalClose);
    }

    // @ts-expect-error
    globalThis[runtimeSymbol] = finalClose;
    process.on("SIGINT", onExit);
    process.on("SIGTERM", onExit);

    return { runtime, close: finalClose };
  }).pipe(Effect.runPromise);

  const run = async <A>(headers: Headers, body: Effect.Effect<A, Response.Fail, AppLayer>) => {
    const { runtime } = await make;

    const fiber = Runtime.runFork(runtime)(body);

    return new Promise<RemixResponse<A>>((res, rej) => {
      fibers.add(fiber);
      fiber.addObserver((exit) => {
        fibers.delete(fiber);

        if (Exit.isSuccess(exit)) {
          const result = toRemixResponse(Either.right(exit.value), headers);
          return res(result);
        }

        if (Cause.isFailType(exit.cause)) {
          const result = toRemixResponse(Either.left(exit.cause.error), headers);
          return res(result);
        }

        const failure = makeFiberFailure(exit.cause);
        const error = new Error();
        error.message = failure.message;
        error.name = failure.name;
        error.stack = pretty(exit.cause);

        rej(error);
      });
    });
  };

  const handler =
    <A>(body: Effect.Effect<A, Response.Fail, AppLayer | RequestContext>) =>
    (args: LoaderFunctionArgs | ActionFunctionArgs): Promise<RemixResponse<A>> => {
      const headers = new Headers();

      const runnable = setRequestHeaders(headers, body).pipe(
        Effect.tap((a) => Effect.annotateCurrentSpan("response", JSON.stringify(a))),
        Effect.tapErrorCause(Effect.logError),
        Effect.provideService(Requests, RemixRequests(args.request)),
        Effect.provideServiceEffect(Sessions, RemixSessions(args.request)),
        Effect.withSpan(new URL(args.request.url).pathname, {
          attributes: {
            url: args.request.url,
            method: args.request.method,
          },
        }),
        Metric.counter("route_count").pipe(Metric.withConstantInput(1)),
      );

      return run(headers, runnable);
    };

  return {
    Loader: handler,
    Action: handler,
  };
};

export interface RemixRequestContext {
  readonly _: unique symbol;
}

export const RemixRequestContext = Context.GenericTag<RemixRequestContext, LoaderFunctionArgs | ActionFunctionArgs>(
  "@remix/RemixRequestContext",
);
