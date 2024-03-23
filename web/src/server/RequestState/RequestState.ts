import * as S from "@effect/schema/Schema";
import { Effect, Option } from "effect";

export interface EncodedState extends S.Schema.Encoded<typeof State> {}

export class State extends S.Class<State>("State")({
  token: S.optionFromOrUndefined(S.string),
  nonce: S.optionFromOrUndefined(S.string),
}) {
  static fromUnknown = S.decodeUnknown(State);

  static encode = S.encode(State);

  static default: State = {
    token: Option.none(),
    nonce: Option.none(),
  };
}

export class RequestState extends Effect.Tag("@app/RequestState")<
  RequestState,
  {
    get: <K extends keyof State>(key: K) => Effect.Effect<State[K]>;
    set: <K extends keyof State>(key: K, value: State[K]) => Effect.Effect<void>;
    commit: Effect.Effect<string>;
  }
>() {}
