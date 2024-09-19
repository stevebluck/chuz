import { ParseResult } from "@effect/schema";
import * as S from "@effect/schema/Schema";
import { Data, Equal } from "effect";

export class Phantom<A, B, N = unknown> extends Data.Class<{ value: B }> {
  _A!: A;

  _N!: N;

  private constructor(public readonly value: B) {
    super({ value });
  }

  equals(that: Phantom<A, B, N>): boolean {
    return Equal.equals(this, that);
  }

  static make =
    <N extends Phantom<any, any, any>>() =>
    (value: N["value"]): N =>
      new Phantom<N["_A"], N["value"], N["_N"]>(value) as N;

  static schema = <P extends Phantom<any, any, any>, I = P["value"], R = never>(item: S.Schema<P["value"], I, R>): S.Schema<P, I, R> =>
    S.declare(
      [item],
      {
        decode: (item) => (input, parseOptions) => {
          if (input instanceof Phantom) {
            return ParseResult.decodeUnknown(item, parseOptions)(input.value).pipe(ParseResult.map(Phantom.make<P>()));
          }

          return ParseResult.decodeUnknown(item, parseOptions)(input).pipe(ParseResult.map(Phantom.make<P>()));
        },
        encode: (item) => (input, parseOptions, ast) => {
          if (input instanceof Phantom) {
            return ParseResult.encodeUnknown(item)(input.value, parseOptions);
          }
          return ParseResult.encodeUnknown(item)(input, parseOptions);
        },
      },
      {
        description: `Phantom<${S.format(item)}>`,
      },
    ).annotations({
      arbitrary: () => (fc) => fc.string({ minLength: 1 }).map(Phantom.make<P>()),
    });
}
