import { Password } from "@chuz/domain";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { Effect } from "effect";

export namespace Passwords {
  export const hash = (password: Password.Strong): Effect.Effect<Password.Hashed> => {
    return Effect.sync(() => {
      const salt = randomBytes(4).toString("hex");
      // TODO: use a more secure algorithm
      const buf = scryptSync(password, salt, 4, { N: 4 });
      return Password.Hashed.unsafeFrom(`${buf.toString("hex")}.${salt}`);
    }).pipe(Effect.withSpan("Passwords.hash"));
  };

  export const matches = (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<boolean> =>
    Effect.sync(() => {
      const [hashedPassword, salt] = hashed.split(".");
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = scryptSync(password, salt, 4, { N: 4 });

      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    }).pipe(Effect.withSpan("Passwords.matches"));
}
