import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { fromWeb, HttpServerRequest } from "@effect/platform/HttpServerRequest";
import * as Path from "@effect/platform/Path";
import { unstable_data, ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Passwords, ReferenceUsers } from "@chuz/core";
import { Effect, Layer, ManagedRuntime, Context, Scope, LogLevel, Match, Logger, Exit, Cause, Option, Ref } from "@chuz/prelude";
import { Cookies } from "./Cookies";
import { FormError, NotFound, Redirect, ServerResponse, Unauthorized, Unexpected } from "./ServerResponse";
import { Session, setSessionCookie } from "./Session";
import { OAuth } from "./oauth/OAuth";

const AppLayer = Layer.mergeAll(ReferenceUsers.layer, Passwords.layer, OAuth.layer, Cookies.layer, NodeFileSystem.layer, Path.layer).pipe(
  Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
);

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

type RequestEnv = HttpServerRequest | FileSystem.FileSystem | Params | Session | Scope.Scope | Path.Path;

type ActionError = Redirect | Unauthorized | Unexpected | FormError;

type RemixActionHandler<R> = Effect.Effect<never, ActionError, R | AppEnv | RequestEnv>;

type LoaderError = Redirect | NotFound | Unauthorized | Unexpected;

type RemixLoaderHandler<A, R> = Effect.Effect<A, LoaderError, R | AppEnv | RequestEnv>;

const makeRequestContext = (args: LoaderFunctionArgs | ActionFunctionArgs) => {
  const context = Context.empty().pipe(Context.add(HttpServerRequest, fromWeb(args.request)), Context.add(Params, args.params), Layer.succeedContext);

  return Layer.provideMerge(Session.layer, context);
};

const redirectToLogin = Effect.gen(function* () {
  const cookies = yield* Cookies;
  const request = yield* HttpServerRequest;
  const url = new URL(request.url);

  yield* cookies.returnTo.set(url.href);

  return yield* ServerResponse.Redirect(Routes.login);
});

const matchLoaderError = Match.typeTags<Redirect | NotFound | Unexpected>();

const matchActionError = Match.typeTags<ActionError>();

export const action =
  <R extends AppEnv | RequestEnv>(effect: RemixActionHandler<R>) =>
  (args: ActionFunctionArgs): Promise<FormError | never> => {
    const runnable = effect.pipe(
      Effect.tap(() => setSessionCookie),
      Effect.tapError(() => setSessionCookie),
      Effect.provide(makeRequestContext(args)),
      Effect.mapError(
        matchActionError({
          Unauthorized: () => unstable_data({}, { status: 401 }),
          Unexpected: () => unstable_data({}, { status: 500 }),
          FormError: () => unstable_data({}, { status: 400 }),
          Redirect: (e) => unstable_data({}, { status: 302, headers: { Location: e.location } }),
        }),
      ),
      Effect.exit,
      Effect.scoped,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse));
  };

const loader =
  <A, R extends AppEnv | RequestEnv>(effect: RemixLoaderHandler<A, R>) =>
  (args: LoaderFunctionArgs): Promise<A> => {
    const runnable = effect.pipe(
      Effect.tap(() => setSessionCookie),
      Effect.tapError(() => setSessionCookie),
      Effect.catchTag("Unauthorized", () => redirectToLogin),
      Effect.provide(makeRequestContext(args)),
      Effect.mapError(
        matchLoaderError({
          NotFound: () => unstable_data({}, { status: 404 }),
          Unexpected: () => unstable_data({}, { status: 500 }),
          Redirect: (e) => unstable_data({}, { status: 302, headers: { Location: e.location } }),
        }),
      ),
      Effect.exit,
      Effect.scoped,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse));
  };

const handleFailedResponse = <E>(cause: Cause.Cause<E>) => {
  if (Cause.isFailType(cause)) {
    throw cause.error;
  }

  throw Cause.pretty(cause);
};

export const unwrapLoader = <A1, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(effect: Effect.Effect<RemixLoaderHandler<A1, R1>, E, R2>) => {
  const awaitedHandler = runtime.runPromise(effect).then(loader);

  return (args: LoaderFunctionArgs): Promise<A1> => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(effect: Effect.Effect<RemixActionHandler<R1>, E, R2>) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);

  return (args: ActionFunctionArgs): Promise<FormError> => awaitedHandler.then((handler) => handler(args));
};

export const Remix = { action, loader, unwrapLoader, unwrapAction };
