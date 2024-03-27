import { Credentials, User } from "@chuz/domain";
import { Uuid } from "@chuz/prelude";
import { Data, Effect, Equal, Equivalence, Layer, Match } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import { Users } from "..";
import { GoogleSocialAuth } from "./GoogleSocialAuth";

interface Auths {
  exchangeCodeForSession: (
    provider: Auth.ProviderCode,
  ) => Effect.Effect<User.Session, Auth.ExchangeCodeError | User.EmailAlreadyInUse | Credentials.NotRecognised, Users>;
  generateAuthUrl: (provider: Auth.ProviderState) => Effect.Effect<string, Auth.GenerateUrlError>;
}

const providers = Layer.mergeAll(GoogleSocialAuth.layer);

export class Auth extends Effect.Tag("@app/Auth")<Auth, Auths>() {
  static layer = Layer.effect(
    Auth,
    Effect.gen(function* (_) {
      const google = yield* _(GoogleSocialAuth);

      return Auth.of({
        exchangeCodeForSession: Auth.ProviderCode.match({ google: ({ code }) => google.exchangeCodeForSession(code) }),
        generateAuthUrl: Auth.ProviderState.match({ google: ({ state }) => google.generateAuthUrl(state) }),
      });
    }),
  ).pipe(Layer.provide(providers));
}

export namespace Auth {
  export type Code = S.Schema.Type<typeof Code>;
  export type ProviderName = S.Schema.Type<typeof ProviderName>;
  export type State = S.Schema.Type<typeof State.schema>;
  export type ProviderCode = { _tag: ProviderName; code: Code };
  export type ProviderState = { _tag: ProviderName; state: State };

  export const Code = S.string.pipe(S.brand("AuthCode"));

  export namespace State {
    export const schema = S.UUID.pipe(S.brand("AuthState"));
    export const make = Uuid.make.pipe(Effect.map(S.decodeSync(schema)));
    export class DoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}
    export const equals: Equivalence.Equivalence<S.Schema.Type<typeof schema>> = Equal.equals;
  }

  export const ProviderName = S.literal("google");

  export namespace ProviderCode {
    export const { google } = Data.taggedEnum<ProviderCode>();
    export const match = Match.typeTags<ProviderCode>();
  }

  export namespace ProviderState {
    export const match = Match.typeTags<ProviderState>();
  }

  export class ExchangeCodeError extends Data.TaggedError("ExchangeCodeError")<{ error: unknown }> {}

  export class GenerateUrlError extends Data.TaggedError("GenerateUrlError")<{ error: unknown }> {}
}
