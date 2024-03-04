import { Api, Response, Remix as _Remix } from "@chuz/runtime";
import { DevTools } from "@effect/experimental";
import { json, redirect } from "@remix-run/node";
import { Either } from "effect";
import { Layer } from "effect";

export const Remix = _Remix.makeRuntime({
  runtimeLayer: Api.Test.pipe(Layer.merge(DevTools.layer())),
  toRemixResponse: (res, headers) => {
    return Either.mapBoth(res, {
      onLeft: Response.Fail.match({
        ValidationError: (e) => {
          throw json(e, { status: 400, headers });
        },
        Redirect: ({ location }) => {
          throw redirect(location, { headers });
        },
      }),
      onRight: (e) => json(e, { status: 500, headers }),
    });
  },
});
