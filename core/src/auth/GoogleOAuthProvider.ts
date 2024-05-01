import { Email, OAuth, User } from "@chuz/domain";
import { Config, Context, Effect, Layer, Secret } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { google } from "googleapis";
import { GenerateUrlFailure } from "../Errors";
import { GetUserInfoError, OAuthProvider } from "./OAuthProvider";

const GoogleConfig = Config.all({
  clientId: Config.string("GOOGLE_CLIENT_ID"),
  clientSecret: Config.secret("GOOGLE_CLIENT_SECRET"),
  url: Config.string("GOOGLE_GET_USER_URL"),
  redirectUrl: Config.string("GOOGLE_REDIRECT_URL"),
});

const GoogleUser = S.parseJson(
  S.Struct({
    // TODO: think I need the userId
    email: Email,
    verified_email: S.Boolean,
    name: S.OptionFromNullishOr(S.String, null),
    firstName: S.OptionFromNullishOr(User.FirstName, null).pipe(S.propertySignature, S.fromKey("given_name")),
    lastName: S.OptionFromNullishOr(User.LastName, null).pipe(S.propertySignature, S.fromKey("family_name")),
    picture: S.OptionFromNullishOr(S.String, null),
    optInMarketing: S.optional(User.OptInMarketing, { default: () => User.OptInMarketing(false) }),
  }),
);

const make = Effect.gen(function* () {
  const config = yield* GoogleConfig;
  const client = new google.auth.OAuth2(config.clientId, Secret.value(config.clientSecret));

  const decodeUser = S.decodeUnknown(GoogleUser);

  const redirectUrl = (state: OAuth.State) => `${config.redirectUrl}/${state.intent}`;

  const getUser = (code: OAuth.Code): Effect.Effect<User.User, GetUserInfoError> => {
    return Effect.tryPromise({
      try: (signal) =>
        client
          .getToken({ code, redirect_uri: config.redirectUrl })
          .then(({ tokens }) => fetch(`${config.url}?access_token=${tokens.access_token}`, { signal }))
          .then((res) => res.json() as Promise<unknown>),
      catch: (error) => new GetUserInfoError({ error }),
    }).pipe(
      Effect.flatMap(decodeUser),
      Effect.catchTag("ParseError", (error) => Effect.fail(new GetUserInfoError({ error }))),
    );
  };

  const generateUrl = (state: OAuth.State): Effect.Effect<OAuth.ProviderUrl, GenerateUrlFailure> => {
    return OAuth.State.toString(state).pipe(
      Effect.map((value) =>
        client.generateAuthUrl({
          access_type: "offline",
          state: value,
          redirect_uri: redirectUrl(state),
          scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
        }),
      ),
      Effect.map(OAuth.ProviderUrl),
      Effect.mapError((error) => new GenerateUrlFailure({ error })),
    );
  };

  // TODO: Move to users
  // const registerOrAuthenticate = (
  //   credential: Credential.Secure.Google,
  //   user: User.User,
  // ): Effect.Effect<User.Session, EmailAlreadyInUse | Credential.NotRecognised, Users> =>
  //   // TODO: find user with email and if found, link them
  //   users.getByEmail(user.email).pipe(
  //     Effect.zipRight(users.authenticate(credential)),
  //     Effect.catchAll(() =>
  //       users.register({
  //         credential: credential,
  //         firstName: user.firstName,
  //         lastName: user.lastName,
  //         optInMarketing: user.optInMarketing,
  //       }),
  //     ),
  //   );

  return { getUser, generateUrl };
});

export class GoogleOAuthProvider extends Context.Tag("@core/auth/GoogleOAuthProvider")<
  GoogleOAuthProvider,
  OAuthProvider
>() {
  static layer = Layer.effect(GoogleOAuthProvider, make);
}
