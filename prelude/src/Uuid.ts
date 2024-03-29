import * as S from "@effect/schema/Schema";
import { Effect } from "effect";

export const makeUuid: Effect.Effect<string> = Effect.promise(() => import("crypto")).pipe(
  Effect.map(({ randomUUID }) => randomUUID()),
  Effect.map(S.decodeSync(S.UUID)),
);
