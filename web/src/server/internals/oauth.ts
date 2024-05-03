import { Credential } from "@chuz/domain";
import { Brand, Data, Effect, Either, Equal, PR, S, makeUuid } from "@chuz/prelude";

export type Intent = (typeof Intent)[keyof typeof Intent];
export type Code = S.Schema.Type<typeof Code>;
export type Provider = "Google" | "Apple";
export type ProviderUrl = Brand.Branded<string, "ProviderUrl">;

export const Intent = {
  Login: "login",
  Register: "register",
} as const;

export const ProviderUrl = S.String.pipe(S.brand("ProviderUrl"));

export const Code = S.String.pipe(S.brand("Auth.Code"));

export class InvalidCode extends Data.TaggedError("InvalidCode")<{ error: unknown }> {}

export class InvalidState extends Data.TaggedError("InvalidState")<{ error: PR.ParseError | string }> {}

export class GenerateUrlFailure extends Data.TaggedError("GenerateUrlFailure")<{ error: unknown }> {}

export class State extends S.Class<State>("State")({
  provider: S.Literal(Credential.Tag.Google, Credential.Tag.Apple),
  intent: S.Literal(Intent.Login, Intent.Register),
  value: S.UUID.pipe(S.brand("State")),
}) {
  static make = (provider: Provider, intent: Intent) =>
    makeUuid.pipe(Effect.map((value) => new State({ provider, value: State.fields.value(value), intent })));

  static login = (provider: Provider) => this.make(provider, Intent.Login);

  static register = (provider: Provider) => this.make(provider, Intent.Register);

  static toString = (state: State) => toString(state).pipe(Either.mapLeft((error) => new InvalidState({ error })));

  static compare = (stateString: string, state: State): Either.Either<State, InvalidState> =>
    fromString(stateString).pipe(
      Either.filterOrLeft(Equal.equals(state), () => "auth states are not equal"),
      Either.mapLeft((error) => new InvalidState({ error })),
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
