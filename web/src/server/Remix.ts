import { Token, User } from "@chuz/domain";
import { Effect, Layer, ManagedRuntime, Context, Ref, Scope } from "@chuz/prelude";
import { HttpServer } from "@effect/platform";
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as FileSystem from "@effect/platform/FileSystem";
import { BodyError } from "@effect/platform/Http/Body";
import * as Path from "@effect/platform/Path";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Params as RemixParams } from "@remix-run/react";
import { Cookies, Http } from ".";
import { AppLayer } from "./AppLayer";
import { RequestSession, Session } from "./Session";
import { Users } from "./Users";

const runtime = ManagedRuntime.make(Layer.mergeAll(AppLayer, NodeFileSystem.layer, Path.layer));

interface Params {
  readonly _: unique symbol;
}
const Params = Context.GenericTag<Params, RemixParams>("@services/Params");

type AppEnv = Layer.Layer.Success<typeof AppLayer>;

type RequestEnv = HttpServer.request.ServerRequest | FileSystem.FileSystem | Params | Session | Scope.Scope | Path.Path;

export interface RemixHandler<R>
  extends Effect.Effect<
    HttpServer.response.ServerResponse,
    HttpServer.response.ServerResponse | BodyError,
    R | AppEnv | RequestEnv
  > {}

const makeServerContext = (args: LoaderFunctionArgs | ActionFunctionArgs) =>
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.effect(
        Session,
        Cookies.Token.pipe(
          Effect.flatMap((token) => token.read),
          Effect.map((token) => Token.make<User.Id>(token)),
          Effect.flatMap(Users.identify),
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

const setSessionCookie = (response: HttpServer.response.ServerResponse) =>
  Effect.gen(function* () {
    const cookie = yield* Cookies.Token;
    const requestSession = yield* Session.get;

    return yield* RequestSession.match({
      Set: ({ session }) => Http.response.setCookie(cookie, session.token.value)(response),
      Unset: () => cookie.remove(response),
      InvalidToken: () => cookie.remove(response),
      NotProvided: () => Effect.succeed(response),
      Provided: () => Effect.succeed(response),
    })(requestSession);
  });

export const loader =
  <R extends AppEnv | RequestEnv>(effect: RemixHandler<R>) =>
  async (args: LoaderFunctionArgs): Promise<Response> =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.map(HttpServer.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );

export const action =
  (effect: RemixHandler<AppEnv | RequestEnv>) =>
  async (args: ActionFunctionArgs): Promise<Response> =>
    effect.pipe(
      Effect.flatMap(setSessionCookie),
      Effect.map(HttpServer.response.toWeb),
      Effect.provide(makeServerContext(args)),
      Effect.scoped,
      runtime.runPromise,
    );
