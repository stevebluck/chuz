import { User, Session as DomainSession } from "@chuz/domain";
import { Data, Effect, Match, Option, Ref } from "@chuz/prelude";

interface Sessions<A> {
  get: Effect.Effect<RequestSession>;
  mint: (session: DomainSession<A>) => Effect.Effect<void>;
  set: (requestSession: RequestSession) => Effect.Effect<void>;
  invalidate: Effect.Effect<void>;
  authenticated: Effect.Effect<DomainSession<A>, Unauthorised>;
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
          RequestSession.match({
            NotProvided: () => Option.none(),
            Provided: ({ session }) => Option.some(session),
            Set: ({ session }) => Option.some(session),
            InvalidToken: () => Option.none(),
            Unset: () => Option.none(),
          }),
        ),
        Effect.mapError(() => new Unauthorised()),
      ),
      guest: Effect.suspend(() => Ref.get(ref)).pipe(
        Effect.flatMap(
          RequestSession.match({
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
}

export type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: DomainSession<User.User> };
  Set: { session: DomainSession<User.User> };
  Unset: {};
  InvalidToken: {};
}> & {};

export namespace RequestSession {
  export const { InvalidToken, NotProvided, Provided, Set, Unset } = Data.taggedEnum<RequestSession>();
  export const match = Match.typeTags<RequestSession>();
}

class Unauthorised extends Data.TaggedError("Unauthorised") {}
class AlreadyAuthenticated extends Data.TaggedError("AlreadyAuthenticated") {}
