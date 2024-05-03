import { Passwords, Users } from "@chuz/core";
import { Id, Token, User } from "@chuz/domain";
import { Effect, Layer, ManagedRuntime, Context, Ref, Scope, LogLevel, Config, Match, Logger } from "@chuz/prelude";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Http from "@effect/platform/HttpServer";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Routes } from "src/Routes";
import { Cookies } from "./Cookies";
import * as ServerRequest from "./ServerRequest";
import * as ServerResponse from "./ServerResponse";
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

type RequestEnv = Http.request.ServerRequest | FileSystem.FileSystem | Params | Session | Scope.Scope | Path.Path;

export interface RemixHandler<E, R>
  extends Effect.Effect<Http.response.ServerResponse, E | Http.response.ServerResponse, R | AppEnv | RequestEnv> {}

export type Middleware<E, R> = (
  response: Http.response.ServerResponse,
) => Effect.Effect<Http.response.ServerResponse, E, R>;

const makeServerContext = (args: LoaderFunctionArgs | ActionFunctionArgs) =>
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.effect(
        Session,
        Cookies.pipe(
          Effect.flatMap((cookies) => cookies.token.read),
          Effect.map((token) => Token.make<Id<User.User>>(token)),
          Effect.flatMap((session) => Users.pipe(Effect.flatMap((users) => users.identify(session)))),
          Effect.map((session) => RequestSession.Provided({ session })),
          Effect.orElseSucceed(() => RequestSession.NotProvided()),
          Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
          Effect.map(Session.make),
        ),
      ),
    ),
    Layer.succeedContext(
      Context.empty().pipe(
        Context.add(Http.request.ServerRequest, Http.request.fromWeb(args.request)),
        Context.add(Params, args.params),
      ),
    ),
  );

const setSessionCookie: Middleware<never, Cookies | Session | Http.request.ServerRequest> = (response) =>
  Effect.gen(function* () {
    const cookies = yield* Cookies;
    const requestSession = yield* Session.get;

    return yield* RequestSession.match({
      Set: ({ session }) => cookies.token.set(session.token.value)(response),
      Unset: () => cookies.token.remove(response),
      InvalidToken: () => cookies.token.remove(response),
      NotProvided: () => Effect.succeed(response),
      Provided: () => Effect.succeed(response),
    })(requestSession) as Effect.Effect<Http.response.ServerResponse>;
  });

const handleUnauthorized: Middleware<never, Cookies | Http.request.ServerRequest> = (response) => {
  return Effect.gen(function* () {
    const cookies = yield* Cookies;
    const url = yield* ServerRequest.url;

    if (response.status === 401) {
      return yield* Effect.flatMap(ServerResponse.redirect(Routes.login), cookies.returnTo.set(url.href));
    }

    return response;
  });
};

export const loader =
  <E, R extends AppEnv | RequestEnv>(effect: RemixHandler<E, R>) =>
  async (args: LoaderFunctionArgs) =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.flatMap(handleUnauthorized),
      Effect.map(Http.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );

export const action =
  <E, R extends AppEnv | RequestEnv>(effect: RemixHandler<E, R>) =>
  async (args: ActionFunctionArgs) =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.map(Http.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );

export const unwrapLoader = <E1, R1 extends AppEnv | RequestEnv, E2, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<E1, R1>, E2, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);
  return async (args: LoaderFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};

export const unwrapAction = <E1, R1 extends AppEnv | RequestEnv, E2, R2 extends AppEnv>(
  effect: Effect.Effect<RemixHandler<E1, R1>, E2, R2>,
) => {
  const awaitedHandler = runtime.runPromise(effect).then(action);
  return async (args: ActionFunctionArgs) => awaitedHandler.then((handler) => handler(args));
};
