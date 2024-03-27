import * as Core from "@chuz/core";
import { Identified, Password } from "@chuz/domain";
import { Clock, Effect, Layer } from "effect";
import { Database } from "./Database";
import { HashConfig } from "./Passwords";

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static dev = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.resetEquals));
      const passwordsConfig = yield* _(HashConfig);

      return yield* _(
        Core.ReferenceUsers.make(userTokens, passwordResetTokens, Core.Passwords.matcher(passwordsConfig)),
      );
    }),
  );

  static live = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const db = yield* _(Database);

      return yield* _(Core.RdmsUsers.make(db));
    }),
  ).pipe(Layer.provide(Database.live));
}
