import { Credential, User } from "@chuz/domain";
import { Context, Data, Effect, Layer } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { EmailAlreadyInUse } from "core/index";
import { google } from "googleapis";
import { LayerUtils } from "../LayerUtils";
import { Users } from "../Users";
import * as Auth from "./Auth";

interface Config {
  redirectUrl: string;
  clientId: string;
  clientSecret: string;
}

export class GoogleAuthConfig extends Context.Tag("@app/auth/GoogleAuthConfig")<GoogleAuthConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class GoogleAuth extends Effect.Tag("@app/auth/GoogleAuth")<GoogleAuth, Auth.SocialAuths>() {
  static layer = Layer.effect(
    GoogleAuth,
    Effect.map(GoogleAuthConfig, (config) => {
      const client = new google.auth.OAuth2(config.clientId, config.clientSecret);

      return GoogleAuth.of({
        exchangeCodeForSession: ({ code, state }) =>
          Auth.intentFromState(state).pipe(
            Effect.andThen((intent) =>
              client.getToken({ code, redirect_uri: `${config.redirectUrl}/${intent}?_tag=google` }),
            ),
            Effect.flatMap(({ tokens }) => getUserInfo(tokens.access_token!)),
            Effect.flatMap(GoogleUser.fromUnknown),
            Effect.flatMap((user) =>
              registerOrAuthenticate(
                new Credential.AuthProvider({ email: user.email, providerId: Credential.ProviderId.google }),
                user,
              ),
            ),
            Effect.catchTags({
              UnknownException: (e) => new Auth.ExchangeCodeError({ error: e }),
              GetUserInfoError: (e) => new Auth.ExchangeCodeError({ error: e }),
              ParseError: (e) => new Auth.ExchangeCodeError({ error: e }),
            }),
          ),
        generateAuthUrl: ({ state }) => {
          return Auth.intentFromState(state).pipe(
            Effect.map((intent) =>
              client.generateAuthUrl({
                access_type: "offline",
                state,
                redirect_uri: `${config.redirectUrl}/${intent}?_tag=google`,
                scope: [
                  "https://www.googleapis.com/auth/userinfo.email",
                  "https://www.googleapis.com/auth/userinfo.profile",
                ],
              }),
            ),
            Effect.mapError((error) => new Auth.GenerateUrlError({ error })),
          );
        },
      });
    }),
  );
}

class GoogleUser extends S.Class<GoogleUser>("GoogleUser")({
  email: S.EmailAddress,
  verified_email: S.Boolean,
  name: S.OptionFromNullishOr(S.String, null),
  given_name: S.OptionFromNullishOr(User.FirstName, null),
  family_name: S.OptionFromNullishOr(User.LastName, null),
  picture: S.OptionFromNullishOr(S.String, null),
}) {
  static fromUnknown = S.decodeUnknown(GoogleUser);
}

const getUserInfo = (token: string): Effect.Effect<unknown, GetUserInfoError> =>
  Effect.tryPromise({
    try: (signal) =>
      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, { signal }).then(
        (res) => res.json() as Promise<unknown>,
      ),
    catch: (e) => new GetUserInfoError({ error: e }),
  });

const registerOrAuthenticate = (
  credential: Credential.AuthProvider,
  user: GoogleUser,
): Effect.Effect<User.Session, EmailAlreadyInUse | Credential.NotRecognised, Users> =>
  Users.getByEmail(user.email).pipe(
    Effect.zipRight(Users.authenticate(credential)),
    Effect.catchAll(() =>
      Users.register({
        credentials: credential,
        firstName: user.given_name,
        lastName: user.family_name,
        optInMarketing: User.OptInMarketing(false),
      }),
    ),
  );

class GetUserInfoError extends Data.TaggedError("GetUserInfoError")<{ error: unknown }> {}
