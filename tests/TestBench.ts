import { Effect } from "effect";
import * as Core from "~/core";
import { TestSeed } from "./TestSeed";

export interface TestBench extends Core.Capabilities {}

export interface SeededTestBench extends TestBench, TestSeed.Seeded {}

const makeTestCapabilities: Effect.Effect<Core.Capabilities> = Effect.gen(function* (_) {
  const clock = Core.Reference.Clock;
  const sessionTokens = yield* _(Core.Reference.Tokens.create<Core.Id<Core.User>>(clock, Core.eqId));
  const passwordResetTokens = yield* _(Core.Reference.PasswordReset(clock));
  const users = yield* _(Core.Reference.Users.create(sessionTokens, passwordResetTokens));
  const decks = yield* _(Core.Reference.Decks.create(users));

  return Core.Capabilities.make(hasher, users, decks, clock);
});

export const makeTestBench: Effect.Effect<TestBench> = makeTestCapabilities;

export const makeSeededTestBench: Effect.Effect<SeededTestBench> = makeTestCapabilities.pipe(
  Effect.flatMap((bench) => TestSeed.Seeded.make(bench).pipe(Effect.map((seed) => ({ ...bench, ...seed })))),
);

const hasher = Core.Passwords.hasher(4);
