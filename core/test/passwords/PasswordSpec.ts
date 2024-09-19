import { describe, expect, test } from "vitest";
import { Password } from "@chuz/domain";
import { Effect, Either } from "@chuz/prelude";
import { Passwords } from "../../src";
import { Arbs } from "../Arbs";
import { Property, property } from "../Property";

export namespace PasswordSpec {
  export const run = (hash: Passwords.Hash, match: Passwords.Match, config: Property.Config) => {
    describe("Passwords", () => {
      property(
        "Passwords are hashed with random salt",
        Arbs.Password.Strong,
        (password) =>
          Effect.gen(function* () {
            const hashes = yield* Effect.all(Array.from({ length: 5 }, () => password).map(hash));
            expect(new Set(hashes).size).toBe(hashes.length);
          }),
        config,
      );

      property(
        "Passwords only validate against their hashes",
        Arbs.Password.Strong,
        (password) =>
          Effect.gen(function* () {
            const hashed = yield* hash(password);

            yield* match(Password.Plaintext.unsafeFrom(password), hashed);

            const doesNotMatch = yield* Effect.flip(match(Password.Plaintext.unsafeFrom(`mutate-${password}`), hashed));

            expect(doesNotMatch).toStrictEqual(new Passwords.DoNotMatch());
          }),
        config,
      );

      test("Strong passwords must have a minimum length of 8 characters", () => {
        expect(Either.isLeft(Either.try(() => Password.Strong.unsafeFrom("1234567")))).toBe(true);
        expect(Either.isRight(Either.try(() => Password.Strong.unsafeFrom("12345678")))).toBe(true);
      });

      test("Strong passwords must have a maximum length of 64 characters", () => {
        expect(Either.isLeft(Either.try(() => Password.Strong.unsafeFrom(Array(65).fill("a").join(""))))).toBe(true);
        expect(Either.isRight(Either.try(() => Password.Strong.unsafeFrom(Array(64).fill("a").join(""))))).toBe(true);
      });
    });
  };
}
