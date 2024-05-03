import { Effect, fc } from "@chuz/prelude";
import { test } from "vitest";

type Config = {
  beforeEach?: () => void;
  afterEach?: () => void;
  timeout?: number;
  runs: number;
};

const defaultConfig: Required<Config> = {
  beforeEach: () => {},
  afterEach: () => {},
  timeout: 5000,
  runs: 100,
};

export const asyncProperty = <A, E>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(
        fc
          .asyncProperty(arbs, (a) => predicate(a).pipe(Effect.runPromise))
          .beforeEach(beforeEach)
          .afterEach(afterEach),
        {
          numRuns: config.runs,
        },
      ),
    timeout,
  );
};

asyncProperty.skip = <A, E>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Config = defaultConfig,
) => {
  test.skip(title, () => {});
};

asyncProperty.todo = <A, E>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Config = defaultConfig,
) => {
  test.todo(title, () => {});
};

asyncProperty.only = <A, E>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(
        fc
          .asyncProperty(arbs, (a) => predicate(a).pipe(Effect.runPromise))
          .beforeEach(beforeEach)
          .afterEach(afterEach),
        {
          numRuns: config.runs,
        },
      ),
    timeout,
  );
};
