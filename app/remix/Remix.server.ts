import { ParseError } from "@effect/schema/ParseResult";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse, json, redirect } from "@remix-run/node";
import { Effect, Either, LogLevel, Logger, Option } from "effect";
import { Capabilities, User } from "~/core";
import { Request } from "./Request.server";
import { Response } from "./Response.sever";
import { Runtime } from "./Runtime.server";
import { CookieSessions } from "./Sessions.server";

const runtime = await Effect.runPromise(Runtime.dev);

type Context = Capabilities & {
  sessions: CookieSessions<User>;
};

type Parser<O> = (u: unknown) => Effect.Effect<O, ParseError>;

type ValidationError = {
  readonly _tag: "ValidationError";
  readonly errors: Record<string, readonly string[] | undefined>;
};

type HttpResponse<A, E> = TypedResponse<A | E | ValidationError | null>;

export namespace Remix {
  export const action =
    <Input, A, E>(
      parser: Parser<Input>,
      self: (input: Input, ctx: Context) => Effect.Effect<Response<A, E>, Response<A, E>>,
    ) =>
    async ({ request }: ActionFunctionArgs) => {
      const runnable = (ctx: Context) =>
        Request.formData(request, parser).pipe(
          Effect.flatMap(
            Either.match({
              onLeft: (errors) => Effect.sync(() => Response.ValidationError({ errors })),
              onRight: (input) => self(input, ctx),
            }),
          ),
        );

      return run(request, runnable);
    };

  export const loader =
    <A, E>(self: (ctx: Context) => Effect.Effect<Response<A, E>, Response<A, E>>) =>
    async ({ request }: LoaderFunctionArgs): Promise<HttpResponse<A, E>> => {
      return run(request, self);
    };

  const toHttpResponse = <A, E>(result: Response<A, E>, init?: ResponseInit): HttpResponse<A, E> =>
    Response.match<A, E>()({
      Redirect: ({ route }) => redirect(route, init),
      ValidationError: (error) => json(error, { status: 400, ...init }),
      UnknownError: ({ error }) => json(error, { status: 500, ...init }),
      Ok: () => json(null, init),
      Message: ({ data }) => json(data, init),
    })(result);

  const createContext = (request: globalThis.Request, runtime: Runtime) => {
    const context = CookieSessions.create(request, runtime.storage).pipe(
      Effect.map((sessions) => Object.assign(runtime.capabilites, { sessions })),
    );
    return context;
  };

  const run = <A, E>(
    request: globalThis.Request,
    self: (ctx: Context) => Effect.Effect<Response<A, E>, Response<A, E>>,
  ): Promise<HttpResponse<A, E>> => {
    const runnable = Effect.gen(function* (_) {
      const context = yield* _(createContext(request, runtime));

      const result = yield* _(self(context), Effect.merge);
      const cookie = yield* _(context.sessions.getCookie);

      return toHttpResponse<A, E>(
        result,
        Option.match(cookie, {
          onNone: () => ({}),
          onSome: (cookie) => ({ headers: { "Set-Cookie": cookie } }),
        }),
      );
    });

    return Effect.runPromise(runnable.pipe(Logger.withMinimumLogLevel(LogLevel.All)));
  };
}
