/* eslint-disable @typescript-eslint/no-unused-vars */
import { Option } from "effect";
import { NonEmptyIterable } from "effect/NonEmptyIterable";
import fc from "fast-check";
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

export const asyncProperty = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(fc.asyncProperty(arbs, predicate).beforeEach(beforeEach).afterEach(afterEach), {
        numRuns: config.runs,
      }),
    timeout,
  );
};

asyncProperty.skip = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig,
) => {
  test.skip(title, () => {});
};
asyncProperty.only = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => Promise<boolean | void>,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(fc.asyncProperty(arbs, predicate).beforeEach(beforeEach).afterEach(afterEach), {
        numRuns: config.runs,
      }),
    timeout,
  );
};

export const property = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test(
    title,
    async () =>
      fc.assert(fc.property(arbs, predicate).afterEach(afterEach).beforeEach(beforeEach), {
        numRuns: config.runs,
      }),
    timeout,
  );
};

property.skip = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig,
) => {
  test.skip(title, () => {});
};

property.only = <A>(
  title: string,
  arbs: fc.Arbitrary<fc.RecordValue<A>>,
  predicate: (a: A) => boolean | void,
  config: Config = defaultConfig,
) => {
  const beforeEach = config.beforeEach === undefined ? defaultConfig.beforeEach : config.beforeEach;
  const afterEach = config.afterEach === undefined ? defaultConfig.afterEach : config.afterEach;
  const timeout = config.timeout === undefined ? defaultConfig.timeout : config.timeout;

  test.only(
    title,
    async () =>
      fc.assert(fc.property(arbs, predicate).afterEach(afterEach).beforeEach(beforeEach), {
        numRuns: config.runs,
      }),
    timeout,
  );
};

export namespace Arbitrary {
  export const option = <A>(a: fc.Arbitrary<A>): fc.Arbitrary<Option.Option<A>> =>
    fc.option(a).map(Option.fromNullable);

  export const nonEmptyArray = <A>(a: fc.Arbitrary<A>): fc.Arbitrary<NonEmptyIterable<A>> =>
    fc.array(a, { minLength: 1 }).map((array) => array as unknown as NonEmptyIterable<A>);
}
