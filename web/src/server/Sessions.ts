import { Id, Session, Token, User } from "@chuz/domain";
import { Data, Effect, Layer, Match, Option, Ref, identity } from "effect";
import { RequestState } from "./RequestState/RequestState";
import { Users } from "./Users";

interface UserSession {
  get: Effect.Effect<RequestSession>;
  mint: (session: Session<User>) => Effect.Effect<void>;
  set: (session: Session<User>) => Effect.Effect<void>;
  invalidate: (session: Session<User>) => Effect.Effect<void>;
  authenticated: Effect.Effect<Session<User>, Unauthorised>;
  guest: Effect.Effect<void, Unauthorised>;
}

export class Sessions extends Effect.Tag("@app/Sessions")<Sessions, UserSession>() {
  static layer = Layer.effect(
    Sessions,
    RequestState.get("token").pipe(
      Effect.flatMap(identity),
      Effect.map((token) => Token.make<Id<User>>(token)),
      Effect.flatMap((token) => Users.identify(token)),
      Effect.map((session) => RequestSession.Provided({ session })),
      Effect.mapError(() => RequestSession.NotProvided()),
      Effect.merge,
      Effect.flatMap((rs) => Ref.make<RequestSession>(rs)),
      Effect.map((ref) =>
        Sessions.of({
          get: Effect.suspend(() => Ref.get(ref)),
          mint: (session) => Ref.set(ref, RequestSession.Set({ session })),
          set: (session) => Ref.set(ref, RequestSession.Set({ session })),
          invalidate: (session) => Effect.suspend(() => Ref.set(ref, RequestSession.Unset({ session }))),
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
            Effect.mapError(() => new Unauthorised()),
          ),
        }),
      ),
    ),
  );
}

export type RequestSession = Data.TaggedEnum<{
  NotProvided: {};
  Provided: { session: Session<User> };
  Set: { session: Session<User> };
  Unset: { session: Session<User> };
  InvalidToken: { session: Session<User> };
}>;

export namespace RequestSession {
  export const { InvalidToken, NotProvided, Provided, Set, Unset } = Data.taggedEnum<RequestSession>();
  export const match = Match.typeTags<RequestSession>();
}

export class Unauthorised extends Data.TaggedError("Unauthorised") {}
export class NoSuchSession extends Data.TaggedError("NoSuchSession") {}
