import { Credentials, User } from "@chuz/domain";
import { Brand, makeUuid } from "@chuz/prelude";
import { Data, Effect, Equal, Equivalence, ReadonlyArray, String } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Users } from "../Users";

export interface SocialAuths {
  exchangeCodeForSession: (
    provider: ProviderCode,
  ) => Effect.Effect<User.Session, ExchangeCodeError | User.EmailAlreadyInUse | Credentials.NotRecognised, Users>;
  generateAuthUrl: (provider: ProviderState) => Effect.Effect<string, GenerateUrlError>;
}

export type ProviderName = S.Schema.Type<typeof ProviderName>;
export type Code = string & Brand.Brand<"AuthCode">;
export type State = string & Brand.Brand<"AuthState">;
export type Intent = "login" | "register";

export type ProviderCode = { _tag: ProviderName; code: Code; state: State };
export type ProviderState = { _tag: ProviderName; state: State };

export const Code = S.string.pipe(S.brand("AuthCode"));

export const Intent = S.literal("login", "register");

export const State = S.NonEmpty.pipe(S.brand("AuthState"));
export const makeState = (intent: Intent) =>
  makeUuid.pipe(
    Effect.map((uuid) => [intent, uuid].join("+")),
    Effect.map(State),
  );

export const intentFromState = (state: State): Effect.Effect<Intent> =>
  Effect.sync(() => String.split(state, "+")).pipe(
    Effect.flatMap(ReadonlyArray.head),
    Effect.flatMap(S.decodeUnknown(Intent)),
    Effect.orElseSucceed(() => "login" as const),
  );

export const stateEquals: Equivalence.Equivalence<S.Schema.Type<typeof State>> = Equal.equals;

export const ProviderName = S.literal("google");

export class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}
export class ExchangeCodeError extends Data.TaggedError("ExchangeCodeError")<{ error: unknown }> {}
export class GenerateUrlError extends Data.TaggedError("GenerateUrlError")<{ error: unknown }> {}