import { Clock, Effect, Equivalence } from "effect";
import { ReferenceTokens } from "~/core/tokens/ReferenceTokens";
import { TokensSpec } from "./TokensSpec";

TokensSpec.run(Effect.suspend(() => ReferenceTokens.create(Clock.make(), Equivalence.number)));
