import { Effect } from "effect";
import * as fc from "fast-check";
import { Arbs } from "tests/Arbs";
import { describe, expect } from "vitest";
import { Deck, Id } from "~/core";
import { asyncProperty } from "~/lib/Property";
import { SeededTestBench } from "../TestBench";

export namespace DecksSpec {
  export const run = (testBenchSeeded: Effect.Effect<SeededTestBench>): void => {
    describe("Projects", () => {
      asyncProperty("`create` -> `findById`", Arbs.Decks.Create, ({ title }) =>
        Effect.gen(function* (_) {
          const { decks, seed } = yield* _(testBenchSeeded);

          const notFoundById = yield* _(decks.findById(Id("blah")).pipe(Effect.flip));
          expect(notFoundById).toEqual(new Deck.NotFound());

          const created = yield* _(decks.create(seed.session.user.id, title));
          const found = yield* _(decks.findById(created.id));

          expect(created).toEqual(found);
        }).pipe(Effect.runPromise),
      );

      asyncProperty("`create` -> `findByUserId`", Arbs.Decks.Create, ({ title }) =>
        Effect.gen(function* (_) {
          const { decks, seed } = yield* _(testBenchSeeded);

          const user1 = seed.session.user.id;

          const created1 = yield* _(decks.create(user1, title));
          const created2 = yield* _(decks.create(user1, title));

          const foundUserId1 = yield* _(decks.findByUserId(user1));

          expect(foundUserId1).containSubset([created1, created2]);
        }).pipe(Effect.runPromise),
      );

      asyncProperty(
        "`create` -> `update` -> `findByid` / `findByUserId`",
        fc.record({ title: Arbs.Decks.Title, updatedTitle: Arbs.Decks.Title }),
        ({ title, updatedTitle }) =>
          Effect.gen(function* (_) {
            const { decks, seed } = yield* _(testBenchSeeded);
            const user = seed.session.user.id;

            const created = yield* _(decks.create(user, title));
            const found = yield* _(decks.findById(created.id));
            expect(created).toEqual(found);

            yield* _(decks.update(created.id, { title: updatedTitle }));
            const found1 = yield* _(decks.findById(created.id));
            expect(found1.value.title).toEqual(updatedTitle);

            const [found2] = yield* _(decks.findByUserId(user));
            expect(found2.value.title).toEqual(updatedTitle);
          }).pipe(Effect.runPromise),
      );

      asyncProperty("`create` -> `delete` -> `findByid` / `findByUserId`", Arbs.Decks.Create, ({ title }) =>
        Effect.gen(function* (_) {
          const { decks, seed } = yield* _(testBenchSeeded);
          const user = seed.session.user.id;

          const created = yield* _(decks.create(user, title));
          const found = yield* _(decks.findById(created.id));
          expect(created).toEqual(found);

          yield* _(decks.delete(created.id));

          const notFound = yield* _(decks.findById(created.id).pipe(Effect.flip));
          expect(notFound).toEqual(new Deck.NotFound());

          const found2 = yield* _(decks.findByUserId(user));
          expect(found2.length).toEqual(0);
        }).pipe(Effect.runPromise),
      );
    });
  };
}
