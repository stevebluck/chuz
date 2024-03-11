import { Session, User, UserSession } from "@chuz/domain";
import { Context, Data, Effect, Layer, Option, Ref } from "effect";
import * as Match from "effect/Match";

export type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: Session<User> };
  Set: { session: Session<User> };
  Unset: {};
  InvalidToken: {};
}>;

export namespace RequestSession {
  export const { InvalidToken, NotProvided, Provided, Set, Unset } = Data.taggedEnum<RequestSession>();
  export const makeMatcher = Match.typeTags<RequestSession>();
}

export interface Sessions<A> {
  get: Effect.Effect<RequestSession>;
  mint: (session: Session<A>) => Effect.Effect<void>;
  set: (session: Option.Option<Session<A>>) => Effect.Effect<void>;
  invalidate: Effect.Effect<void>;
  authenticated: Effect.Effect<Session<A>, Unauthorised>;
  guest: Effect.Effect<void, Unauthorised>;
}

export const Sessions = Context.GenericTag<Sessions<User>, Sessions<User>>("@core/Sessions");

export class Unauthorised extends Data.TaggedError("Unauthorised") {}

export class UserSessions implements Sessions<User> {
  static make = (requestSession: RequestSession) => {
    return Ref.make<RequestSession>(requestSession).pipe(Effect.map((ref) => new UserSessions(ref)));
  };

  constructor(private readonly ref: Ref.Ref<RequestSession>) {}

  get = Effect.suspend(() => Ref.get(this.ref)).pipe(Effect.withSpan("Sessions.get"));

  mint = (session: Session<User>) =>
    Ref.set(this.ref, RequestSession.Set({ session })).pipe(Effect.withSpan("Sessions.mint"));

  set = (session: Option.Option<Session<User>>) =>
    Ref.set(
      this.ref,
      Option.match(session, {
        onNone: () => RequestSession.Unset(),
        onSome: (session) => RequestSession.Set({ session }),
      }),
    ).pipe(Effect.withSpan("Sessions.set"));

  invalidate = Effect.suspend(() => Ref.set(this.ref, RequestSession.Unset())).pipe(
    Effect.withSpan("Sessions.invalidate"),
  );

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
    Effect.withSpan("Sessions.authenticated"),
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
    Effect.withSpan("Sessions.guest"),
  );
}
