import { Effect, Layer, Match } from "effect";
import { ProviderCode, ProviderState, SocialAuths } from "./Auth";
import { GoogleAuth } from "./GoogleAuth";

const providers = Layer.mergeAll(GoogleAuth.layer);

export class SocialAuth extends Effect.Tag("@app/Social")<SocialAuth, SocialAuths>() {
  static layer = Layer.effect(
    SocialAuth,
    Effect.gen(function* (_) {
      const google = yield* _(GoogleAuth);

      const matchProviderCode = Match.typeTags<ProviderCode>()({
        google: google.exchangeCodeForSession,
      });

      const matchProviderState = Match.typeTags<ProviderState>()({
        google: google.generateAuthUrl,
      });

      return SocialAuth.of({
        exchangeCodeForSession: (provider) => matchProviderCode(provider).pipe(Effect.tapErrorCause(Effect.logError)),
        generateAuthUrl: (state) => matchProviderState(state).pipe(Effect.tapErrorCause(Effect.logError)),
      });
    }),
  ).pipe(Layer.provide(providers));
}
