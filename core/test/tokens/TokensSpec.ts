import { Token } from "@chuz/domain";
import { Tokens } from "core/tokens/Tokens";
import { Duration, Effect } from "effect";
import fc from "fast-check";
import { expect } from "vitest";
import { asyncProperty } from "../Property";

export namespace TokensSpec {
  export const run = (c: Effect.Effect<Tokens<number>>) => {
    asyncProperty("tokens associate with the values provided at the time of issue", fc.integer(), (value) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const token = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })));

        const found0 = yield* _(tokens.lookup(token));
        const found1 = yield* _(tokens.lookup(token));

        expect(found0).toEqual(value);
        expect(found1).toEqual(value);
      }).pipe(Effect.runPromise),
    );

    asyncProperty("lookup fails when tokens have expired according to their TTL", fc.integer(), (value) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const token = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: 1 })));
        yield* _(Effect.sleep(2));
        const error = yield* _(tokens.lookup(token).pipe(Effect.flip));

        expect(error).toEqual(new Token.NoSuchToken());
      }).pipe(Effect.runPromise),
    );

    asyncProperty("lookup fails when the token does not exist", fc.integer(), (value) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const token = Token.make<number>(value.toString());
        const error = yield* _(tokens.lookup(token).pipe(Effect.flip));
        expect(error).toEqual(new Token.NoSuchToken());
      }).pipe(Effect.runPromise),
    );

    asyncProperty("tokens may be revoked", fc.integer(), (value) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const token = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })));
        const found0 = yield* _(tokens.lookup(token));
        yield* _(tokens.revoke(token));
        const error = yield* _(tokens.lookup(token).pipe(Effect.flip));
        expect(found0).toEqual(value);
        expect(error).toEqual(new Token.NoSuchToken());
      }).pipe(Effect.runPromise),
    );

    asyncProperty("tokens may be revoked in bulk", fc.array(fc.integer(), { minLength: 0, maxLength: 10 }), (values) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const ts = yield* _(
          Effect.forEach(values, (value) =>
            tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })),
          ),
        );
        const found = yield* _(Effect.forEach(ts, tokens.lookup));
        yield* _(tokens.revokeMany(ts));
        const errors = yield* _(Effect.forEach(ts, (token) => tokens.lookup(token).pipe(Effect.flip)));

        expect(found).toEqual(values);
        expect(errors.every((e) => e._tag === "NoSuchToken")).toEqual(true);
      }).pipe(Effect.runPromise),
    );

    asyncProperty("tokens may be found and revoked in bulk by value", fc.integer(), (value) =>
      Effect.gen(function* (_) {
        const tokens = yield* _(c);
        const token0 = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })));
        const token1 = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })));
        const token2 = yield* _(tokens.issue(value, new Token.TimeToLive({ duration: Duration.toMillis("1 days") })));
        const found = yield* _(tokens.findByValue(value));
        yield* _(tokens.revokeAll(value));

        const found1 = yield* _(tokens.findByValue(value));

        // TODO: Had to change to containSubset as order is lost
        expect(found).containSubset([token0, token1, token2]);
        expect(found1).toEqual([]);
      }).pipe(Effect.runPromise),
    );
  };
}
