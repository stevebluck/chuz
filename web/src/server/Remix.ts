import { Token, User } from "@chuz/domain";
import { Effect, Layer, ManagedRuntime, Context, Ref, Scope, LogLevel, Config, Match, Logger } from "@chuz/prelude";
import { DevTools } from "@effect/experimental";
import { HttpServer } from "@effect/platform";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs, TypedResponse } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Passwords, ReferenceUsers, Users } from "core/index";
import { Routes } from "src/Routes";
import { RequestSession, Session } from "./Session";
import { Cookies, Http } from "./prelude";

const Dev = Layer.mergeAll(
  ReferenceUsers.layer,
  Cookies.layer,
  Passwords.layer,
  NodeFileSystem.layer,
  Path.layer,
  Logger.minimumLogLevel(LogLevel.All),
).pipe(Layer.provide(DevTools.layer()));

const Live = Layer.mergeAll(
  ReferenceUsers.layer,
  Cookies.layer,
  Passwords.layer,
  NodeFileSystem.layer,
  Path.layer,
  Logger.minimumLogLevel(LogLevel.Info),
);

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

export interface RemixHandler<A, E, R>
  extends Effect.Effect<Http.response.ServerResponse, E, R | AppEnv | RequestEnv> {}

export type Middleware<E, R> = (
  response: Http.response.ServerResponse,
) => Effect.Effect<Http.response.ServerResponse, E, R>;

const makeServerContext = (args: LoaderFunctionArgs | ActionFunctionArgs) =>
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.effect(
        Session,
        Cookies.Token.pipe(
          Effect.flatMap((token) => token.read),
          Effect.map((token) => Token.make<User.Id>(token)),
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
        Context.add(HttpServer.request.ServerRequest, HttpServer.request.fromWeb(args.request)),
        Context.add(Params, args.params),
      ),
    ),
  );

const setSessionCookie: Middleware<never, Cookies.Token | Session | Http.request.ServerRequest> = (response) =>
  Effect.gen(function* () {
    const cookie = yield* Cookies.Token;
    const requestSession = yield* Session.get;

    return yield* RequestSession.match({
      Set: ({ session }) => cookie.set(session.token.value)(response),
      Unset: () => cookie.remove(response),
      InvalidToken: () => cookie.remove(response),
      NotProvided: () => Effect.succeed(response),
      Provided: () => Effect.succeed(response),
    })(requestSession) as Effect.Effect<Http.response.ServerResponse>;
  });

const handleUnauthorized: Middleware<never, Cookies.ReturnTo | Http.request.ServerRequest> = (response) => {
  return Effect.if(
    Effect.sync(() => response.status === 401),
    {
      onTrue: () =>
        Http.request.url.pipe(
          Effect.map((url) => url.href),
          Effect.flatMap((url) =>
            Cookies.ReturnTo.pipe(
              Effect.flatMap((cookie) => Http.response.redirect(Routes.login).pipe(Effect.flatMap(cookie.set(url)))),
            ),
          ),
        ),
      onFalse: () => Effect.succeed(response),
    },
  );
};

export const loader =
  <A, E, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, E, R>) =>
  async (args: LoaderFunctionArgs): Promise<TypedResponse<A | E>> =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.flatMap(handleUnauthorized),
      Effect.map(HttpServer.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );

export const action =
  <A, E, R extends AppEnv | RequestEnv>(effect: RemixHandler<A, E, R>) =>
  async (args: ActionFunctionArgs): Promise<TypedResponse<A | E>> =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.map(HttpServer.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );
