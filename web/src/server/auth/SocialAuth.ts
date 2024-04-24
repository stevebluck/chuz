import { Effect, Layer, Match } from "@chuz/prelude";
import { ProviderCode, ProviderState, SocialAuths } from "./Auth";
import { GoogleAuth } from "./GoogleAuth";

const providers = Layer.mergeAll(GoogleAuth.layer);

// TODO: this is a step too far
// remove and use each one where needed
export class SocialAuth extends Effect.Tag("@app/Social")<SocialAuth, SocialAuths>() {
  static layer = Layer.effect(
    SocialAuth,
    Effect.gen(function* (_) {
      const google = yield* _(GoogleAuth);

      return SocialAuth.of({
        exchangeCodeForSession: Match.typeTags<ProviderCode>()({
          Google: google.exchangeCodeForSession,
          Apple: () => Effect.die("Apple not implemented"),
          Email: () => Effect.die("Email not implemented"),
        }),
        generateAuthUrl: Match.typeTags<ProviderState>()({
          Google: google.generateAuthUrl,
          Apple: () => Effect.die("Apple not implemented"),
          Email: () => Effect.die("Email not implemented"),
        }),
      });
    }),
  ).pipe(Layer.provide(providers));
}
