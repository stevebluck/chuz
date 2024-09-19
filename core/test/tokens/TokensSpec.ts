import { expect } from "vitest";
import { Token } from "@chuz/domain";
import { Duration, Effect, FC } from "@chuz/prelude";
import { Property, property } from "../Property";
import { TestBench } from "../TestBench";

export namespace TokensSpec {
  export const run = (withBench: TestBench.WithBench, config: Property.Config) => {
    property(
      "tokens associate with the values provided at the time of issue",
      FC.integer(),

      (value) =>
        withBench(({ tokens }) =>
          Effect.gen(function* () {
            const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));

            const found0 = yield* tokens.lookup(token);
            const found1 = yield* tokens.lookup(token);

            expect(found0).toEqual(value);
            expect(found1).toEqual(value);
          }),
        ),
      config,
    );

    property(
      "lookup fails when tokens have expired according to their TTL",
      FC.integer(),
      (value) =>
        withBench(({ tokens, clock }) =>
          Effect.gen(function* () {
            const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
            yield* clock.adjust(Duration.days(2));
            const error = yield* tokens.lookup(token).pipe(Effect.flip);

            expect(error).toEqual(new Token.NoSuchToken());
          }),
        ),
      config.once,
    );
    property(
      "lookup fails when the token does not exist",
      FC.integer(),
      (value) =>
        withBench(({ tokens }) =>
          Effect.gen(function* () {
            const token = Token.make<number>(value.toString());
            const error = yield* tokens.lookup(token).pipe(Effect.flip);
            expect(error).toEqual(new Token.NoSuchToken());
          }),
        ),
      config,
    );

    property(
      "tokens may be revoked",
      FC.integer(),
      (value) =>
        withBench(({ tokens }) =>
          Effect.gen(function* () {
            const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
            const found0 = yield* tokens.lookup(token);
            yield* tokens.revoke(token);
            const error = yield* tokens.lookup(token).pipe(Effect.flip);
            expect(found0).toEqual(value);
            expect(error).toEqual(new Token.NoSuchToken());
          }),
        ),
      config,
    );

    property(
      "tokens may be revoked in bulk",
      FC.array(FC.integer(), { minLength: 0, maxLength: 10 }),
      (values) =>
        withBench(({ tokens }) =>
          Effect.gen(function* () {
            const ts = yield* Effect.forEach(values, (value) => tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) })));
            const found = yield* Effect.forEach(ts, tokens.lookup);
            yield* tokens.revokeMany(ts);
            const errors = yield* Effect.forEach(ts, (token) => tokens.lookup(token).pipe(Effect.flip));

            expect(found).toEqual(values);
            expect(errors.every((e) => e._tag === "NoSuchToken")).toEqual(true);
          }),
        ),
      config,
    );

    property(
      "tokens may be found and revoked in bulk by value",
      FC.integer(),
      (value) =>
        withBench(({ tokens }) =>
          Effect.gen(function* () {
            const token0 = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
            const token1 = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
            const token2 = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
            const found = yield* tokens.findByValue(value);

            yield* tokens.revokeAll(value);

            const found1 = yield* tokens.findByValue(value);

            // TODO: Had to change to containSubset as order is lost
            expect(found).containSubset([token0, token1, token2]);
            expect(found1).toEqual([]);
          }),
        ),
      config,
    );
  };
}
