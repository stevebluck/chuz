import { Capabilities, Sessions, Users } from "@chuz/core";
import { Credentials } from "@chuz/domain";
import { Context, Effect, Layer } from "effect";
import { Requests, Response } from ".";

/**
 * Login
 * Get the login route
 */
export class Login extends Context.Tag("@api/Login")<Login, Response<void>>() {
  static Layer = Layer.succeed(
    Login,
    Effect.gen(function* (_) {
      const sessions = yield* _(Sessions);
      yield* _(
        sessions.guest,
        Effect.mapError(() => new Response.Fail.Redirect({ location: "" })),
      );
    }),
  );
}

/**
 * Authenticate
 * Authenticate the user
 */
export class Authenticate extends Context.Tag("@api/Authenticate")<Authenticate, Response<void>>() {
  static Layer = Layer.effect(
    Authenticate,
    Effect.map(Users, (users) =>
      Effect.gen(function* (_) {
        const request = yield* _(Requests);

        const credentials = yield* _(
          request.parseInput(Credentials.Plain),
          Effect.catchTags({
            ParseError: (error) => new Response.Fail.ValidationError({ error }),
          }),
        );

        yield* _(
          users.authenticate(credentials),
          Effect.catchTags({
            CredentialsNotRecognised: () => new Response.Fail.Redirect({ location: "" }),
          }),
        );
      }),
    ),
  );
}

export namespace Api {
  const Operations = Layer.merge(Login.Layer, Authenticate.Layer);
  export const Test = Layer.provide(Operations, Capabilities.Test);
  export const Live = Layer.provide(Operations, Capabilities.Live);
}
