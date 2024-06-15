import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { ServerRequest, fromWeb } from "@effect/platform/Http/ServerRequest";
import * as Path from "@effect/platform/Path";
import { json, unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Passwords, ReferenceUsers } from "@chuz/core";
import {
  Effect,
  Layer,
  ManagedRuntime,
  Context,
  Scope,
  LogLevel,
  Match,
  Logger,
  Exit,
  Cause,
  Option,
  Ref,
} from "@chuz/prelude";
import { Cookies } from "./Cookies";
import { ResponseHeaders } from "./ResponseHeaders";
import { FormError, NotFound, Redirect, ServerResponse, Unauthorized, Unexpected } from "./ServerResponse";
import { Session, setSessionCookie } from "./Session";
import { OAuth } from "./oauth/OAuth";

const AppLayer = Layer.mergeAll(
  ReferenceUsers.layer,
  Passwords.layer,
  OAuth.layer,
  Cookies.layer,
  NodeFileSystem.layer,
  Path.layer,
).pipe(Layer.provide(Logger.minimumLogLevel(LogLevel.All)));

const runtime = ManagedRuntime.make(AppLayer);

interface Params {
  readonly _: unique symbol;
}
const Params = Context.GenericTag<Params, RemixParams>("@services/Params");

interface ResponseStatus {
  readonly _: unique symbol;
}
const ResponseStatus = Context.GenericTag<ResponseStatus, Ref.Ref<Option.Option<number>>>("@services/ResponseStatus");

type AppEnv = Layer.Layer.Success<typeof AppLayer>;

type RequestEnv = ServerRequest | FileSystem.FileSystem | Params | Session | Scope.Scope | Path.Path | ResponseHeaders;

type ActionError = Redirect | Unauthorized | Unexpected | FormError;

type RemixActionHandler<R> = Effect.Effect<never, ActionError, R | AppEnv | RequestEnv>;

type LoaderError = Redirect | NotFound | Unauthorized | Unexpected;

type RemixLoaderHandler<A extends Serializable, R> = Effect.Effect<A, LoaderError, R | AppEnv | RequestEnv>;

type Serializable =
  | undefined
  | null
  | boolean
  | string
  | symbol
  | number
  | Array<Serializable>
  | {
      [key: PropertyKey]: Serializable;
    }
  | bigint
  | Date
  | URL
  | RegExp
  | Error
  | Map<Serializable, Serializable>
  | Set<Serializable>
  | Promise<Serializable>;

type RemixLoader = Parameters<typeof unstable_defineLoader>[0];
type LoaderArgs = Parameters<RemixLoader>[0];

type RemixAction = Parameters<typeof unstable_defineAction>[0];
type ActionArgs = Parameters<RemixAction>[0];

const makeRequestContext = (args: LoaderArgs | ActionArgs) => {
  const context = Context.empty().pipe(
    Context.add(ServerRequest, fromWeb(args.request)),
    Context.add(Params, args.params),
    Context.add(ResponseHeaders, args.response.headers),
    Layer.succeedContext,
  );

  return Layer.provideMerge(Session.layer, context);
};

const redirectToLogin = Effect.gen(function* () {
  const cookies = yield* Cookies;
  const request = yield* ServerRequest;
  const url = new URL(request.url);

  yield* cookies.returnTo.set(url.href);

  return yield* ServerResponse.Redirect(Routes.login);
});

const matchLoaderError = Match.typeTags<Redirect | NotFound | Unexpected>();

const matchActionError = Match.typeTags<ActionError>();

const handleFailedResponse = <E extends Serializable>(cause: Cause.Cause<E>) => {
  if (Cause.isFailType(cause)) {
    throw cause.error;
  }

  throw Cause.pretty(cause);
};

export const action = <R extends AppEnv | RequestEnv>(effect: RemixActionHandler<R>) =>
  unstable_defineAction((args) => {
    const runnable = effect.pipe(
      Effect.tap(() => setSessionCookie),
      Effect.tapError(() => setSessionCookie),
      Effect.tapError((e) =>
        Effect.sync(() =>
          matchActionError({
            Unauthorized: () => (args.response.status = 401),
            Unexpected: () => (args.response.status = 500),
            FormError: () => (args.response.status = 400),
            Redirect: (e) => {
              args.response.status = 302;
              args.response.headers.set("Location", e.location);
            },
          })(e),
        ),
      ),
      Effect.catchTag("FormError", (e) => Effect.succeed(e.toJSON())), // TODO: map FormError to ErrorResponse
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse)) as Promise<FormError>;
  });

const loader = <A extends Serializable, R extends AppEnv | RequestEnv>(effect: RemixLoaderHandler<A, R>) =>
  unstable_defineLoader((args) => {
    const runnable = effect.pipe(
      Effect.tap(() => setSessionCookie),
      Effect.tapError(() => setSessionCookie),
      Effect.catchTag("Unauthorized", () => redirectToLogin),
      Effect.tapError((e) =>
        Effect.sync(() =>
          matchLoaderError({
            Unexpected: () => (args.response.status = 500),
            NotFound: () => (args.response.status = 404),
            Redirect: (e) => {
              args.response.status = 302;
              args.response.headers.set("Location", e.location);
            },
          })(e),
        ),
      ),
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(
      Exit.getOrElse((cause) => {
        if (Cause.isFailType(cause)) {
          throw json(cause.error.message, {
            status: args.response.status || 500,
            headers: args.response.headers,
          });
        }

        throw Cause.pretty(cause);
      }),
    ) as Promise<A>;
  });

export const unwrapLoader = <A1 extends Serializable, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixLoaderHandler<A1, R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(loader);

  return (args: LoaderArgs): Promise<A1> => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixActionHandler<R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);

  return (args: ActionArgs): Promise<FormError> => awaitedHandler.then((handler) => handler(args));
};

export const Remix = { action, loader, unwrapLoader, unwrapAction };
