import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Effect, Exit, Fiber, Layer, Runtime, Scope } from "effect";
import { pretty } from "effect/Cause";
import { makeFiberFailure } from "effect/Runtime";

const runtimeSymbol = Symbol.for("@globals/Runtime");

export const remixRuntime = <A, E>(layer: Layer.Layer<A, E, never>) => {
  const fibers = new Set<Fiber.RuntimeFiber<any, any>>();

  let closed = false;

  const onExit = () => {
    if (!closed) {
      closed = true;
      makeRuntime
        .then(({ close }) => Effect.runPromise(close))
        .then(() => {
          process.exit(0);
        });
    }
  };

  const makeRuntime = Effect.gen(function* (_) {
    const scope = yield* _(Scope.make());
    const runtime = yield* _(Layer.toRuntime(layer), Scope.extend(scope));
    const close = Scope.close(scope, Exit.unit);

    const closeLoop: Effect.Effect<void, never, never> = Fiber.interruptAll(fibers).pipe(
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

  const run = async <A, E>(body: Effect.Effect<A, E, Layer.Layer.Success<typeof layer>>) => {
    const { runtime } = await makeRuntime;

    return new Promise<A>((res, rej) => {
      const fiber = Runtime.runFork(runtime)(body);
      fibers.add(fiber);
      fiber.addObserver((exit) => {
        fibers.delete(fiber);
        if (Exit.isSuccess(exit)) {
          res(exit.value);
        } else {
          const failure = makeFiberFailure(exit.cause);
          const error = new Error();
          error.message = failure.message;
          error.name = failure.name;
          error.stack = pretty(exit.cause);
          rej(error);
        }
      });
    });
  };

  const Loader =
    <E, A>(body: Effect.Effect<A, E, Layer.Layer.Success<typeof layer>>) =>
    (args: LoaderFunctionArgs): Promise<A> =>
      run(body);

  const Action =
    <E, A>(body: Effect.Effect<A, E, Layer.Layer.Success<typeof layer>>) =>
    (args: ActionFunctionArgs): Promise<A> =>
      run(body);

  return {
    Loader,
    Action,
  };
};
