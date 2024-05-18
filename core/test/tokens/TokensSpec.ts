import { afterAll, expect } from "vitest";
import { Token } from "@chuz/domain";
import { Clock, Duration, Effect, Number, fc } from "@chuz/prelude";
import { NoSuchToken } from "../../src/Errors";
import { ReferenceTokens } from "../../src/tokens/ReferenceTokens";
import { asyncProperty } from "../Property";
import { SpecConfig, defaultSpecConfig } from "../SpecConfig";

export namespace TokensSpec {
  export const run = (config: SpecConfig = defaultSpecConfig) => {
    afterAll(config.afterAll);

    asyncProperty("tokens associate with the values provided at the time of issue", fc.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const token = yield* tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") }));

        const found0 = yield* tokens.lookup(token);
        const found1 = yield* tokens.lookup(token);

        expect(found0).toEqual(value);
        expect(found1).toEqual(value);
      }),
    );

    // TODO: add test clock
    asyncProperty("lookup fails when tokens have expired according to their TTL", fc.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const token = yield* tokens.issue(value, new Token.TimeToLive({ duration: 1 }));
        yield* Effect.sleep(2);
        const error = yield* tokens.lookup(token).pipe(Effect.flip);

        expect(error).toEqual(new NoSuchToken());
      }),
    );

    asyncProperty("lookup fails when the token does not exist", fc.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const token = Token.make<number>(value.toString());
        const error = yield* tokens.lookup(token).pipe(Effect.flip);
        expect(error).toEqual(new NoSuchToken());
      }),
    );

    asyncProperty("tokens may be revoked", fc.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const token = yield* tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") }));
        const found0 = yield* tokens.lookup(token);
        yield* tokens.revoke(token);
        const error = yield* tokens.lookup(token).pipe(Effect.flip);
        expect(found0).toEqual(value);
        expect(error).toEqual(new NoSuchToken());
      }),
    );

    asyncProperty("tokens may be revoked in bulk", fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), (values) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const ts = yield* Effect.forEach(values, (value) =>
          tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })),
        );
        const found = yield* Effect.forEach(ts, tokens.lookup);
        yield* tokens.revokeMany(ts);
        const errors = yield* Effect.forEach(ts, (token) => tokens.lookup(token).pipe(Effect.flip));

        expect(found).toEqual(values);
        expect(errors.every((e) => e._tag === "NoSuchToken")).toEqual(true);
      }),
    );

    asyncProperty("tokens may be found and revoked in bulk by value", fc.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* makeTokens;
        const token0 = yield* tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") }));
        const token1 = yield* tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") }));
        const token2 = yield* tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") }));
        const found = yield* tokens.findByValue(value);

        yield* tokens.revokeAll(value);

        const found1 = yield* tokens.findByValue(value);

        // TODO: Had to change to containSubset as order is lost
        expect(found).containSubset([token0, token1, token2]);
        expect(found1).toEqual([]);
      }),
    );
  };
}

const makeTokens = ReferenceTokens.create(Clock.make(), Number.Equivalence);
