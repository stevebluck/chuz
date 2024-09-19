import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Password } from "@chuz/domain";
import { Brand, Effect, Data } from "@chuz/prelude";

export namespace Passwords {
  export type SaltRounds = Brand.Branded<number, "SaltRounds">;
  export const SaltRounds = Brand.nominal<SaltRounds>();

  export type Hash = (password: Password.Strong) => Effect.Effect<Password.Hashed>;
  export type Match = (password: Password.Plaintext, hashed: Password.Hashed) => Effect.Effect<Password.Hashed, DoNotMatch>;

  export const hash =
    (saltRounds: SaltRounds): Hash =>
    (password: Password.Strong) =>
      Effect.gen(function* () {
        const salt = randomBytes(16).toString("hex");
        const buf = scryptSync(password, salt, 64, { N: saltRounds });
        return Password.Hashed.unsafeFrom(`${buf.toString("hex")}.${salt}`);
      });

  export const match =
    (saltRounds: SaltRounds): Match =>
    (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<Password.Hashed, DoNotMatch> =>
      Effect.gen(function* () {
        const [hashedPassword, salt] = hashed.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = scryptSync(password, salt, 64, { N: saltRounds });

        return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf) ? hashed : yield* new DoNotMatch();
      });

  const type = "Passwords";

  export class DoNotMatch extends Data.TaggedError(`${type}DoNotMatch`) {}
}
