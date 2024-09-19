import { Property } from "../Property";
import { TestBench } from "../TestBench";
import { TokensSpec } from "./TokensSpec";

TokensSpec.run(TestBench.withBench, Property.Config.default);
