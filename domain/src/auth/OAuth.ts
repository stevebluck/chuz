import { Brand, Effect, Either, Equal, PR, S, makeUuid } from "@chuz/prelude";
import { StateDoesNotMatch } from "../../../core/src/users/Errors";

export type Code = S.Schema.Type<typeof Code>;
export type ValidatedState = State & Brand.Brand<"ValidatedState">;
export type Intent = S.Schema.Type<typeof State.fields.intent>;
export type Provider = S.Schema.Type<typeof State.fields.provider>;
export type ProviderUrl = S.Schema.Type<typeof ProviderUrl>;

export const Provider = {
  google: "google",
  apple: "apple",
} as const;

export const Intent = {
  login: "login",
  register: "register",
} as const;

const ValidatedState = Brand.nominal<ValidatedState>();

export const ProviderUrl = S.String.pipe(S.brand("Auth.ProviderUrl"));

export const Code = S.String.pipe(S.brand("Auth.Code"));

export class State extends S.Class<State>("State")({
  provider: S.Literal(Provider.google, Provider.apple),
  intent: S.Literal(Intent.login, Intent.register),
  value: S.String.pipe(S.brand("Auth.State")),
}) {
  static make = (provider: Provider, intent: Intent) =>
    makeUuid.pipe(Effect.map((value) => new State({ provider, value: State.fields.value(value), intent })));

  static toString = S.encodeEither(S.suspend(() => StateFromString));

  static fromString = S.decodeEither(S.suspend(() => StateFromString));

  static compare = (self: State, that: State): Either.Either<ValidatedState, StateDoesNotMatch> =>
    Equal.equals(self.value, that.value) ? Either.right(ValidatedState(self)) : Either.left(new StateDoesNotMatch());
}

export const StateFromString = S.transformOrFail(S.String, State, {
  encode: (state) => PR.succeed([state.intent, state.value, state.provider].join("+")),
  decode: (str) => {
    const arr = str.split("+");
    return S.decodeUnknown(State)({ intent: arr[0], value: arr[1], provider: arr[0] }).pipe(
      Effect.mapError((e) => new PR.Type(S.String.ast, str, "Invalid auth state string")),
    );
  },
});
