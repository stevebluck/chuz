/*
Future work:
 - Nested decks
 - Archive deck
 - Order decks (this will be a per person basis which raises an interesting question about subscribing to a public deck)
 - Add other deck metadata i.e. colour
*/
import * as S from "@effect/schema/Schema";
import { Brand, Context, Data, Effect } from "effect";
import { Refinement } from "~/lib/Refinement";
import { Id, Identified, User } from "..";

export class DecksTag extends Context.Tag("Decks")<DecksTag, Decks>() {}

export interface Decks {
  create: (userId: Id<User>, title: Deck.Title) => Effect.Effect<Identified<Deck>, User.NotFound>;

  findById: (id: Id<Deck>) => Effect.Effect<Identified<Deck>, Deck.NotFound>;

  findByUserId: (id: Id<User>) => Effect.Effect<Array<Identified<Deck>>>;

  update: (id: Id<Deck>, patch: Deck.Patch) => Effect.Effect<Identified<Deck>, Deck.NotFound>;

  delete: (id: Id<Deck>) => Effect.Effect<void>;
}

export interface Deck {
  userId: Id<User>;
  title: Deck.Title;
}

export namespace Deck {
  export const make = (userId: Id<User>, title: Title): Deck => ({
    userId,
    title,
  });

  export type Title = string & Brand.Brand<"Title">;
  const TitleBrand = Brand.nominal<Title>();
  export namespace Title {
    export const schema = S.Trim.pipe(S.minLength(1), S.maxLength(250), S.fromBrand(TitleBrand));
    export const { from, is, unsafeFrom } = Refinement(schema);
  }

  export type Patch = Partial<Omit<Deck, "userId">>;

  export const patch = (deck: Deck, patch: Patch): Deck => ({ ...deck, ...patch });

  export class NotFound extends Data.TaggedError("DeckNotFound") {}
}
