import * as Core from "@chuz/core";
import { Identified, Password } from "@chuz/domain";
import { Clock, Effect, Layer } from "@chuz/prelude";
import { Database } from "./Database";
import { HasherConfig } from "./Passwords";

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static live = Layer.effect(this, Effect.flatMap(Database, Core.RdmsUsers.make)).pipe(Layer.provide(Database.live));

  static dev = Layer.effect(
    this,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.resetEquals));
      const passwordsConfig = yield* _(HasherConfig);

      return yield* _(
        Core.ReferenceUsers.make(userTokens, passwordResetTokens, Core.Passwords.matcher(passwordsConfig)),
      );
    }),
  );
}
