import * as Core from "@chuz/core";
import { Password, User } from "@chuz/domain";
import { Clock, Effect, Layer } from "@chuz/prelude";
import { HasherConfig } from "./Passwords";

// TODO: move to core
export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static dev = Layer.effect(
    this,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, User.eqId));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.resetEquals));
      const passwordsConfig = yield* _(HasherConfig);

      return yield* _(
        Core.ReferenceUsers.make(userTokens, passwordResetTokens, Core.Passwords.matcher(passwordsConfig)),
      );
    }),
  );
}
