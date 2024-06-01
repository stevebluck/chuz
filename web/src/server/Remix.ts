import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { ServerRequest, fromWeb } from "@effect/platform/Http/ServerRequest";
import * as Path from "@effect/platform/Path";
import { unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
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
  Match,
  Logger,
  Exit,
  Cause,
  Predicate,
  Option,
  Ref,
} from "@chuz/prelude";
import { Cookies } from "./Cookies";
import { ResponseHeaders } from "./ResponseHeaders";
import { FormError, Ok, ServerResponse } from "./ServerResponse";
import { Session, setSessionCookie } from "./Session";
import { OAuth } from "./oauth/OAuth";

const AppLayer = Layer.mergeAll(
  Users.reference,
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

type RequestEnv =
  | ServerRequest
  | FileSystem.FileSystem
  | Params
  | Session
  | Scope.Scope
  | Path.Path
  | ResponseHeaders
  | ResponseStatus;

type RemixHandler<A extends Serializable, R> = Effect.Effect<
  Ok<A> | FormError,
  ServerResponse<A>,
  R | AppEnv | RequestEnv
>;

const makeRequestContext = (args: LoaderArgs | ActionArgs) => {
  const context = Context.empty().pipe(
    Context.add(ServerRequest, fromWeb(args.request)),
    Context.add(Params, args.params),
    Context.add(ResponseHeaders, args.response.headers),
    Context.add(ResponseStatus, Ref.unsafeMake(Option.fromNullable(args.response.status))),
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

export type Serializable =
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

type Loader = Parameters<typeof unstable_defineLoader>[0];
type LoaderArgs = Parameters<Loader>[0];

type Action = Parameters<typeof unstable_defineAction>[0];
type ActionArgs = Parameters<Action>[0];

const toRemixActionResponse = <A extends Serializable>(
  res: ServerResponse<A>,
): Effect.Effect<A | FormError, ServerResponse<A>, ResponseHeaders> =>
  Match.value(res).pipe(
    Match.tags({
      Ok: (a) => Effect.succeed(a.data),
      FormError: (e) => Effect.succeed({ errors: e.errors, values: e.values, _tag: "FormError" }) as any,
    }),
    Match.orElse(Effect.fail),
  );

const toRemixLoaderResponse = <A extends Serializable>(res: ServerResponse<A>) =>
  Match.value(res).pipe(
    Match.tags({
      Ok: (a) => Effect.succeed(a.data),
    }),
    Match.orElse(Effect.fail),
  );

const setResponse =
  <A extends Serializable>(response: LoaderArgs["response"]) =>
  (res: ServerResponse<A>): void =>
    Match.value(res).pipe(
      Match.tagsExhaustive({
        Ok: () => (response.status = 200),
        FormError: () => (response.status = 400),
        Unauthorized: () => (response.status = 401),
        Unexpected: () => (response.status = 500),
        NotFound: () => (response.status = 404),
        Redirect: (e) => {
          response.status = 302;
          response.headers.set("Location", e.location);
        },
      }),
      () => {},
    );

const handleFailedResponse = <E extends Serializable>(cause: Cause.Cause<ServerResponse<E>>): never => {
  if (Cause.isFailType(cause)) {
    throw cause.error;
  }

  throw Cause.pretty(cause);
};

export const action = <A extends Serializable, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, R>) =>
  unstable_defineAction((args) => {
    const runnable = effect.pipe(
      Effect.merge,
      Effect.tap(() => setSessionCookie),
      Effect.tap(setResponse(args.response)),
      Effect.flatMap(toRemixActionResponse),
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse)) as Promise<A | FormError>;
  });

const loader = <A extends Serializable, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, R>) =>
  unstable_defineLoader((args) => {
    const runnable = effect.pipe(
      Effect.merge,
      Effect.tap(() => setSessionCookie),
      Effect.filterOrElse(Predicate.not(ServerResponse.isUnauthorized), () => Effect.flip(redirectToLogin)),
      Effect.tap(setResponse(args.response)),
      Effect.flatMap(toRemixLoaderResponse),
      Effect.provide(makeRequestContext(args)),
      Effect.scoped,
      Effect.exit,
    );

    return runtime.runPromise(runnable).then(Exit.getOrElse(handleFailedResponse)) as Promise<A>;
  });

export const unwrapLoader = <A1 extends Serializable, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<A1, R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(loader);

  return (args: LoaderArgs): Promise<A1> => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <A1 extends Serializable, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<A1, R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);

  return (args: ActionArgs): Promise<A1 | FormError> => awaitedHandler.then((handler) => handler(args));
};

export const Remix = { action, loader, unwrapLoader, unwrapAction };
