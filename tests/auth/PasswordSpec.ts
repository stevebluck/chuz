import { Effect, Either } from "effect";
import { Arbs } from "tests/Arbs";
import { describe, expect, test } from "vitest";
import { Password, Passwords } from "~/core/auth/Passwords";
import { asyncProperty } from "~/lib/Property";

export namespace PasswordSpec {
  export const run = () => {
    describe("Passwords", () => {
      asyncProperty("Passwords are hashed with random salt", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* (_) {
          const hashes = yield* _(Effect.all(Array.from({ length: 5 }, () => password).map(hasher)));
          expect(new Set(hashes).size).toBe(hashes.length);
        }).pipe(Effect.runPromise),
      );

      asyncProperty("Passwords only match against their hashes", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* (_) {
          const hashed = yield* _(hasher(password));
          const matches = yield* _(Passwords.matches(Password.Strong.toPlaintext(password), hashed));
          const doesNotMatch = yield* _(Passwords.matches(Password.Plaintext.unsafeFrom(`mutate-${password}`), hashed));
          expect(matches).toBe(true);
          expect(doesNotMatch).toBe(false);
        }).pipe(Effect.runPromise),
      );

      test("Strong passwords must have a minimum length of 8 characters", () => {
        expect(Either.isLeft(Password.Strong.from("1234567"))).toBe(true);
        expect(Either.isRight(Password.Strong.from("12345678"))).toBe(true);
      });

      test("Strong passwords must have a maximum length of 64 characters", () => {
        expect(Either.isLeft(Password.Strong.from(Array(65).fill("a").join("")))).toBe(true);
        expect(Either.isRight(Password.Strong.from(Array(64).fill("a").join("")))).toBe(true);
      });
    });
  };
}

const hasher = Passwords.hasher(4);
