import { Session, User } from "@chuz/domain";
import { Context, Data, Effect, Option, Ref } from "effect";
import * as Match from "effect/Match";

export type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: Session<User> };
  Set: { session: Session<User> };
  Unset: { session: Session<User> };
  InvalidToken: { session: Session<User> };
}>;

export namespace RequestSession {
  export const { InvalidToken, NotProvided, Provided, Set, Unset } = Data.taggedEnum<RequestSession>();
  export const makeMatcher = Match.typeTags<RequestSession>();
}

export interface Sessions<A> {
  get: Effect.Effect<RequestSession>;
  mint: (session: Session<A>) => Effect.Effect<void>;
  set: (session: Session<A>) => Effect.Effect<void>;
  invalidate: (session: Session<A>) => Effect.Effect<void>;
  authenticated: Effect.Effect<Session<A>, Unauthorised>;
  guest: Effect.Effect<void, Unauthorised>;
  getSession: Effect.Effect<Session<A>, NoSuchSession>;
}

export class Unauthorised extends Data.TaggedError("Unauthorised") {}
export class NoSuchSession extends Data.TaggedError("NoSuchSession") {}

export class UserSessions implements Sessions<User> {
  static make = (requestSession: RequestSession) => {
    return Ref.make<RequestSession>(requestSession).pipe(Effect.map((ref) => new UserSessions(ref)));
  };

  constructor(private readonly ref: Ref.Ref<RequestSession>) {}

  get = Effect.suspend(() => Ref.get(this.ref));

  mint = (session: Session<User>) => Ref.set(this.ref, RequestSession.Set({ session }));

  set = (session: Session<User>) => Ref.set(this.ref, RequestSession.Set({ session }));

  unset = (session: Session<User>) => Ref.set(this.ref, RequestSession.Unset({ session }));

  invalidate = (session: Session<User>) => Effect.suspend(() => Ref.set(this.ref, RequestSession.Unset({ session })));

  authenticated = Effect.suspend(() => Ref.get(this.ref)).pipe(
    Effect.flatMap(
      RequestSession.makeMatcher({
        NotProvided: () => Option.none(),
        Provided: ({ session }) => Option.some(session),
        Set: ({ session }) => Option.some(session),
        InvalidToken: () => Option.none(),
        Unset: () => Option.none(),
      }),
    ),
    Effect.mapError(() => new Unauthorised()),
  );

  guest = Effect.suspend(() => Ref.get(this.ref)).pipe(
    Effect.flatMap(
      RequestSession.makeMatcher({
        NotProvided: () => Option.some({}),
        Provided: () => Option.none(),
        Set: () => Option.none(),
        InvalidToken: () => Option.some({}),
        Unset: () => Option.some({}),
      }),
    ),
    Effect.mapError(() => new Unauthorised()),
  );

  getSession = Effect.suspend(() => this.authenticated).pipe(Effect.mapError(() => new NoSuchSession()));
}
