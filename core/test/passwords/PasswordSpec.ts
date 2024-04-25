import { Password } from "@chuz/domain";
import { Effect, Either } from "@chuz/prelude";
import { describe, expect, test } from "vitest";
import { Passwords } from "../../src/auth/Passwords";
import { Arbs } from "../Arbs";
import { asyncProperty } from "../Property";

export namespace PasswordSpec {
  export const run = () => {
    describe("Passwords", () => {
      asyncProperty("Passwords are hashed with random salt", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* () {
          const hashes = yield* Effect.all(Array.from({ length: 5 }, () => password).map(hash));
          expect(new Set(hashes).size).toBe(hashes.length);
        }),
      );

      asyncProperty("Passwords only match against their hashes", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* () {
          const hashed = yield* hash(password);
          const matches = yield* match(Password.Plaintext(password), hashed);
          const doesNotMatch = yield* match(Password.Plaintext(`mutate-${password}`), hashed);
          expect(matches).toBe(true);
          expect(doesNotMatch).toBe(false);
        }),
      );

      test("Strong passwords must have a minimum length of 8 characters", () => {
        expect(Either.isLeft(Either.try(() => Password.Strong("1234567")))).toBe(true);
        expect(Either.isRight(Either.try(() => Password.Strong("12345678")))).toBe(true);
      });

      test("Strong passwords must have a maximum length of 64 characters", () => {
        expect(Either.isLeft(Either.try(() => Password.Strong(Array(65).fill("a").join(""))))).toBe(true);
        expect(Either.isRight(Either.try(() => Password.Strong(Array(64).fill("a").join(""))))).toBe(true);
      });
    });
  };
}

const config = { N: 2 };
const hash = Passwords.hasher(config);
const match = Passwords.matcher(config);
