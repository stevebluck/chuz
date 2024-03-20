import { Identified, Password } from "@chuz/domain";
import * as Core from "core/index";
import { Clock, Context, Effect, Layer } from "effect";
import { Auth } from "./Auth";
import { Database } from "./Database";
import { LayerUtils } from "./LayerUtils";

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
      const config = yield* _(SupabaseUsersConfig);
      const db = yield* _(Database);
      const client = yield* _(Auth);

      return yield* _(Core.SupabaseUsers.make(config, client, db));
    }),
  ).pipe(Layer.provide(Database.live), Layer.provide(Auth.live));
}

export class SupabaseUsersConfig extends Context.Tag("@app/SupabaseUsersConfig")<
  SupabaseUsersConfig,
  { callbackUrl: string }
>() {
  static layer = LayerUtils.config(this);
}
