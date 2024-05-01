import { Password } from "@chuz/domain";
import { Config, Context, Data, Effect, Layer } from "@chuz/prelude";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// TODO: doesn't need to be a service

const SaltRounds = Config.number("SALT_ROUNDS").pipe(Config.withDefault(4));

const make = Effect.map(SaltRounds, (saltRounds) =>
  Passwords.of({
    hash: (password: Password.Strong) =>
      Effect.gen(function* () {
        const salt = randomBytes(16).toString("hex");
        const buf = scryptSync(password, salt, 64, { N: saltRounds });
        return Password.Hashed(`${buf.toString("hex")}.${salt}`);
      }),
    validate: (password: Password.Plaintext, hashed: Password.Hashed): Effect.Effect<void, PasswordsDoNotMatch> =>
      Effect.gen(function* () {
        const [hashedPassword, salt] = hashed.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = scryptSync(password, salt, 64, { N: saltRounds });

        return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf)
          ? Password.Hashed(hashed)
          : yield* new PasswordsDoNotMatch();
      }),
  }),
);

export class Passwords extends Context.Tag("@core/Passwords")<
  Passwords,
  {
    hash: (password: Password.Strong) => Effect.Effect<Password.Hashed>;
    validate: ValidatePassword;
  }
>() {
  static layer = Layer.effect(Passwords, make);
}

export class PasswordsDoNotMatch extends Data.TaggedError("PasswordsDoNotMatch") {}

export type ValidatePassword = (
  password: Password.Plaintext,
  hashed: Password.Hashed,
) => Effect.Effect<void, PasswordsDoNotMatch>;
