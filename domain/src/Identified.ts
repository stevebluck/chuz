import { Phantom, Uuid } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Effect, Equivalence } from "effect";
import { User } from ".";

export type Id<A> = Phantom<A, string>;
export const Id = <A>(value: string): Id<A> => Phantom.make<Id<A>>()(value);

export class Identified<A> extends Data.Class<{
  value: A;
  id: Id<A>;
}> {
  static equals = Equivalence.strict<Id<any>>();

  static makeSchema = <A, B>(schema: S.Schema<A, B>) =>
    S.struct({
      value: schema,
      id: Phantom.makeSchema<A>(),
    });

  static makeRandomId = <A>(): Effect.Effect<Id<A>> => Uuid.make.pipe(Effect.map((uuid) => Id<A>(uuid)));
}
