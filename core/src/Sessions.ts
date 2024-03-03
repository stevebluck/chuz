import { Session, User } from "@chuz/domain";
import { Context, Data, Effect, Option } from "effect";
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

export const Sessions = Context.GenericTag<Sessions<User>>("@core/Sessions");

export class Unauthorised extends Data.TaggedError("Unauthorised") {}
