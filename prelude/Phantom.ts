import { Data } from "effect";

export type URI = "Phantom";

export class Phantom<A, B> extends Data.Class<{ value: B }> {
  _A!: A;

  private constructor(public readonly value: B) {
    super({ value });
  }

  uri: URI = "Phantom";

  static make =
    <N extends Phantom<any, any>>() =>
    (value: N["value"]): N =>
      new Phantom<N["_A"], N["value"]>(value) as N;
}
