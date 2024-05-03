import { Phantom } from "@chuz/prelude";
import { Data } from "@chuz/prelude";

export type Id<A> = Phantom<A, string>;
export const Id = <A>(value: string): Id<A> => Phantom.make<Id<A>>()(value);

export class Identified<A> extends Data.Class<{
  value: A;
  id: Id<A>;
}> {}
