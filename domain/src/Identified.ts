import { Phantom, Uuid } from "@chuz/prelude";
import { Data, Effect, Equivalence } from "effect";

export type Id<A> = Phantom<A, string>;
export const Id = <A>(value: string): Id<A> => Phantom.make<Id<A>>()(value);

export class Identified<A> extends Data.Class<{
  value: A;
  id: Id<A>;
}> {
  static equals = Equivalence.make<Id<any>>((self, that) => self.value === that.value);

  static makeRandomId = <A>(): Effect.Effect<Id<A>> => Effect.map(Uuid.make, (uuid) => Id<A>(uuid));
}
