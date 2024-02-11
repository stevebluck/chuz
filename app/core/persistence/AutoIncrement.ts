import { Id } from "../Identified";

export class AutoIncrement<A> {
  static empty = <A>() => new AutoIncrement<A>(0);

  private constructor(private readonly nextId: number) {}

  next = (): [Id<A>, AutoIncrement<A>] => {
    const id = Id<A>(this.nextId.toString());
    return [id, new AutoIncrement<A>(this.nextId + 1)];
  };
}
