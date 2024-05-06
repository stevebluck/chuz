import { Credential, User } from "@chuz/domain";
import { Context, Effect, Layer, Match } from "@chuz/prelude";
import * as Http from "@effect/platform/HttpServer";
import { Cookies } from "../Cookies";
import { ResponseHeaders } from "../ResponseHeaders";
import { ActionResponse, Redirect } from "../ServerResponse";
import * as oauth from "../internals/oauth";
import { GoogleAuth } from "./GoogleOAuth";

export * from "../internals/oauth";

interface UserCredential {
  credential: Exclude<Credential.Secure, Extract<Credential.Secure, { _tag: "EmailPassword" }>>;
  state: oauth.State;
  user: User.Draft;
}

interface OAuthImpl {
  redirectToProvider: (
    provider: oauth.Provider,
    intent: oauth.Intent,
  ) => Effect.Effect<
    Redirect,
    oauth.GenerateUrlFailure | oauth.InvalidState,
    Http.request.ServerRequest | ResponseHeaders
  >;

  getCredential: (
    state: string,
    code: oauth.Code,
  ) => Effect.Effect<UserCredential, oauth.InvalidCode | oauth.InvalidState, Http.request.ServerRequest>;
}

const make = Effect.gen(function* () {
  const google = yield* GoogleAuth;
  const authState = yield* Cookies.authState;

  return OAuth.of({
    redirectToProvider: (provider, intent) => {
      return oauth.State.make(provider, intent).pipe(
        Effect.tap(authState.set),
        Effect.flatMap((state) =>
          Match.value(provider).pipe(
            Match.when("Google", () => oauth.State.toString(state).pipe(Effect.flatMap(google.generateUrl))),
            Match.when("Apple", () => Effect.die("Apple login is not supported yet")),
            Match.exhaustive,
            Effect.map(ActionResponse.Redirect),
          ),
        ),
      );
    },
    getCredential: (state, code) => {
      return authState.find.pipe(
        Effect.flatten,
        Effect.mapError(() => new oauth.InvalidState({ error: "auth state cookie is not set" })),
        Effect.flatMap((cookieState) => oauth.State.compare(state, cookieState)),
        Effect.flatMap((state) =>
          Match.value(state.provider).pipe(
            Match.when("Google", () => google.getCredential(code)),
            Match.when("Apple", () => Effect.die("Apple login is not supported yet")),
            Match.exhaustive,
            Effect.map(([credential, user]) => ({ credential, state, user })),
          ),
        ),
      );
    },
  });
});

export class OAuth extends Context.Tag("@web/auth/OAuth")<OAuth, OAuthImpl>() {
  static layer = Layer.effect(OAuth, make).pipe(Layer.provide(Cookies.layer));
}
