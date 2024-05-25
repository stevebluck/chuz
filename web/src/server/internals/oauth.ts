import { Credential } from "@chuz/domain";
import { Data, Effect, Either, Equal, PR, S, makeUuid } from "@chuz/prelude";

export type Intent = (typeof Intent)[keyof typeof Intent];
export type Provider = "Google" | "Apple";
export type Code = typeof Code.Type;
export type ProviderUrl = typeof ProviderUrl.Type;

export const Intent = {
  Login: "login",
  Register: "register",
} as const;

export const ProviderUrl = S.String.pipe(S.brand("ProviderUrl"));

export const Code = S.String.pipe(S.brand("Auth.Code"));

export class InvalidCode extends Data.TaggedError("InvalidCode")<{ error: unknown }> {}

export interface InvalidState {
  _tag: "InvalidState";
  error: string;
}
export const InvalidState = Data.tagged<InvalidState>("InvalidState");

export interface GenerateUrlFailure {
  _tag: "GenerateUrlFailure";
  provider: Provider;
}
export const GenerateUrlFailure = Data.tagged<GenerateUrlFailure>("GenerateUrlFailure");

export class State extends S.Class<State>("State")({
  provider: S.Literal(Credential.Tag.Google, Credential.Tag.Apple),
  intent: S.Literal(Intent.Login, Intent.Register),
  value: S.UUID.pipe(S.brand("State")),
}) {
  static make = (provider: Provider, intent: Intent) =>
    makeUuid.pipe(Effect.map((value) => new State({ provider, value: State.fields.value.make(value), intent })));

  static login = (provider: Provider) => this.make(provider, Intent.Login);

  static register = (provider: Provider) => this.make(provider, Intent.Register);

  static toString = (state: State) =>
    toString(state).pipe(Either.mapLeft(() => InvalidState({ error: "auth state could not be converted to string" })));

  static compare = (stateString: string, state: State): Either.Either<State, InvalidState> =>
    fromString(stateString).pipe(
      Either.mapLeft(() => InvalidState({ error: "auth state malformed" })),
      Either.filterOrLeft(Equal.equals(state), () => InvalidState({ error: "auth states are not equal" })),
    );
}

export const StateFromString = S.transformOrFail(S.String, State, {
  encode: (state) => PR.succeed([state.intent, state.value, state.provider].join("+")),
  decode: (str) => {
    const arr = str.split("+");
    return S.decodeUnknown(State)({ intent: arr[0], value: arr[1], provider: arr[2] }).pipe(
      Effect.mapError((e) => new PR.Type(S.String.ast, str, "invalid auth state string")),
    );
  },
});

const fromString = S.decodeEither(StateFromString);

const toString = S.encodeEither(StateFromString);
