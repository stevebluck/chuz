import { Context, Effect, Layer } from "@chuz/prelude";

export const Cleanup = Context.GenericTag<Effect.Effect<void>>("Cleanup");

export const ReferenceCleanUp = Layer.effect(
  Cleanup,
  Effect.gen(function* () {
    yield* Effect.logDebug("Cleaning up ref database");
    return Effect.void;
  }),
);

export const DbCleanup = Layer.effect(
  Cleanup,
  Effect.gen(function* () {
    yield* Effect.logDebug("Cleaning up db database");
    return Effect.void;
  }),
);
