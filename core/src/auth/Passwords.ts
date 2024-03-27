import { Password } from "@chuz/domain";
import { scryptSync, randomBytes, timingSafeEqual, ScryptOptions } from "crypto";
import { Effect } from "effect";

export namespace Passwords {
  export type Hash = (password: Password.Strong) => Effect.Effect<Password.Hashed>;
  export const hasher =
    (config: ScryptOptions): Hash =>
    (password) => {
      return Effect.sync(() => {
        const salt = randomBytes(16).toString("hex");
        const buf = scryptSync(password, salt, 64, config);
        return Password.Hashed(`${buf.toString("hex")}.${salt}`);
      });
    };

  export type Match = (password: Password.Plaintext, hashed: Password.Hashed) => Effect.Effect<boolean>;
  export const matcher =
    (config: ScryptOptions): Match =>
    (password, hashed) =>
      Effect.sync(() => {
        const [hashedPassword, salt] = hashed.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = scryptSync(password, salt, 64, config);

        return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
      });
}
