import { LoaderFunctionArgs } from "@remix-run/node";
import { Params } from "@remix-run/react";
import { AST, Effect, Layer, S } from "@chuz/prelude";
import { Request, Response } from "./Http";
import { Remix } from "./Remix";

export class Action<P, S, PI extends Params<string>, H, R extends string, B, RequestContext> {
  constructor(
    private route: ActionDesc<P, S, PI, H, R, B>,
    private layer: (request: globalThis.Request) => Layer.Layer<RequestContext>,
  ) {}

  make<R extends string>(name: string, route: R) {
    return new Action({ name, route }, this.layer);
  }

  path<P, PI extends Params<string>>(schema: S.Schema<P, PI>, options: AST.ParseOptions = { errors: "all" }) {
    return new Action({ ...this.route, decodePath: Request.decodePath(schema, options) }, this.layer);
  }

  search<S, SI extends Record<string, string>>(schema: S.Schema<S, SI>, options: AST.ParseOptions = { errors: "all" }) {
    return new Action({ ...this.route, decodeSearch: Request.decodeSearchParams(schema, options) }, this.layer);
  }

  headers<H, HI extends Record<string, string>>(
    schema: S.Schema<H, HI>,
    options: AST.ParseOptions = { errors: "all" },
  ) {
    return new Action({ ...this.route, decodeHeaders: Request.decodeHeaders(schema, options) }, this.layer);
  }

  body<Tag extends "FormData" | "Json", I, O extends Tag extends "FormData" ? Record<string, string | undefined> : any>(
    type: Tag,
    schema: S.Schema<I, O>,
    options: AST.ParseOptions = { errors: "all" },
  ) {
    return new Action({ ...this.route, decodeBody: Request.decodeBody(type, schema, options) }, this.layer);
  }

  handler<A>(fn: ActionHandlerFn<A, P, S, H, R, B, RequestContext>) {
    return async (args: LoaderFunctionArgs): Promise<A> => {
      const runnable = Effect.gen(this, function* () {
        return yield* fn({
          name: this.route.name,
          route: this.route.route,
          search: this.route.decodeSearch ? yield* this.route.decodeSearch(args.request) : (undefined as S),
          path: this.route.decodePath ? yield* this.route.decodePath(args.params as PI) : (undefined as P),
          headers: this.route.decodeHeaders ? yield* this.route.decodeHeaders(args.request) : (undefined as H),
          body: this.route.decodeBody ? yield* this.route.decodeBody(args.request) : (undefined as B),
        });
      }).pipe(Effect.provide(this.layer(args.request)));

      return Remix.fromEffect(runnable);
    };
  }
}

type ActionHamdlerArgs<P, S, H, R, B> = {
  name: string;
  route: R;
  path: P;
  search: S;
  headers: H;
  body: B;
};

type ActionDesc<P, S, I extends Params<string>, H, R extends string, B> = {
  name: string;
  route: R;
  decodePath?: Request.DecodePath<P, I>;
  decodeSearch?: Request.DecodeSearchParams<S>;
  decodeHeaders?: Request.DecodeHeaders<H>;
  decodeBody?: Request.DecodeBody<B>;
};

type ActionHandlerFn<A, P, S, H, R, B, RequestContext> = (
  args: ActionHamdlerArgs<P, S, H, R, B>,
) => Effect.Effect<Response.Success<A>, Response.Error, RequestContext>;
