import * as S from "@effect/schema/Schema";
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

export const PhantomSchema = <A, B>(_A: S.Schema<A>, value: S.Schema<B>): S.Schema<Phantom<A, B>> =>
  S.data(S.struct({ _A, uri: S.literal("Phantom"), value }));
