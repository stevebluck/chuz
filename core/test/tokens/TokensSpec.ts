import { expect } from "vitest";
import { Token } from "@chuz/domain";
import { Duration, Effect, FC } from "@chuz/prelude";
import { Tokens } from "../../src/tokens/Tokens";
import { Property, property } from "../Property";

export namespace TokensSpec {
  export const run = (c: Effect.Effect<Tokens<number>>, config: Property.Config) => {
    property(
      "tokens associate with the values provided at the time of issue",
      FC.integer(),

      (value) =>
        Effect.gen(function* () {
          const tokens = yield* c;
          const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));

          const found0 = yield* tokens.lookup(token);
          const found1 = yield* tokens.lookup(token);

          expect(found0).toEqual(value);
          expect(found1).toEqual(value);
        }),
      config,
    );

    // TODO: add test clock
    property("lookup fails when tokens have expired according to their TTL", FC.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* c;
        const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.millis(1) }));
        yield* Effect.sleep(2);
        const error = yield* tokens.lookup(token).pipe(Effect.flip);

        expect(error).toEqual(new Token.NoSuchToken());
      }),
    );

    property("lookup fails when the token does not exist", FC.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* c;
        const token = Token.make<number>(value.toString());
        const error = yield* tokens.lookup(token).pipe(Effect.flip);
        expect(error).toEqual(new Token.NoSuchToken());
      }),
    );

    property("tokens may be revoked", FC.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* c;
        const token = yield* tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) }));
        const found0 = yield* tokens.lookup(token);
        yield* tokens.revoke(token);
        const error = yield* tokens.lookup(token).pipe(Effect.flip);
        expect(found0).toEqual(value);
        expect(error).toEqual(new Token.NoSuchToken());
      }),
    );

    property("tokens may be revoked in bulk", FC.array(FC.integer(), { minLength: 0, maxLength: 10 }), (values) =>
      Effect.gen(function* () {
        const tokens = yield* c;
        const ts = yield* Effect.forEach(values, (value) => tokens.issue(value, Token.TimeToLive({ duration: Duration.days(1) })));
        const found = yield* Effect.forEach(ts, tokens.lookup);
        yield* tokens.revokeMany(ts);
        const errors = yield* Effect.forEach(ts, (token) => tokens.lookup(token).pipe(Effect.flip));

        expect(found).toEqual(values);
        expect(errors.every((e) => e._tag === "NoSuchToken")).toEqual(true);
      }),
    );

    property("tokens may be found and revoked in bulk by value", FC.integer(), (value) =>
      Effect.gen(function* () {
        const tokens = yield* c;
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
    );
  };
}
