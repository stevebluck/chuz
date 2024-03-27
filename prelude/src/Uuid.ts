import * as S from "@effect/schema/Schema";
import { randomUUID } from "crypto";
import { Effect } from "effect";

export const make: Effect.Effect<string> = Effect.sync(() => randomUUID()).pipe(Effect.map(S.decodeSync(S.UUID)));
