import { addMilliseconds, isAfter } from "date-fns";
import { Clock, Effect, Equivalence, Option, Ref } from "effect";
import { Timestamp } from "../Clock";
import { makeUuid } from "../Identified";
import { Table } from "../persistence/Table";
import { NoSuchToken, TimeToLive, Token, Tokens } from "./Tokens";

export class ReferenceTokens<A> implements Tokens<A> {
  static create = <A>(clock: Clock.Clock, eq: Equivalence.Equivalence<A>): Effect.Effect<Tokens<A>> =>
    Ref.make(new State<A>(Table.empty(), eq)).pipe(Effect.map((s) => new ReferenceTokens<A>(clock, s)));

  private constructor(
    private readonly clock: Clock.Clock,
    private readonly state: Ref.Ref<State<A>>,
  ) {}

  issue = (value: A, timeToLive: TimeToLive): Effect.Effect<Token<A>> => {
    const { clock, state } = this;
    return Effect.gen(this, function* (_) {
      const uuid = yield* _(makeUuid);
      const token = Token<A>(uuid.toString());
      const time = yield* _(clock.currentTimeMillis);
      const expiresAt = Timestamp(addMilliseconds(time, timeToLive.duration));

      yield* _(Ref.update(state, (s) => s.issue(token, value, expiresAt)));

      return token;
    });
  };

  lookup = (token: Token<A>): Effect.Effect<A, NoSuchToken> => {
    return this.clock.currentTimeMillis.pipe(
      Effect.map((time) => new Date(time)),
      Effect.flatMap((time) => Ref.get(this.state).pipe(Effect.flatMap((s) => s.lookup(token, Timestamp(time))))),
      Effect.catchTag("NoSuchElementException", () => new NoSuchToken()),
    );
  };

  findByValue = (value: A): Effect.Effect<Array<Token<A>>> =>
    Ref.get(this.state).pipe(Effect.map((s) => s.findByValue(value)));

  revoke = (token: Token<A>): Effect.Effect<void> => Ref.update(this.state, (s) => s.revokeMany([token]));

  revokeMany = (tokens: Array<Token<A>>): Effect.Effect<void> => Ref.update(this.state, (s) => s.revokeMany(tokens));

  revokeAll = (value: A): Effect.Effect<void> => this.findByValue(value).pipe(Effect.flatMap(this.revokeMany));
}

class State<A> {
  constructor(
    private readonly table: Table<Token<A>, [A, Timestamp]>,
    private readonly eq: Equivalence.Equivalence<A>,
  ) {}

  issue = (token: Token<A>, value: A, expiresAt: Timestamp): State<A> => {
    const state = new State(this.table.upsertAt(token, [value, expiresAt]), this.eq);

    return state;
  };

  lookup = (token: Token<A>, time: Timestamp): Option.Option<A> => {
    return this.table.find(token).pipe(
      Option.flatMap(([a, expiresAt]) => {
        return isAfter(expiresAt.value, time.value) ? Option.some([a, expiresAt] as const) : Option.none();
      }),
      Option.map(([value]) => value),
    );
  };

  revokeMany = (token: Array<Token<A>>): State<A> => new State(this.table.deleteMany(token), this.eq);

  findByValue = (a: A): Array<Token<A>> =>
    this.table.filterEntries((_, [value]) => this.eq(value, a)).map(([token]) => token);
}
