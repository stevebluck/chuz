import { ReferenceTokens } from "core/tokens/ReferenceTokens";
import { Clock, Equivalence } from "effect";
import { TokensSpec } from "./TokensSpec";

TokensSpec.run(ReferenceTokens.create(Clock.make(), Equivalence.number));
