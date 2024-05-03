import { Email, User, Credential } from "@chuz/domain";
import { Config, Effect, Secret, Tuple } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { google } from "googleapis";
import { Code, GenerateUrlFailure, InvalidCode, ProviderUrl } from "../internals/oauth";

const GoogleConfig = Config.all({
  clientId: Config.string("GOOGLE_CLIENT_ID"),
  clientSecret: Config.secret("GOOGLE_CLIENT_SECRET"),
  url: Config.string("GOOGLE_GET_USER_URL"),
  redirectUrl: Config.string("GOOGLE_REDIRECT_URL"),
});

export const GoogleAuth = Effect.gen(function* () {
  const config = yield* GoogleConfig;
  const client = new google.auth.OAuth2(config.clientId, Secret.value(config.clientSecret));

  const getCredential = (code: Code): Effect.Effect<[Credential.Google, User.Draft], InvalidCode> => {
    return Effect.tryPromise(() =>
      client
        .getToken({ code, redirect_uri: config.redirectUrl })
        .then(({ tokens }) => fetch(`${config.url}?access_token=${tokens.access_token}`))
        .then((res) => res.json() as Promise<unknown>),
    ).pipe(
      Effect.flatMap(GoogleUser.fromUnknown),
      Effect.map((user) =>
        Tuple.make(
          Credential.Secure.Google({ email: user.email }),
          User.Draft.make({
            firstName: user.given_name,
            lastName: user.family_name,
            optInMarketing: User.OptInMarketing(false),
          }),
        ),
      ),
      Effect.mapError((error) => new InvalidCode({ error })),
    );
  };

  const generateUrl = (state: string): Effect.Effect<ProviderUrl, GenerateUrlFailure> => {
    return Effect.sync(() =>
      client.generateAuthUrl({
        access_type: "offline",
        state,
        prompt: "select_account",
        redirect_uri: config.redirectUrl,
        scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
      }),
    ).pipe(
      Effect.map(ProviderUrl),
      Effect.mapError((error) => new GenerateUrlFailure({ error })),
    );
  };

  return { getCredential, generateUrl };
});

class GoogleUser extends S.Class<GoogleUser>("GoogleUser")({
  id: S.String,
  email: Email,
  verified_email: S.Boolean,
  name: S.OptionFromNullishOr(S.String, null),
  given_name: S.OptionFromNullishOr(User.FirstName, null),
  family_name: S.OptionFromNullishOr(User.LastName, null),
  picture: S.OptionFromNullishOr(S.String, null),
}) {
  static fromUnknown = S.decodeUnknown(GoogleUser);
}
