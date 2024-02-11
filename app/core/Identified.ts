import { Brand, Data, Effect, Equivalence } from "effect";
import { v4 as uuidv4 } from "uuid";
import { Phantom } from "~/lib/Phantom";

export type Id<A> = Phantom<A, string>;
export const Id = <A>(value: string): Id<A> => Phantom.make<Id<A>>()(value);

export interface Identified<A> {
  value: A;
  id: Id<A>;
}
export const Identified = <A>(id: Id<A>, value: A) => Data.case<Identified<A>>()({ id, value });

export const eqId: Equivalence.Equivalence<Id<any>> = Equivalence.make((a, b) => a === b);

export type UUID = string & Brand.Brand<"UUID">;
export const UUID = Brand.nominal<UUID>();

export const makeUuid: Effect.Effect<UUID> = Effect.sync(() => UUID(uuidv4()));

export const makeRandomId = <A>(): Effect.Effect<Id<A>> => Effect.sync(() => Id(uuidv4()));
