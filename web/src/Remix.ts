import { Capabilities } from "@chuz/core";
import { Response, Remix as _Remix } from "@chuz/runtime";
import { DevTools } from "@effect/experimental";
import { json, redirect } from "@remix-run/node";
import { Either } from "effect";
import { Layer } from "effect";

export const Remix = _Remix.makeRuntime({
  runtimeLayer: Capabilities.Test.pipe(Layer.merge(DevTools.layer())),
  toRemixResponse: (res, headers) => {
    return Either.mapBoth(res, {
      onLeft: Response.Fail.match({
        NotFound: (e) => {
          throw json(e, { status: 404, headers });
        },
        Redirect: ({ location }) => {
          throw redirect(location, { headers });
        },
      }),
      onRight: (e) => json(e, { status: 500, headers }),
    });
  },
});
