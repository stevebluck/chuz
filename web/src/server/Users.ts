import * as Core from "@chuz/core";
import { Password, User } from "@chuz/domain";
import { Clock, Effect, Layer } from "@chuz/prelude";
import { HasherConfig } from "./Passwords";

// TODO: move to core
export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static dev = Layer.effect(
    this,
    Effect.gen(function* () {
      const clock = Clock.make();
      const userTokens = yield* Core.ReferenceTokens.create(clock, User.eqId);
      const passwordResetTokens = yield* Core.ReferenceTokens.create(clock, Password.resetEquals);
      const passwordsConfig = yield* HasherConfig;

      return yield* Core.ReferenceUsers.make(userTokens, passwordResetTokens, Core.Passwords.matcher(passwordsConfig));
    }),
  );
}
