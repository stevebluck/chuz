import { Phantom, S } from "@chuz/prelude";

export type Id<A> = Phantom<A, string, "Id">;

export namespace Id {
  export const schema = <A>() => Phantom.schema<Id<A>>(S.String);

  export const make = <A>(value: string) => Phantom.make<Id<A>>()(value);
}

export interface Identified<A> {
  value: A;
  id: Id<A>;
}

export namespace Identified {
  export const schema = <A, I>(a: S.Schema<A, I>): S.Schema<Identified<A>, { value: I; id: string }> => S.Struct({ value: a, id: Id.schema<A>() });

  export const make = <A>(value: A, id: Id<A>): Identified<A> => ({ value, id });
}
