import { User, Session as DomainSession, Token, Id } from "@chuz/domain";
import { Console, Data, Effect, Layer, Match, Option, Ref } from "@chuz/prelude";
import { Users } from "core/index";
import { Cookies } from "./Cookies";
import { ServerResponse, Unauthorized } from "./ServerResponse";

interface Sessions<A> {
  get: Effect.Effect<RequestSession>;
  mint: (session: DomainSession<A>) => Effect.Effect<void>;
  set: (requestSession: RequestSession) => Effect.Effect<void>;
  invalidate: Effect.Effect<void>;
  authenticated: Effect.Effect<DomainSession<A>, Unauthorized>;
  guest: Effect.Effect<void, AlreadyAuthenticated>;
}

export class Session extends Effect.Tag("@app/Session")<Session, Sessions<User.User>>() {
  static make = (ref: Ref.Ref<RequestSession>) =>
    Session.of({
      get: Effect.suspend(() => Ref.get(ref)),
      mint: (session) => Ref.set(ref, RequestSession.Set({ session })),
      set: (rs) => Ref.set(ref, rs),
      invalidate: Effect.suspend(() => Ref.set(ref, RequestSession.Unset())),
      authenticated: Effect.suspend(() => Ref.get(ref)).pipe(
        Effect.flatMap(
          match({
            NotProvided: () => Option.none(),
            Provided: ({ session }) => Option.some(session),
            Set: ({ session }) => Option.some(session),
            InvalidToken: () => Option.none(),
            Unset: () => Option.none(),
          }),
        ),
        Effect.catchAll(() => ServerResponse.Unauthorized),
      ),
      guest: Effect.suspend(() => Ref.get(ref)).pipe(
        Effect.flatMap(
          match({
            NotProvided: () => Option.some({}),
            Provided: () => Option.none(),
            Set: () => Option.none(),
            InvalidToken: () => Option.some({}),
            Unset: () => Option.some({}),
          }),
        ),
        Effect.mapError(() => new AlreadyAuthenticated()),
      ),
    });

  static layer = Layer.effect(
    Session,
    Cookies.pipe(
      Effect.flatMap((cookies) => cookies.token.find),
      Effect.flatten,
      Effect.map((token) => Token.make<Id<User.User>>(token)),
      Effect.flatMap((session) => Users.pipe(Effect.flatMap((users) => users.identify(session)))),
      Effect.map((session) => RequestSession.Provided({ session })),
      Effect.orElseSucceed(() => RequestSession.NotProvided()),
      Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
      Effect.map(this.make),
    ),
  ).pipe(Layer.provide(Cookies.layer));
}

export const setSessionCookie = Effect.gen(function* () {
  const cookies = yield* Cookies;

  yield* Session.get.pipe(
    Effect.tap(
      match({
        Set: ({ session }) => cookies.token.set(session.token.value),
        Unset: () => cookies.token.remove,
        InvalidToken: () => cookies.token.remove,
        NotProvided: () => Effect.void,
        Provided: () => Effect.void,
      }),
    ),
  );
});

type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: DomainSession<User.User> };
  Set: { session: DomainSession<User.User> };
  Unset: {};
  InvalidToken: {};
}> & {};

const RequestSession = Data.taggedEnum<RequestSession>();
const match = Match.typeTags<RequestSession>();

class AlreadyAuthenticated extends Data.TaggedError("AlreadyAuthenticated") {}
