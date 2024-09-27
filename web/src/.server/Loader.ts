import { LoaderFunctionArgs } from "@remix-run/node";
import { Params } from "@remix-run/react";
import { AST, Effect, Layer, S } from "@chuz/prelude";
import { Request, Response } from "./Http";
import { Remix } from "./Remix";

export class Loader<P, S, PI extends Params<string>, H, R extends string, RequestContext> {
  constructor(
    private route: LoaderDesc<P, S, PI, H, R>,
    private layer: (request: globalThis.Request) => Layer.Layer<RequestContext>,
  ) {}

  make<R extends string>(name: string, route: R) {
    return new Loader({ name, route }, this.layer);
  }

  path<P, PI extends Params<string>>(schema: S.Schema<P, PI>, options: AST.ParseOptions = { errors: "all" }) {
    return new Loader({ ...this.route, decodePath: Request.decodePath(schema, options) }, this.layer);
  }

  search<S, SI extends Record<string, string>>(schema: S.Schema<S, SI>, options: AST.ParseOptions = { errors: "all" }) {
    return new Loader({ ...this.route, decodeSearch: Request.decodeSearchParams(schema, options) }, this.layer);
  }

  headers<H, HI extends Record<string, string>>(
    schema: S.Schema<H, HI>,
    options: AST.ParseOptions = { errors: "all" },
  ) {
    return new Loader({ ...this.route, decodeHeaders: Request.decodeHeaders(schema, options) }, this.layer);
  }

  handler<A>(fn: LoaderHandlerFn<A, P, S, H, R, RequestContext>) {
    return async (args: LoaderFunctionArgs): Promise<A> => {
      const runnable = Effect.gen(this, function* () {
        return yield* fn({
          name: this.route.name,
          route: this.route.route,
          search: this.route.decodeSearch ? yield* this.route.decodeSearch(args.request) : (undefined as S),
          path: this.route.decodePath ? yield* this.route.decodePath(args.params as PI) : (undefined as P),
          headers: this.route.decodeHeaders ? yield* this.route.decodeHeaders(args.request) : (undefined as H),
        });
      }).pipe(Effect.provide(this.layer(args.request)));

      return Remix.fromEffect(runnable);
    };
  }
}

type LoaderHamdlerArgs<P, S, H, R> = {
  name: string;
  route: R;
  path: P;
  search: S;
  headers: H;
};

type LoaderDesc<P, S, I extends Params<string>, H, R extends string> = {
  name: string;
  route: R;
  decodePath?: Request.DecodePath<P, I>;
  decodeSearch?: Request.DecodeSearchParams<S>;
  decodeHeaders?: Request.DecodeHeaders<H>;
};

type LoaderHandlerFn<A, P, S, H, R, RequestContext> = (
  args: LoaderHamdlerArgs<P, S, H, R>,
) => Effect.Effect<Response.Success<A>, Response.Error, RequestContext>;
