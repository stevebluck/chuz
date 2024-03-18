import { Identified, Password } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as Core from "core/index";
import { Clock, Config, ConfigError, Context, Effect, Layer } from "effect";

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

export class Passwords extends Effect.Tag("@app/Passwords")<Passwords, Core.Passwords>() {
  static config = {
    N: 4,
  };

  static dev = Layer.effect(
    Passwords,
    Effect.sync(() => {
      return Passwords.of({
        hash: Core.Passwords.hasher(this.config),
        match: Core.Passwords.matcher(this.config),
      });
    }),
  );

  static live = Layer.succeed(
    Passwords,
    Passwords.of({
      hash: (pw) => Effect.sync(() => Password.Hashed.unsafeFrom(pw)),
      match: () => Effect.succeed(true),
    }),
  );
}

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static dev = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.Reset.equals));
      const passwords = yield* _(Passwords);

      return yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens, passwords.match));
    }),
  ).pipe(Layer.provide(Passwords.dev));

  static live = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const db = yield* _(Database);
      const client = yield* _(Auth);

      return yield* _(Core.SupabaseUsers.make({ emailRedirectTo: "" }, client, db));
    }),
  ).pipe(Layer.provide(Auth.live), Layer.provide(Database.live));
}

export type App = Users | Passwords;

export namespace App {
  export const dev: Layer.Layer<App, ConfigError.ConfigError> = Layer.mergeAll(
    Users.dev,
    Passwords.dev,
    DevTools.layer(),
  );

  export const live: Layer.Layer<App, ConfigError.ConfigError> = Layer.mergeAll(
    Users.live,
    Passwords.live,
    DevTools.layer(),
  );
}
