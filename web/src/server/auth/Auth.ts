import { Credential, User } from "@chuz/domain";
import { Brand, makeUuid } from "@chuz/prelude";
import { Data, Effect, Equal, Array, String } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { EmailAlreadyInUse } from "core/index";
import { Users } from "../Users";

export { Google, GoogleConfig } from "./GoogleAuth";

export interface Auth {
  exchangeCodeForSession: (
    code: Code,
    state: State,
  ) => Effect.Effect<User.Session, ExchangeCodeError | EmailAlreadyInUse | Credential.NotRecognised, Users>;
  generateAuthUrl: (intent: Intent) => Effect.Effect<[string, State], GenerateUrlError>;
}

export type Code = string & Brand.Brand<"Code">;
export type State = string & Brand.Brand<"State">;
export type Intent = "login" | "register";

export const Code = S.String.pipe(S.brand("Code"));

export const State = S.String.pipe(S.brand("State"));

export const Intent = S.Literal("login", "register");

export const makeState = (intent: Intent): Effect.Effect<State> =>
  makeUuid.pipe(
    Effect.map((uuid) => [intent, uuid].join("+")),
    Effect.map(State),
  );

export const intentFromState = (state: State): Effect.Effect<Intent> =>
  Effect.sync(() => String.split(state, "+")).pipe(
    Effect.flatMap(Array.head),
    Effect.flatMap(S.decodeUnknown(Intent)),
    Effect.orElseSucceed(() => "login" as const),
  );

export const stateEquals = Equal.equivalence<State>();

export class StateDoesNotMatch extends Data.TaggedError("StateDoesNotMatch") {}
export class ExchangeCodeError extends Data.TaggedError("ExchangeCodeError")<{ error: unknown }> {}
export class GenerateUrlError extends Data.TaggedError("GenerateUrlError")<{ error: unknown }> {}
