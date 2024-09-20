import { Users } from "@chuz/core";
import { User, Session as DomainSession, Token, Id } from "@chuz/domain";
import { Data, Effect, Layer, Match, Ref } from "@chuz/prelude";
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
      get: Ref.get(ref),
      mint: (session) => Ref.set(ref, RequestSession.Set({ session })),
      set: (rs) => Ref.set(ref, rs),
      invalidate: Ref.set(ref, RequestSession.Unset()),
      authenticated: Ref.get(ref).pipe(
        Effect.flatMap(
          match({
            NotProvided: () => ServerResponse.Unauthorized,
            Provided: ({ session }) => Effect.succeed(session),
            Set: ({ session }) => Effect.succeed(session),
            InvalidToken: () => ServerResponse.Unauthorized,
            Unset: () => ServerResponse.Unauthorized,
          }),
        ),
      ),
      guest: Effect.suspend(() => Ref.get(ref)).pipe(
        Effect.flatMap(
          match({
            NotProvided: () => Effect.void,
            Provided: () => new AlreadyAuthenticated(),
            Set: () => new AlreadyAuthenticated(),
            InvalidToken: () => Effect.void,
            Unset: () => Effect.void,
          }),
        ),
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
  );
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
