import { Effect, Exit, Layer, Scope } from "effect";
import { AppLayer } from "./AppLayer.server";

const scope = Effect.runSync(Scope.make());

export const ServeRuntime = Effect.runSync(Layer.toRuntime(AppLayer).pipe(Scope.extend(scope)));

// Cleaning up any resources used by the configuration layer
Effect.runFork(Scope.close(scope, Exit.unit));
