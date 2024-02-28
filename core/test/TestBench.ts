import { Capabilities } from "core/Capabilities";
import { Clock, Effect, Layer } from "effect";
import { Context } from "effect";
import { Users } from "../src";
import { PasswordResetTokens, ReferenceUsers, UserTokens } from "../src/users/ReferenceUsers";
import { TestSeed } from "./TestSeed";

export interface TestBench extends Capabilities {}

export interface SeededTestBench extends TestBench, TestSeed.Seeded {}

export class UsersTag extends Context.Tag("Users")<UsersTag, Users>() {
  static Test = Layer.suspend(() => Layer.effect(UsersTag, ReferenceUsers.make));
}

const UsersTest = UsersTag.Test.pipe(Layer.provide(PasswordResetTokens.Test), Layer.provide(UserTokens.Test));

export const makeTestBench: Effect.Effect<Capabilities> = Effect.gen(function* (_) {
  const clock = Clock.make();

  const users = yield* _(UsersTag);

  return new Capabilities({ users, clock });
}).pipe(Effect.provide(UsersTest));

export const makeSeededTestBench: Effect.Effect<SeededTestBench> = makeTestBench.pipe(
  Effect.flatMap((bench) => TestSeed.Seeded.make(bench).pipe(Effect.map((seed) => ({ ...bench, ...seed })))),
  Effect.provide(UsersTest),
);
