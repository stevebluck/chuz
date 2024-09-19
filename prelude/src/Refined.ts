import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Brand, Either } from "effect";

export interface Refined<A extends Branded.Any> extends Branded.Schema<A> {
  /**
   * Create an instance of the Branded type by applying the given schema rules.
   */
  from: (i: Unbranded<A>) => Either.Either<A, ParseError>;

  /**
   * **Use at own risk, throws if the value does not pass schema rules.**
   *
   * Favour `from` unless you are certain the data conforms to the correct structure.
   */
  unsafeFrom: (i: Unbranded<A>) => A;

  /**
   * Verify a value is of the Refined type.
   */
  is: (a: unknown) => a is A;

  /**
   * Convert an existing `Refined` type to a new refinement that extends the existing `Brand`
   *
   * @param schema: Optional callback function that exposes the internal existing schema to allow for additional rules to be applied.
   *
   * @example
   *
   * type Int = Brand.Branded<number, "Int">
   * const Int = Refined<Int>("Int", S.Int)
   *
   * type PositiveInt = Brand.Branded<Int, "Positive">
   * const PositiveInt = Int.map<PositiveInt>("Positive", (_) => _.pipe(S.greaterThan(0)))
   */
  map: <B extends Branded<A, any>>(brand: Branded.NewBrand<A, B>, schema?: (internal: Branded.Schema<A>) => Branded.Schema<A>) => Refined<B>;
}

export const Refined = <A extends Branded.Any>(brand: Branded.Brand<A>, schema: Unbranded.Schema<A>): Refined<A> => {
  const internal = schema.pipe(S.brand(brand)) as Branded.SchemaClass<A>;

  return class extends internal {
    static from = S.decodeEither(internal, { errors: "all" });

    static unsafeFrom = S.decodeSync(internal);

    static is = S.is(internal);

    static map = <B extends Branded<A, any>>(brand: Branded.NewBrand<A, B>, f: (internal: Branded.Schema<A>) => Branded.Schema<A> = (a) => a): Refined<B> => {
      return Refined<B>(brand, f(internal) as Unbranded.Schema<B>);
    };
  };
};

type Branded<A, K extends string | symbol> = Brand.Branded<A, K>;

namespace Branded {
  export type Any = Branded<any, any>;

  export type Brand<B> = B extends Brand.Brand<infer A> ? A : never;

  export type NewBrand<A extends Any, B extends Any> = Exclude<Brand<B>, Brand<A>>;

  export type Schema<A extends Any> = S.Schema<A, Unbranded<A>>;

  export type SchemaClass<A extends Any> = S.SchemaClass<A, Unbranded<A>>;
}

export type Unbranded<A> = Brand.Brand.Unbranded<A>;

namespace Unbranded {
  export type Schema<A extends Branded.Any> = S.Schema<Unbranded<A>, Unbranded<A>>;
}
