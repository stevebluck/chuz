import { Phantom, Uuid } from "@chuz/prelude";
import { Data, Effect, Equivalence } from "effect";

export type Id<A> = Phantom<A, string>;
export const Id = <A>(value: string): Id<A> => Phantom.make<Id<A>>()(value);

export class Identified<A> extends Data.Class<{
  value: A;
  id: Id<A>;
}> {
  static equals = Equivalence.strict<Id<any>>();

  static makeRandomId = <A>(): Effect.Effect<Id<A>> => Uuid.make.pipe(Effect.map((uuid) => Id<A>(uuid)));
}
