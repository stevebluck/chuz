import { it } from "@effect/vitest";
import { Data, Effect, FC } from "@chuz/prelude";

export namespace Property {
  export class Config extends Data.Class<{
    beforeEach: () => void;
    afterEach: () => void;
    timeout: number;
    runs: number;
    seed?: number;
    path?: string;
    endOnFailure: boolean;
  }> {
    static default = new Config({
      beforeEach: () => {},
      afterEach: () => {},
      timeout: 5000,
      runs: 100,
      endOnFailure: false,
    });

    static integration = new Config({
      beforeEach: () => {},
      afterEach: () => {},
      timeout: 10000,
      runs: 5,
      endOnFailure: true,
    });

    copy = (that: Partial<Config>): Config => new Config({ ...this, ...that });

    get once(): Config {
      return new Config({ ...this, runs: 1, endOnFailure: true });
    }
  }
}

export const property = <A, E>(
  title: string,
  arbs: FC.Arbitrary<FC.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Property.Config = Property.Config.default,
) => {
  it(
    title,
    async () =>
      // @ts-ignore
      FC.assert(
        FC.asyncProperty(arbs, (a) => predicate(a).pipe(Effect.runPromise))
          .beforeEach(config.beforeEach)
          .afterEach(config.afterEach),
        {
          numRuns: config.runs,
          endOnFailure: config.endOnFailure,
          seed: config.seed,
          path: config.path,
        },
      ),
    config.timeout,
  );
};

property.skip = <A, E>(
  title: string,
  arbs: FC.Arbitrary<FC.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Property.Config = Property.Config.default,
) => {
  it.skip(title, () => {});
};

property.todo = <A, E>(title: string) => {
  it.todo(title, () => {});
};

property.only = <A, E>(
  title: string,
  arbs: FC.Arbitrary<FC.RecordValue<A>>,
  predicate: (a: A) => Effect.Effect<boolean | void, E>,
  config: Property.Config = Property.Config.default,
) => {
  it.only(
    title,
    async () =>
      FC.assert(
        FC.asyncProperty(arbs, (a) => predicate(a).pipe(Effect.runPromise))
          .beforeEach(config.beforeEach)
          .afterEach(config.afterEach),
        {
          numRuns: config.runs,
          endOnFailure: config.endOnFailure,
        },
      ),
    config.timeout,
  );
};
