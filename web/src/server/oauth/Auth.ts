import { Credential, Email, Session, User } from "@chuz/domain";
import { Uuid } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Effect, Layer, Match } from "effect";
import { Users } from "..";
import { GoogleAuth } from "./GoogleAuth";

interface Auths {
  exchangeCodeForSession: (
    provider: Auth.ProviderCode,
  ) => Effect.Effect<Session<User>, Auth.ExchangeCodeError | Email.AlreadyInUse | Credential.NotRecognised, Users>;
  generateAuthUrl: (provider: Auth.ProviderState) => Effect.Effect<string, Auth.GenerateUrlError>;
}

const providers = Layer.mergeAll(GoogleAuth.layer);

export class Auth extends Effect.Tag("@app/OAuth")<Auth, Auths>() {
  static layer = Layer.effect(
    Auth,
    Effect.gen(function* (_) {
      const google = yield* _(GoogleAuth);

      return Auth.of({
        exchangeCodeForSession: Auth.ProviderCode.match({
          google: ({ code }) => google.exchangeCodeForSession(code),
        }),
        generateAuthUrl: Auth.ProviderState.match({ google: ({ state }) => google.generateAuthUrl(state) }),
      });
    }),
  ).pipe(Layer.provide(providers));
}

export namespace Auth {
  export type Code = S.Schema.Type<typeof Code>;
  export const Code = S.string.pipe(S.brand("AuthCode"));

  export type State = S.Schema.Type<typeof State.schema>;
  export namespace State {
    export const schema = S.UUID.pipe(S.brand("AuthState"));
    export const make = Uuid.make.pipe(Effect.map(S.decodeSync(schema)));
  }

  export type ProviderName = S.Schema.Type<typeof ProviderName>;
  export const ProviderName = S.literal("google");

  export type ProviderCode = { _tag: ProviderName; code: Code };
  export namespace ProviderCode {
    export const { google } = Data.taggedEnum<ProviderCode>();
    export const match = Match.typeTags<ProviderCode>();
  }

  export type ProviderState = { _tag: ProviderName; state: State };
  export namespace ProviderState {
    export const match = Match.typeTags<ProviderState>();
  }

  export class ExchangeCodeError extends Data.TaggedError("ExchangeCodeError")<{ error: unknown }> {}

  export class GenerateUrlError extends Data.TaggedError("GenerateUrlError")<{ error: unknown }> {}
}
