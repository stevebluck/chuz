import { Credential, Email, Password, Session, User } from "@chuz/domain";
import { Context, Effect, Layer, Option } from "@chuz/prelude";
import * as Core from "../src/index";
import { Cleanup } from "./CleanUp";

interface Seed {
  session: Session<User.User>;
}

export class Seeds extends Context.Tag("Seed")<Seeds, Seed>() {
  static layer = Layer.scoped(
    Seeds,
    Effect.gen(function* () {
      const users = yield* Core.Users;
      const passwords = yield* Core.Passwords;
      const cleanup = yield* Cleanup;

      const userRegistration = {
        email: "test@whatthebluck.com" as Email,
        password: Password.Strong.make("password"),
        firstName: User.FirstName.make("Toby"),
        lastName: User.LastName.make("Lerone"),
        optInMarketing: User.OptInMarketing.make(true),
      };

      const password = yield* passwords.hash(userRegistration.password);
      const credential = Credential.Secure.EmailPassword({ email: userRegistration.email, password });

      const session = yield* users.register(
        credential,
        Option.some(userRegistration.firstName),
        Option.some(userRegistration.lastName),
        userRegistration.optInMarketing,
      );

      yield* Effect.addFinalizer(() => cleanup);

      return { session };
    }),
  );
}
