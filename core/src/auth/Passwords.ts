import { Password } from "@chuz/domain";
import { scryptSync, randomBytes, timingSafeEqual, ScryptOptions } from "crypto";
import { Effect } from "effect";

export interface Passwords {
  hash: (password: Password.Strong) => Effect.Effect<Password.Hashed>;
  match: (password: Password.Plaintext, hashed: Password.Hashed) => Effect.Effect<boolean>;
}
export namespace Passwords {
  const defaultConfig: ScryptOptions = { N: 4 };

  export const hasher =
    (config: ScryptOptions = defaultConfig): Passwords["hash"] =>
    (password: Password.Strong): Effect.Effect<Password.Hashed> => {
      return Effect.sync(() => {
        const salt = randomBytes(16).toString("hex");
        const buf = scryptSync(password, salt, 64, config);
        return Password.Hashed.unsafeFrom(`${buf.toString("hex")}.${salt}`);
      }).pipe(Effect.withSpan("Passwords.hash"));
    };

  export const matcher =
    (config: ScryptOptions = defaultConfig): Passwords["match"] =>
    (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<boolean> =>
      Effect.sync(() => {
        const [hashedPassword, salt] = hashed.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = scryptSync(password, salt, 64, config);

        return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
      }).pipe(Effect.withSpan("Passwords.matches"));
}
