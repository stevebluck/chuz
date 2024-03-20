import { Identified, Password } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as Core from "core/index";
import { Clock, Config, Context, Effect, Layer } from "effect";
import { CookieSessionStorage } from "./CookieSessionStorage";

class Auth extends Context.Tag("@app/Auth")<Auth, SupabaseClient["auth"]>() {
  static config = Config.all({
    url: Config.string("SUPABASE_URL"),
    serviceKey: Config.string("SUPABASE_SERVICE_KEY"),
  });

  static live = Layer.effect(
    Auth,
    Effect.gen(this, function* (_) {
      const config = yield* _(this.config);
      const client = createClient(config.url, config.serviceKey, {
        auth: { flowType: "pkce", persistSession: false, debug: false },
      });

      return client.auth;
    }),
  );
}

class Database extends Context.Tag("@app/Database")<Database, Core.Database>() {
  static config = Config.all({ connectionString: Config.string("DATABASE_URL") });

  static live = Layer.scoped(
    Database,
    this.config.pipe(Effect.flatMap((config) => Core.PostgresDatabase(config.connectionString))),
  );
}

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
      const client = yield* _(Auth);

      return yield* _(Core.SupabaseUsers.make({ emailRedirectTo: "" }, client, db));
    }),
  ).pipe(Layer.provide(Database.live), Layer.provide(Auth.live));
}

export namespace App {
  export const dev = Layer.mergeAll(Users.dev, CookieSessionStorage.layer).pipe(Layer.provide(DevTools.layer()));

  export const live = Layer.mergeAll(Users.live, CookieSessionStorage.layer).pipe(Layer.provide(DevTools.layer()));
}
