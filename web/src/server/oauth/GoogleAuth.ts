import { Credential, Email, Session, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer } from "effect";
import { google } from "googleapis";
import { Users } from "..";
import { LayerUtils } from "../LayerUtils";
import { Auth } from "./Auth";
import { ProviderAuth } from "./ProviderAuth";

interface Config {
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}

export class GoogleAuthConfig extends Context.Tag("@app/OAuth/GoogleAuthConfig")<GoogleAuthConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class GoogleAuth extends Effect.Tag("@app/auth/GoogleAuth")<GoogleAuth, ProviderAuth>() {
  static layer = Layer.effect(
    GoogleAuth,
    Effect.map(GoogleAuthConfig, (config) => {
      const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);

      return GoogleAuth.of({
        exchangeCodeForSession: (code) =>
          Effect.tryPromise({
            try: () => client.getToken(code),
            catch: (e) => new Auth.ExchangeCodeError({ error: e }),
          }).pipe(
            Effect.flatMap(({ tokens }) => getUserInfo(tokens.access_token!)),
            Effect.andThen(GoogleUser.fromUnknown),
            Effect.map(toCredential),
            Effect.flatMap(registerOrAuthenticate),
            Effect.catchTags({ ParseError: (e) => new Auth.ExchangeCodeError({ error: e }) }),
          ),
        generateAuthUrl: (state) =>
          Effect.try(() =>
            client.generateAuthUrl({
              access_type: "offline",
              state,
              scope: [
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile",
              ],
            }),
          ).pipe(Effect.mapError((error) => new Auth.GenerateUrlError({ error }))),
      });
    }),
  );
}

class GoogleUser extends S.Class<GoogleUser>("GoogleUser")({
  id: S.string,
  email: Email.schema,
  verified_email: S.boolean,
  name: S.optionFromNullish(S.string, null),
  given_name: S.optionFromNullish(User.FirstName.schema, null),
  family_name: S.optionFromNullish(User.LastName.schema, null),
  picture: S.optionFromNullish(S.string, null),
}) {
  static fromUnknown = S.decodeUnknown(GoogleUser);
}

const toCredential = (user: GoogleUser) =>
  new Credential.Provider({
    id: user.id,
    email: user.email,
    firstName: user.given_name,
    lastName: user.family_name,
  });

const getUserInfo = (token: string) =>
  Effect.tryPromise({
    try: (signal) =>
      fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`, { signal }).then(
        (res) => res.json() as Promise<unknown>,
      ),
    catch: (e) => new Auth.ExchangeCodeError({ error: e }),
  });

const registerOrAuthenticate = (
  credential: Credential.Provider,
): Effect.Effect<Session<User>, Email.AlreadyInUse | Credential.NotRecognised, Users> =>
  Effect.if(Effect.match(Users.findByEmail(credential.email), { onSuccess: () => true, onFailure: () => false }), {
    onTrue: Users.authenticate(credential),
    onFalse: Users.register(User.Registration.fromProviderCredential(credential)),
  });
