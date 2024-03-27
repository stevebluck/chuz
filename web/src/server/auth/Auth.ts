import { Credentials, User } from "@chuz/domain";
import { Uuid } from "@chuz/prelude";
import * as S from "@effect/schema/Schema";
import { Data, Effect, Equal, Equivalence, ReadonlyArray, String } from "effect";
import { Users } from "../Users";

export interface SocialAuths {
  exchangeCodeForSession: (
    provider: ProviderCode,
  ) => Effect.Effect<User.Session, ExchangeCodeError | User.EmailAlreadyInUse | Credentials.NotRecognised, Users>;
  generateAuthUrl: (provider: ProviderState) => Effect.Effect<string, GenerateUrlError>;
}

export type Code = S.Schema.Type<typeof Code>;
export type ProviderName = S.Schema.Type<typeof ProviderName>;
export type State = S.Schema.Type<typeof State>;

export type ProviderCode = { _tag: ProviderName; code: Code; state: State };
export type ProviderState = { _tag: ProviderName; state: State };

export const Code = S.string.pipe(S.brand("AuthCode"));

export const State = S.NonEmpty.pipe(S.brand("AuthState"));
export const makeState = (intent: "login" | "register") =>
  Uuid.make.pipe(
    Effect.map((uuid) => [intent, uuid].join("+")),
    Effect.map(State),
  );

export const intentFromState = (state: State) =>
  Effect.sync(() => String.split(state, "+")).pipe(
    Effect.flatMap(ReadonlyArray.head),
    Effect.mapError(() => new StateDoesNotMatch()),
  );

export const stateEquals: Equivalence.Equivalence<S.Schema.Type<typeof State>> = Equal.equals;

export const ProviderName = S.literal("google");

export class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}
export class ExchangeCodeError extends Data.TaggedError("ExchangeCodeError")<{ error: unknown }> {}
export class GenerateUrlError extends Data.TaggedError("GenerateUrlError")<{ error: unknown }> {}
