import { describe, expect, test } from "@effect/vitest";
import { Brand, Either, Refined, S } from "@chuz/prelude";

type Int = Brand.Branded<number, "Int">;
const Int = Refined<Int>("Int", S.Int);

type PositiveInt = Brand.Branded<Int, "Positive">;
const PositiveInt = Int.map<PositiveInt>("Positive", (_) => _.pipe(S.greaterThan(0)));

type LessThan1000Int = Brand.Branded<PositiveInt, "LessThan1000">;
const LessThan1000Int = PositiveInt.map<LessThan1000Int>("LessThan1000", (_) => _.pipe(S.lessThanOrEqualTo(1000)));

describe("Refined", () => {
  test("refinements can be constructred from brands", () => {
    expect(Int.from(1)).toEqual(Either.right(1));
    expect(Int.from(1.489)).toEqual(Either.left(expect.anything()));

    expect(Int.unsafeFrom(2)).toBe(2);
    expect(() => Int.unsafeFrom(1.489)).toThrow();

    expect(Int.is(2)).toBe(true);
    expect(Int.is(1.489)).toBe(false);
  });

  test("refinements can be constructed from existing refinment", () => {
    expect(PositiveInt.from(1)).toEqual(Either.right(1));
    expect(PositiveInt.from(1.489)).toEqual(Either.left(expect.anything()));
    expect(PositiveInt.from(-1)).toEqual(Either.left(expect.anything()));

    expect(PositiveInt.unsafeFrom(2)).toBe(2);
    expect(() => PositiveInt.unsafeFrom(-2)).toThrow();
    expect(() => PositiveInt.unsafeFrom(-1.489)).toThrow();

    expect(PositiveInt.is(2)).toBe(true);
    expect(PositiveInt.is(-1)).toBe(false);

    expect(PositiveInt.is(1.489)).toBe(false);
    expect(PositiveInt.is(-1.489)).toBe(false);
  });

  test("refinements can be constructed from existing refinments", () => {
    expect(LessThan1000Int.from(1)).toEqual(Either.right(1));
    expect(LessThan1000Int.from(1.489)).toEqual(Either.left(expect.anything()));
    expect(LessThan1000Int.from(-1)).toEqual(Either.left(expect.anything()));
    expect(LessThan1000Int.from(1001)).toEqual(Either.left(expect.anything()));

    expect(LessThan1000Int.unsafeFrom(2)).toBe(2);
    expect(() => LessThan1000Int.unsafeFrom(-2)).toThrow();
    expect(() => LessThan1000Int.unsafeFrom(-1.489)).toThrow();
    expect(() => LessThan1000Int.unsafeFrom(1001)).toThrow();

    expect(LessThan1000Int.is(2)).toBe(true);
    expect(LessThan1000Int.is(-1)).toBe(false);

    expect(LessThan1000Int.is(1.489)).toBe(false);
    expect(LessThan1000Int.is(-1.489)).toBe(false);

    expect(LessThan1000Int.is(1001)).toBe(false);
    expect(LessThan1000Int.is(1000)).toBe(true);
  });

  test("refinements can be used as schemes", () => {
    const schema = S.compose(S.NumberFromString, PositiveInt);

    expect(S.decodeEither(schema)("1")).toEqual(Either.right(1));
    expect(S.decodeEither(schema)("1.489")).toEqual(Either.left(expect.anything()));
    expect(S.decodeEither(schema)("-1")).toEqual(Either.left(expect.anything()));
  });
});
