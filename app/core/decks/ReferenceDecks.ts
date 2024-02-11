import { Effect, Either, Option, Ref, identity } from "effect";
import { Id, Identified, User, Users, eqId, makeRandomId } from "..";
import { Table } from "../persistence/Table";
import { Decks, Deck } from "./Decks";

export class ReferenceDecks implements Decks {
  static create = (users: Users): Effect.Effect<Decks> => {
    return Ref.make(new State(Table.empty())).pipe(Effect.map((ref) => new ReferenceDecks(ref, users)));
  };

  private constructor(
    private readonly state: Ref.Ref<State>,
    private readonly users: Users,
  ) {}

  create = (userId: Id<User>, title: Deck.Title): Effect.Effect<Identified<Deck>, User.NotFound> => {
    return Effect.all({
      id: makeRandomId<Deck>(),
      user: this.users.findById(userId),
    }).pipe(Effect.flatMap(({ id }) => this.state.modify((s) => s.create(id, userId, title))));
  };

  findById = (id: Id<Deck>): Effect.Effect<Identified<Deck>, Deck.NotFound> => {
    return Ref.get(this.state).pipe(
      Effect.flatMap((s) => s.findById(id)),
      Effect.mapError(() => new Deck.NotFound()),
    );
  };

  findByUserId = (id: Id<User>): Effect.Effect<Identified<Deck>[]> => {
    return Ref.get(this.state).pipe(Effect.map((s) => s.findByUserId(id)));
  };

  update = (id: Id<Deck>, patch: Deck.Patch): Effect.Effect<Identified<Deck>, Deck.NotFound> => {
    return Ref.modify(this.state, (s) => s.update(id, patch)).pipe(Effect.flatMap(identity));
  };

  delete = (id: Id<Deck>): Effect.Effect<void> => {
    return Ref.update(this.state, (s) => s.delete(id));
  };
}

class State {
  constructor(private readonly byId: Table<Id<Deck>, Identified<Deck>>) {}

  create = (id: Id<Deck>, userId: Id<User>, title: Deck.Title): [Identified<Deck>, State] => {
    const deck = Identified(id, Deck.make(userId, title));
    const byId = this.byId.upsertAt(id, deck);

    return [deck, new State(byId)];
  };

  findById = (id: Id<Deck>): Option.Option<Identified<Deck>> => {
    return this.byId.find(id);
  };

  findByUserId = (id: Id<User>): Identified<Deck>[] => {
    return this.byId.filterValues((p) => eqId(p.value.userId, id));
  };

  update = (id: Id<Deck>, patch: Deck.Patch): [Either.Either<Deck.NotFound, Identified<Deck>>, State] => {
    return this.findById(id).pipe(
      Option.match({
        onNone: () => [Either.left(new Deck.NotFound()), this],
        onSome: (deck) => {
          const updated = Identified(id, Deck.patch(deck.value, patch));
          const byId = this.byId.upsertAt(id, updated);
          return [Either.right(updated), new State(byId)];
        },
      }),
    );
  };

  delete = (id: Id<Deck>): State => {
    return new State(this.byId.deleteAt(id));
  };
}
