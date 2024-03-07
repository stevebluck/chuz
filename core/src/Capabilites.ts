import { Identified, Password } from "@chuz/domain";
import { Clock, Context, Effect, Layer } from "effect";
import { ReferenceTokens } from "./tokens/ReferenceTokens";
import { ReferenceUsers } from "./users/ReferenceUsers";
import { Users } from "./users/Users";

export type Capabilities = Users;

export namespace Capabilities {
  export namespace Test {
    export const users = Effect.gen(function* (_) {
      const clock = Clock.make();
      const userTokens = yield* _(ReferenceTokens.create(clock, Identified.equals));
      const passwordResetTokens = yield* _(ReferenceTokens.create(clock, Password.Reset.equals));

      return yield* _(ReferenceUsers.make(userTokens, passwordResetTokens));
    });

    export const layer: Layer.Layer<Capabilities> = Layer.effect(Users, users);

    export const make = Effect.all({ users });
  }
}
