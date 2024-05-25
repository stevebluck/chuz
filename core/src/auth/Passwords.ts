import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { Password } from "@chuz/domain";
import { Config, Context, Data, Effect, Layer } from "@chuz/prelude";

const SaltRounds = Config.number("SALT_ROUNDS").pipe(Config.withDefault(4));

const make = Effect.map(SaltRounds, (saltRounds) => {
  return Passwords.of({
    hash: (password: Password.Strong) =>
      Effect.gen(function* () {
        const salt = randomBytes(16).toString("hex");
        const buf = scryptSync(password, salt, 64, { N: saltRounds });
        return Password.Hashed.make(`${buf.toString("hex")}.${salt}`);
      }),
    validate: (
      password: Password.Plaintext,
      hashed: Password.Hashed,
    ): Effect.Effect<Password.Hashed, PasswordsDoNotMatch> =>
      Effect.gen(function* () {
        const [hashedPassword, salt] = hashed.split(".");
        const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
        const suppliedPasswordBuf = scryptSync(password, salt, 64, { N: saltRounds });

        return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf) ? hashed : yield* new PasswordsDoNotMatch();
      }),
  });
});

export class Passwords extends Context.Tag("@core/Passwords")<
  Passwords,
  {
    hash: (password: Password.Strong) => Effect.Effect<Password.Hashed>;
    validate: (
      password: Password.Plaintext,
      hashed: Password.Hashed,
    ) => Effect.Effect<Password.Hashed, PasswordsDoNotMatch>;
  }
>() {
  static layer = Layer.effect(Passwords, make);
}

export class PasswordsDoNotMatch extends Data.TaggedError("PasswordsDoNotMatch") {}
