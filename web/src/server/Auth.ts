import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { Context, Effect, Layer } from "effect";
import { LayerUtils } from "./LayerUtils";

export class Auth extends Context.Tag("@app/Auth")<Auth, SupabaseClient["auth"]>() {
  static live = Layer.effect(
    Auth,
    Effect.gen(this, function* (_) {
      const config = yield* _(SupabaseConfig);
      const client = createClient(config.url, config.serviceKey, {
        auth: { flowType: "pkce", persistSession: false, debug: false },
      });

      return client.auth;
    }),
  );
}

export class SupabaseConfig extends Context.Tag("@app/SupabaseConfig")<
  SupabaseConfig,
  { url: string; serviceKey: string }
>() {
  static layer = LayerUtils.config(this);
}
