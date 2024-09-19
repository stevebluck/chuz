import { Property } from "../Property";
import { TestBench } from "../TestBench";
import { UsersSpec } from "./UsersSpec";

UsersSpec.run(TestBench.withSeed, Property.Config.default);
