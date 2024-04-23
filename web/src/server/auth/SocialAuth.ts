import { Effect, Layer, Match } from "@chuz/prelude";
import { ProviderCode, ProviderState, SocialAuths } from "./Auth";
import { GoogleAuth } from "./GoogleAuth";

const providers = Layer.mergeAll(GoogleAuth.layer);

export class SocialAuth extends Effect.Tag("@app/Social")<SocialAuth, SocialAuths>() {
  static layer = Layer.effect(
    SocialAuth,
    Effect.gen(function* (_) {
      const google = yield* _(GoogleAuth);

      return SocialAuth.of({
        exchangeCodeForSession: Match.typeTags<ProviderCode>()({
          google: google.exchangeCodeForSession,
          apple: () => Effect.die("Apple not implemented"),
          email: () => Effect.die("Email not implemented"),
        }),
        generateAuthUrl: Match.typeTags<ProviderState>()({
          google: google.generateAuthUrl,
          apple: () => Effect.die("Apple not implemented"),
          email: () => Effect.die("Email not implemented"),
        }),
      });
    }),
  ).pipe(Layer.provide(providers));
}
