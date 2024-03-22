import { Credentials, Email, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Context, Effect, Layer } from "effect";
import { google } from "googleapis";
import { IdentityProvider } from "./IdentityProvider";
import { LayerUtils } from "./LayerUtils";
import { Users } from "./Users";

interface Config {
  redirectUri: string;
  googleClientId: string;
  googleClientSecret: string;
}

const make = Effect.gen(function* (_) {
  const config = yield* _(OAuthConfig);
  const oauth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    `${config.redirectUri}?provider=google`,
  );

  return {
    exchangeCodeForSession: IdentityProvider.Authorise.match({
      google: ({ code }) =>
        Effect.promise(() => oauth2Client.getToken(code)).pipe(
          Effect.andThen(({ tokens }) =>
            fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${tokens.access_token}`),
          ),
          Effect.andThen((res) => res.json() as Promise<unknown>),
          Effect.andThen(Google.fromUnknown),
          Effect.andThen((user) =>
            Credentials.Provider.make({
              id: user.id,
              user: User.make({
                email: user.email,
                firstName: user.given_name,
                lastName: user.family_name,
                optInMarketing: User.OptInMarketing.unsafeFrom(false),
              }),
            }),
          ),
          Effect.flatMap(Users.authenticate),
          Effect.catchTags({
            ParseError: Effect.die,
            UnknownException: Effect.die,
          }),
        ),
    }),
    generateAuthUrl: IdentityProvider.Provider.match({
      google: () =>
        Effect.sync(() =>
          oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: [
              "https://www.googleapis.com/auth/userinfo.email",
              "https://www.googleapis.com/auth/userinfo.profile",
            ],
          }),
        ),
    }),
  };
});

class Google extends S.Class<Google>("Google")({
  id: S.string,
  email: Email.schema,
  verified_email: S.boolean,
  name: S.optionFromNullish(S.string, null),
  given_name: S.optionFromNullish(User.FirstName.schema, null),
  family_name: S.optionFromNullish(User.LastName.schema, null),
  picture: S.optionFromNullish(S.string, null),
}) {
  static fromUnknown = S.decodeUnknown(Google);
}

export class OAuthConfig extends Context.Tag("@app/OAuthConfig")<OAuthConfig, Config>() {
  static layer = LayerUtils.config(this);
}

export class OAuth extends Effect.Tag("@app/OAuth")<OAuth, Effect.Effect.Success<typeof make>>() {
  static live = Layer.effect(OAuth, make);
}
