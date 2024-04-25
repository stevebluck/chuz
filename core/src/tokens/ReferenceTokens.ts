import { Token } from "@chuz/domain";
import { HashMap, Array, Timestamp, makeUuid } from "@chuz/prelude";
import { Clock, Effect, Equivalence, Option, Ref } from "@chuz/prelude";
import { addMilliseconds, isAfter } from "date-fns";
import { Tokens } from "./Tokens";

export class ReferenceTokens<A> implements Tokens<A> {
  static create = <A>(clock: Clock.Clock, eq: Equivalence.Equivalence<A>): Effect.Effect<Tokens<A>> =>
    Ref.make(new State<A>(HashMap.empty(), eq)).pipe(Effect.map((s) => new ReferenceTokens<A>(clock, s)));

  private constructor(
    private readonly clock: Clock.Clock,
    private readonly state: Ref.Ref<State<A>>,
  ) {}

  issue = (value: A, timeToLive: Token.TimeToLive): Effect.Effect<Token.Token<A>> => {
    return Effect.gen(this, function* () {
      const uuid = yield* makeUuid;
      const token = Token.make<A>(uuid);
      const time = yield* this.clock.currentTimeMillis;
      const expiresAt = new Timestamp({ value: addMilliseconds(time, timeToLive.duration) });

      yield* Ref.update(this.state, (s) => s.issue(token, value, expiresAt));

      return token;
    });
  };

  lookup = (token: Token.Token<A>): Effect.Effect<A, Token.NoSuchToken> => {
    return this.clock.currentTimeMillis.pipe(
      Effect.map((time) => new Date(time)),
      Effect.flatMap((time) =>
        Ref.get(this.state).pipe(Effect.flatMap((s) => s.lookup(token, new Timestamp({ value: time })))),
      ),
      Effect.catchTag("NoSuchElementException", () => new Token.NoSuchToken()),
    );
  };

  findByValue = (value: A): Effect.Effect<Array<Token.Token<A>>> =>
    Ref.get(this.state).pipe(Effect.map((s) => s.findByValue(value)));

  revoke = (token: Token.Token<A>): Effect.Effect<void> => Ref.update(this.state, (s) => s.revokeMany([token]));

  revokeMany = (tokens: Array<Token.Token<A>>): Effect.Effect<void> =>
    Ref.update(this.state, (s) => s.revokeMany(tokens));

  revokeAll = (value: A): Effect.Effect<void> => this.findByValue(value).pipe(Effect.flatMap(this.revokeMany));
}

class State<A> {
  constructor(
    private readonly table: HashMap.HashMap<Token.Token<A>, [A, Timestamp]>,
    private readonly eq: Equivalence.Equivalence<A>,
  ) {}

  issue = (token: Token.Token<A>, value: A, expiresAt: Timestamp): State<A> => {
    const state = new State(HashMap.set(this.table, token, [value, expiresAt]), this.eq);

    return state;
  };

  lookup = (token: Token.Token<A>, time: Timestamp): Option.Option<A> => {
    return HashMap.get(this.table, token).pipe(
      Option.flatMap(([a, expiresAt]) => {
        return isAfter(expiresAt.value, time.value) ? Option.some([a, expiresAt] as const) : Option.none();
      }),
      Option.map(([value]) => value),
    );
  };

  revokeMany = (token: Array<Token.Token<A>>): State<A> => new State(HashMap.removeMany(this.table, token), this.eq);

  findByValue = (a: A): Array<Token.Token<A>> =>
    HashMap.filter(this.table, ([value]) => this.eq(value, a)).pipe(HashMap.keys, Array.fromIterable);
}
