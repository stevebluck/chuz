import { Identified, Password } from "@chuz/domain";
import * as Core from "core/index";
import { Clock, Effect, Layer } from "effect";
import { Database } from "./Database";

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static dev = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.Reset.equals));

      return yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens));
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
