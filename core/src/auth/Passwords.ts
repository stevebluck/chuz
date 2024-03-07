import { Password } from "@chuz/domain";
import * as bcrypt from "bcryptjs";
import { Effect } from "effect";

export namespace Passwords {
  export const hash = (password: Password.Strong): Effect.Effect<Password.Hashed> =>
    Effect.promise(() => bcrypt.hash(password, 4)).pipe(Effect.map(Password.Hashed.unsafeFrom));

  export const matches = (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<boolean> =>
    Effect.promise(() => bcrypt.compare(password, hashed));
}
