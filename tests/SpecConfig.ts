const noop = () => {};

export type SpecConfig = {
  beforeEach: () => void;
  afterEach: () => void;
  afterAll: () => void;
  timeout: number;
  runs: number;
};
export const SpecConfig = (
  beforeEach: () => void,
  afterEach: () => void,
  afterAll: () => void,
  timeout: number,
  runs: number = 100,
): SpecConfig => ({ beforeEach, afterEach, afterAll, timeout, runs });

export const defaultSpecConfig = SpecConfig(noop, noop, noop, 5000, 100);
