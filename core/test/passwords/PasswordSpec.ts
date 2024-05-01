import { Password } from "@chuz/domain";
import { Effect, Either } from "@chuz/prelude";
import { describe, expect, test } from "vitest";
import { Passwords, PasswordsDoNotMatch } from "../../src";
import { Arbs } from "../Arbs";
import { asyncProperty } from "../Property";

export namespace PasswordSpec {
  export const run = () => {
    describe("Passwords", () => {
      asyncProperty("Passwords are hashed with random salt", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* () {
          const passwords = yield* Passwords;
          const hashes = yield* Effect.all(Array.from({ length: 5 }, () => password).map(passwords.hash));
          expect(new Set(hashes).size).toBe(hashes.length);
        }).pipe(Effect.provide(Passwords.layer)),
      );

      asyncProperty(
        "Passwords only validate against their hashes",
        Arbs.Passwords.Strong,
        (password: Password.Strong) =>
          Effect.gen(function* () {
            const passwords = yield* Passwords;
            const hashed = yield* passwords.hash(password);

            yield* passwords.validate(Password.Plaintext(password), hashed);

            const doesNotMatch = yield* Effect.flip(
              passwords.validate(Password.Plaintext(`mutate-${password}`), hashed),
            );

            expect(doesNotMatch).toStrictEqual(new PasswordsDoNotMatch());
          }).pipe(Effect.provide(Passwords.layer)),
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
