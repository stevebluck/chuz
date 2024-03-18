import { Identified, Password } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { createClient, SupabaseClient as SbClient } from "@supabase/supabase-js";
import * as Core from "core/index";
import { Database } from "core/schema.gen";
import { Clock, Context, Effect, Layer } from "effect";

class SupabaseClient extends Context.Tag("@app/SupabaseClient")<SupabaseClient, SbClient<Database>>() {
  static layer = Layer.effect(
    SupabaseClient,
    Effect.sync(() =>
      createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
        auth: { flowType: "pkce", persistSession: false, debug: false },
      }),
    ),
  );
}

export class Users extends Effect.Tag("@app/Users")<Users, Core.Users>() {
  static Dev = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(Core.ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(Core.ReferenceTokens.create(clock, Password.Reset.equals));

      return yield* _(Core.ReferenceUsers.make(userTokens, passwordResetTokens));
    }),
  );

  static Live = Layer.effect(
    Users,
    Effect.gen(function* (_) {
      const client = yield* _(SupabaseClient);

      return yield* _(Core.SupabaseUsers.make({ emailRedirectTo: "" }, client));
    }),
  ).pipe(Layer.provide(SupabaseClient.layer));
}

export namespace App {
  export const Dev = Layer.mergeAll(Users.Dev, DevTools.layer());
  export const Live = Layer.mergeAll(Users.Live, DevTools.layer());
}
