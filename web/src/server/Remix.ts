import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { ServerRequest, fromWeb } from "@effect/platform/Http/ServerRequest";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse, json, redirect } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Passwords, Users } from "@chuz/core";
import {
  Effect,
  Layer,
  ManagedRuntime,
  Context,
  Scope,
  LogLevel,
  Config,
  Match,
  Logger,
  Exit,
  Cause,
  ConfigError,
  Predicate,
} from "@chuz/prelude";
import { Cookies } from "./Cookies";
import { ResponseHeaders } from "./ResponseHeaders";
import { FormError, Ok, ServerResponse } from "./ServerResponse";
import { Session, setSessionCookie } from "./Session";
import { OAuth } from "./oauth/OAuth";

const Dev = Layer.mergeAll(
  Users.reference,
  Passwords.layer,
  OAuth.layer,
  Cookies.layer,
  NodeFileSystem.layer,
  Path.layer,
).pipe(Layer.provide(Logger.minimumLogLevel(LogLevel.All)));

const Live = Layer.mergeAll(
  Users.reference,
  OAuth.layer,
  Passwords.layer,
  Cookies.layer,
  NodeFileSystem.layer,
  Path.layer,
).pipe(Layer.provide(Logger.minimumLogLevel(LogLevel.Error)));

const AppMode = Config.literal("live", "dev")("APP_MODE").pipe(Config.withDefault("dev"));

const AppLayer = Layer.unwrapEffect(Effect.map(AppMode, (mode) => (mode === "dev" ? Dev : Live)));

const runtime = ManagedRuntime.make(AppLayer);

interface Params {
  readonly _: unique symbol;
}
const Params = Context.GenericTag<Params, RemixParams>("@services/Params");

type AppEnv = Layer.Layer.Success<typeof AppLayer>;

type RequestEnv = ServerRequest | FileSystem.FileSystem | Params | Session | Scope.Scope | Path.Path | ResponseHeaders;

type RemixHandler<A, R> = Effect.Effect<Ok<A> | FormError, ServerResponse<A>, R | AppEnv | RequestEnv>;

const makeRequestContext = (args: LoaderFunctionArgs | ActionFunctionArgs) => {
  const context = Context.empty().pipe(
    Context.add(ServerRequest, fromWeb(args.request)),
    Context.add(Params, args.params),
    Context.add(ResponseHeaders, new Headers()),
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

const toRemixActionResponse = <A>(
  res: ServerResponse<A>,
): Effect.Effect<TypedResponse<Ok<A> | FormError>, Response, ResponseHeaders> =>
  Effect.gen(function* () {
    const headers = yield* ResponseHeaders;

    return yield* Match.value(res).pipe(
      Match.tagsExhaustive({
        Ok: (a) => Effect.sync(() => json(a, { headers })),
        FormError: (e) => Effect.sync(() => json(e, { status: 400, headers })),
        Unauthorized: (e) => Effect.failSync(() => json(e, { status: 401, headers })),
        Unexpected: (e) => Effect.failSync(() => json(e, { status: 500, headers })),
        NotFound: (e) => Effect.failSync(() => json(e, { status: 404, headers })),
        Redirect: ({ location }) => Effect.failSync(() => redirect(location, { headers })),
      }),
    );
  });

const toRemixLoaderResponse = <A>(
  res: ServerResponse<A>,
): Effect.Effect<TypedResponse<Ok<A>>, Response, ResponseHeaders> =>
  Effect.gen(function* () {
    const headers = yield* ResponseHeaders;

    return yield* Match.value(res).pipe(
      Match.tagsExhaustive({
        Ok: (a) => Effect.sync(() => json(a, { headers })),
        FormError: (e) => Effect.failSync(() => json(e, { status: 400, headers })),
        Unauthorized: (e) => Effect.failSync(() => json(e, { status: 401, headers })),
        Unexpected: (e) => Effect.failSync(() => json(e, { status: 500, headers })),
        NotFound: (e) => Effect.failSync(() => json(e, { status: 404, headers })),
        Redirect: ({ location }) => Effect.failSync(() => redirect(location, { headers })),
      }),
    );
  });

const handleFailedResponse = (cause: Cause.Cause<ConfigError.ConfigError | Response>) => {
  if (Cause.isFailType(cause)) {
    if (ConfigError.isConfigError(cause.error)) {
      throw json("Configuration error", { status: 500 });
    }

    throw cause.error;
  }

  throw json(Cause.pretty(cause), { status: 500 });
};

export const action =
  <A, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, R>) =>
  async (args: ActionFunctionArgs): Promise<TypedResponse<Ok<A> | FormError>> => {
    const runnable = effect.pipe(
      Effect.merge,
      Effect.tap(() => setSessionCookie),
      Effect.flatMap(toRemixActionResponse),
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse));
  };

export const loader =
  <A, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, R>) =>
  async (args: LoaderFunctionArgs): Promise<TypedResponse<Ok<A>>> => {
    const runnable = effect.pipe(
      Effect.merge,
      Effect.tap(() => setSessionCookie),
      Effect.filterOrElse(Predicate.not(ServerResponse.isUnauthorized), () => Effect.flip(redirectToLogin)),
      Effect.flatMap(toRemixLoaderResponse),
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse));
  };

export const unwrapLoader = <A1, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<A1, R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(loader);
  return async (args: LoaderFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <A1, R1 extends AppEnv | RequestEnv, E2, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<A1, R1>, E2, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);
  return async (args: ActionFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};

export const Remix = { action, loader, unwrapLoader, unwrapAction };
