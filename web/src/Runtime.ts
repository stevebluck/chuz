import { Identified, Password } from "@chuz/domain";
import { DevTools } from "@effect/experimental";
import { Capabilities, ReferenceTokens, ReferenceUsers } from "core/index";
import { Clock, Effect, Layer, Scope } from "effect";

const scope = Effect.runSync(Scope.make());

export namespace Runtime {
  export const Dev = Layer.effect(
    Capabilities,
    Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(ReferenceTokens.create(clock, Password.Reset.equals));

      const users = yield* _(ReferenceUsers.make(userTokens, passwordResetTokens));

      return { users };
    }),
  ).pipe(Layer.merge(DevTools.layer()), Layer.toRuntime, Scope.extend(scope));
}
