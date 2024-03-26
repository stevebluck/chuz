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
        Effect.gen(function* (_) {
          const hashes = yield* _(Effect.all(Array.from({ length: 5 }, () => password).map(hash)));
          expect(new Set(hashes).size).toBe(hashes.length);
        }),
      );

      asyncProperty("Passwords only match against their hashes", Arbs.Passwords.Strong, (password: Password.Strong) =>
        Effect.gen(function* (_) {
          const hashed = yield* _(hash(password));
          const matches = yield* _(match(Password.Plaintext(password), hashed));
          const doesNotMatch = yield* _(match(Password.Plaintext(`mutate-${password}`), hashed));
          expect(matches).toBe(true);
          expect(doesNotMatch).toBe(false);
        }),
      );

      test("Strong passwords must have a minimum length of 8 characters", () => {
        expect(Either.isLeft(Password.strongFrom("1234567"))).toBe(true);
        expect(Either.isRight(Password.strongFrom("12345678"))).toBe(true);
      });

      test("Strong passwords must have a maximum length of 64 characters", () => {
        expect(Either.isLeft(Password.strongFrom(Array(65).fill("a").join("")))).toBe(true);
        expect(Either.isRight(Password.strongFrom(Array(64).fill("a").join("")))).toBe(true);
      });
    });
  };
}

const config = { N: 2 };
const hash = Passwords.hasher(config);
const match = Passwords.matcher(config);
