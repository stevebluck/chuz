import { Capabilities } from "core/Capabilities";
import { Effect, Layer } from "effect";
import { Users } from "../src";
import { ReferenceUsers } from "../src/users/ReferenceUsers";
import { TestSeed } from "./TestSeed";

const UsersTest = Layer.effect(Users, ReferenceUsers.make);

const Main = UsersTest;

export interface TestBench extends Capabilities {}
export const TestBench: Effect.Effect<TestBench> = Capabilities.make.pipe(Effect.provide(Main));

export interface SeededTestBench extends TestBench, TestSeed.Seeded {}

export const SeededTestBench: Effect.Effect<SeededTestBench> = Effect.all({
  seed: TestSeed.Seeded.make,
  capabilities: Capabilities.make,
}).pipe(
  Effect.map(({ seed, capabilities }) => ({ ...capabilities, ...seed })),
  Effect.provide(Main),
);
