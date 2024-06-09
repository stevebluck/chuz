import { test } from "vitest";
import { Effect, fc } from "@chuz/prelude";

type Config = {
  runs: number;
  timeout?: number;
};

const defaultConfig: Required<Config> = {
  timeout: 5000,
  runs: 100,
};

export const asyncProperty = <A, E>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Config = defaultConfig,
) => {
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(
        fc.asyncProperty(arbs, (a) => Effect.runPromise(predicate(a))),
        { numRuns: config.runs },
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
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(
        fc.asyncProperty(arbs, (a) => Effect.runPromise(predicate(a))),
        { numRuns: config.runs },
      ),
    timeout,
  );
};
