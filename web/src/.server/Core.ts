import { Capabilities } from "@chuz/core";
import { Context, Effect, Layer } from "@chuz/prelude";
import { Runtime } from "./Runtime";

export const runtime = await Effect.runPromise(Runtime.make);

export class Core extends Context.Tag("Core")<Core, Capabilities>() {
  static makeLayer = (request: globalThis.Request) => Layer.succeed(Core, runtime.capabilities);
}
