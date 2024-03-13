import { Identified, Password } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import * as Core from "core/index";
import { Clock, Effect, Layer } from "effect";

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static Dev = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.Reset.equals));

      const users = yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens));

      yield* _(Effect.logInfo("Constructing users"));

      return users;
    }),
  );
}

export namespace App {
  export const Dev = Layer.mergeAll(Users.Dev, DevTools.layer());
}
