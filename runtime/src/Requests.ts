import { ParseError } from "@effect/schema/ParseResult";
import * as S from "@effect/schema/Schema";
import { Context, Effect } from "effect";

export interface Requests {
  // TODO: Create ValidationError
  parseInput: <In, Out = In>(schema: S.Schema<In, Out>) => Effect.Effect<In, ParseError>;
}

export const Requests = Context.GenericTag<Requests>("@runtime/Requests");
