import { Passwords, Users } from "@chuz/core";
import { Id, Token, User } from "@chuz/domain";
import {
  Effect,
  Layer,
  ManagedRuntime,
  Context,
  Ref,
  Scope,
  LogLevel,
  Config,
  Match,
  Logger,
  Exit,
  Cause,
  ConfigError,
} from "@chuz/prelude";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { ServerRequest } from "@effect/platform/Http/ServerRequest";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse, json, redirect } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Cookies } from "./Cookies";
import { ResponseHeaders } from "./ResponseHeaders";
import {
  BadRequest,
  LoaderResponse,
  NotFound,
  Redirect,
  Succeed,
  Unauthorized,
  Unexpected,
  ValidationError,
} from "./ServerResponse";
import { RequestSession, Session } from "./Session";
import { OAuth } from "./oauth/OAuth";

const Dev = Layer.mergeAll(
  Users.Reference,
  Passwords.layer,
  OAuth.layer,
  Cookies.layer,
  NodeFileSystem.layer,
  Path.layer,
).pipe(Layer.provide(Logger.minimumLogLevel(LogLevel.All)));

const Live = Layer.mergeAll(
  Users.Reference,
  OAuth.layer,
  Passwords.layer,
  Cookies.layer,
  NodeFileSystem.layer,
  Path.layer,
).pipe(Layer.provide(Logger.minimumLogLevel(LogLevel.All)));

const AppMode = Config.literal("live", "dev")("APP_MODE").pipe(Config.withDefault("dev"));

const AppLayer = Layer.unwrapEffect(
  Effect.map(AppMode, (mode) =>
    Match.value(mode).pipe(
      Match.when("live", () => Live),
      Match.when("dev", () => Dev),
      Match.exhaustive,
    ),
  ),
);

const runtime = ManagedRuntime.make(AppLayer);

interface Params {
  readonly _: unique symbol;
}
const Params = Context.GenericTag<Params, RemixParams>("@services/Params");

type AppEnv = Layer.Layer.Success<typeof AppLayer>;

type RequestEnv =
  | Http.request.ServerRequest
  | FileSystem.FileSystem
  | Params
  | Session
  | Scope.Scope
  | Path.Path
  | ResponseHeaders;

type RemixActionHandler<E extends { _tag: string }, R> = Effect.Effect<
  Redirect,
  BadRequest<E | ValidationError> | NotFound | Unauthorized | Redirect | Unexpected,
  R | AppEnv | RequestEnv
>;

type RemixLoaderHandler<A, R> = Effect.Effect<
  Succeed<A> | Redirect,
  NotFound | Unauthorized | Redirect | Unexpected,
  R | AppEnv | RequestEnv
>;

const makeServerContext = (args: LoaderFunctionArgs | ActionFunctionArgs) =>
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.effect(
        Session,
        Cookies.pipe(
          Effect.flatMap((cookies) => cookies.token.find),
          Effect.flatten,
          Effect.map((token) => Token.make<Id<User.User>>(token)),
          Effect.flatMap((session) => Users.pipe(Effect.flatMap((users) => users.identify(session)))),
          Effect.map((session) => RequestSession.Provided({ session })),
          Effect.orElseSucceed(() => RequestSession.NotProvided()),
          Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
          Effect.map(Session.make),
        ),
      ),
      Layer.sync(ResponseHeaders, () => new Headers()),
    ),
    Layer.succeedContext(
      Context.empty().pipe(
        Context.add(Http.request.ServerRequest, Http.request.fromWeb(args.request)),
        Context.add(Params, args.params),
      ),
    ),
  );

const setSessionCookie = <A, E, R>(
  self: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, Cookies | Session | Http.request.ServerRequest | ResponseHeaders | R> =>
  Effect.gen(function* () {
    const cookies = yield* Cookies;

    const setTokenCookie = Session.get.pipe(
      Effect.tap(
        RequestSession.match({
          Set: ({ session }) => cookies.token.set(session.token.value),
          Unset: () => cookies.token.remove,
          InvalidToken: () => cookies.token.remove,
          NotProvided: () => Effect.void,
          Provided: () => Effect.void,
        }),
      ),
    );

    return yield* self.pipe(
      Effect.tap(() => setTokenCookie),
      Effect.tapError(() => setTokenCookie),
    );
  });

const redirectToLogin = Effect.gen(function* () {
  const cookies = yield* Cookies;
  const request = yield* ServerRequest;
  const url = new URL(request.url);

  return yield* cookies.returnTo.set(url.href).pipe(Effect.zipRight(LoaderResponse.FailWithRedirect(Routes.login)));
});

const toRemixActionResponse = <E extends { _tag: string }, R extends RequestEnv | AppEnv>(
  self: RemixActionHandler<E, R>,
): Effect.Effect<TypedResponse<E | ValidationError>, Response, AppEnv | RequestEnv | R> => {
  return ResponseHeaders.pipe(
    Effect.flatMap((headers) => {
      return self.pipe(
        Effect.flatMap((a) => Effect.fail(a)),
        Effect.catchTags({
          BadRequest: (e) => Effect.sync(() => json(e.error, { status: 400, headers })),
          NotFound: () => Effect.failSync(() => json(null, { status: 404, headers })),
          Unauthorized: () => Effect.failSync(() => json(null, { status: 401, headers })),
          Redirect: (e) => Effect.failSync(() => redirect(e.location, { headers })),
          Unexpected: (e) => Effect.failSync(() => json({ error: e.error }, { status: 500, headers })),
        }),
      );
    }),
  );
};

const toRemixLoaderResponse = <A, R>(
  self: RemixLoaderHandler<A, R>,
): Effect.Effect<TypedResponse<A>, Response, AppEnv | RequestEnv | R> => {
  return ResponseHeaders.pipe(
    Effect.flatMap((headers) => {
      return self.pipe(
        Effect.flatMap((a) => (a._tag === "Succeed" ? Effect.succeed(a.data) : Effect.fail(a))),
        Effect.map((data) => json(data, { status: 200, headers })),
        Effect.catchTag("Unauthorized", () => redirectToLogin),
        Effect.catchTags({
          NotFound: () => Effect.failSync(() => json(null, { status: 404, headers })),
          Redirect: (e) => Effect.failSync(() => redirect(e.location, { headers })),
          Unexpected: (e) => Effect.failSync(() => json({ error: e.error }, { status: 500, headers })),
        }),
      );
    }),
  );
};

export const action =
  <E extends { _tag: string }, R extends AppEnv | RequestEnv>(effect: RemixActionHandler<E, R>) =>
  async (args: ActionFunctionArgs): Promise<TypedResponse<E | ValidationError>> => {
    const exit = await effect.pipe(
      setSessionCookie,
      toRemixActionResponse,
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromiseExit,
    );

    return Exit.getOrElse(exit, (cause) => {
      if (Cause.isFailType(cause)) {
        if (ConfigError.isConfigError(cause.error)) {
          throw json("Configuration error", { status: 500 });
        }

        throw cause.error;
      }

      throw json(Cause.pretty(cause), { status: 500 });
    });
  };

export const loader =
  <A, R extends AppEnv | RequestEnv>(effect: RemixLoaderHandler<A, R>) =>
  async (args: LoaderFunctionArgs): Promise<TypedResponse<A>> => {
    const exit = await effect.pipe(
      // handleUnauthorized,
      setSessionCookie,
      toRemixLoaderResponse,
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromiseExit,
    );

    return Exit.getOrElse(exit, (cause) => {
      if (Cause.isFailType(cause)) {
        if (ConfigError.isConfigError(cause.error)) {
          throw json("Configuration error", { status: 500 });
        }

        throw cause.error;
      }

      throw json(Cause.pretty(cause), { status: 500 });
    });
  };

export const unwrapLoader = <A1, R1 extends AppEnv | RequestEnv, E, R2 extends AppEnv>(
  effect: Effect.Effect<RemixLoaderHandler<A1, R1>, E, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(loader);
  return async (args: LoaderFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <E1 extends { _tag: string }, R1 extends AppEnv | RequestEnv, E2, R2 extends AppEnv>(
  effect: Effect.Effect<RemixActionHandler<E1, R1>, E2, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);
  return async (args: ActionFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};
