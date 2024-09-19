import { describe, expect, it } from "@effect/vitest";
import { Either, Phantom, S } from "@chuz/prelude";

type Value = Phantom<string, string, "Value">;

describe("Phantom schema", () => {
  it("decodes a string into a Phantom", () => {
    const PhantomSchema = Phantom.schema<Value>(S.String);
    const value = Phantom.make<Value>()("test");
    const Optional = S.Struct({ value: S.optional(PhantomSchema) });
    const OptionalWithDefault = S.Struct({
      value: S.optional(PhantomSchema).pipe(S.withDecodingDefault(() => value)),
    });

    const result = S.decode(PhantomSchema)("test");
    const result2 = S.decode(OptionalWithDefault)({ value: "test" });
    const result3 = S.decode(OptionalWithDefault)({});
    const result4 = S.decode(Optional)({});
    const result5 = S.decode(Optional)({ value: "test" });

    expect(result).toEqual(Either.right(value));
    expect(result2).toEqual(Either.right({ value }));
    expect(result3).toEqual(Either.right({ value }));
    expect(result4).toEqual(Either.right({}));
    expect(result5).toEqual(Either.right({ value }));
  });

  it("encodes a Phantom into a string", () => {
    const PhantomSchema = Phantom.schema<Value>(S.String);
    const value = Phantom.make<Value>()("test");
    const Optional = S.Struct({ value: S.optional(PhantomSchema) });
    const OptionalWithDefault = S.Struct({
      value: S.optional(PhantomSchema).pipe(S.withDecodingDefault(() => value)),
    });

    const result = S.encode(PhantomSchema)(value);
    const result2 = S.encode(OptionalWithDefault)({ value });
    const result3 = S.encode(Optional)({});
    const result4 = S.encode(Optional)({ value });

    expect(result).toEqual(Either.right("test"));
    expect(result2).toEqual(Either.right({ value: "test" }));
    expect(result3).toEqual(Either.right({}));
    expect(result4).toEqual(Either.right({ value: "test" }));
  });
});
