import { Clock, Number } from "@chuz/prelude";
import { ReferenceTokens } from "../../src/tokens/ReferenceTokens";
import { Property } from "../Property";
import { TokensSpec } from "./TokensSpec";

TokensSpec.run(ReferenceTokens.make(Clock.make(), Number.Equivalence), Property.Config.default);
