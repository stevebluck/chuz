import { TypedResponse, json } from "@remix-run/node";
import { Effect, Runtime, Logger, LogLevel } from "effect";
import { AppLayer } from "./AppLayer.server";
import { Request } from "./Request.server";
import { ServeRuntime } from "./ServerRuntime.server";

export const Remix = {
  runPromise:
    <A, E, R extends AppLayer>(self: Effect.Effect<A, E, R>) =>
    (request: globalThis.Request, init?: ResponseInit): Promise<TypedResponse<A>> => {
      const headers = new globalThis.Headers(init?.headers);

      const runnable = self.pipe(
        Effect.map((result) => json(result, { headers })),
        Effect.provideService(Request, request),
        Logger.withMinimumLogLevel(LogLevel.Debug),
      );

      return Runtime.runPromise(ServeRuntime)(runnable);
    },
};
