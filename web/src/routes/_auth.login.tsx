import { EmailPassword } from "@chuz/domain";
import { Effect, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-content";
import { LoginForm } from "src/auth/login-form";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, ServerResponse } from "src/server";
import * as Remix from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.union(
  EmailPassword.Plain,
  S.struct({
    _tag: S.literal("Provider"),
    provider: Auth.ProviderName,
  }),
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(ServerRequest.formData(LoginFormFields)),
      Effect.flatMap(
        Match.typeTags<LoginFormFields>()({
          Provider: ({ provider }) =>
            Effect.flatMap(Auth.makeState("login"), (state) =>
              SocialAuth.generateAuthUrl({ _tag: provider, state }).pipe(
                Effect.flatMap(ServerResponse.Redirect),
                Effect.flatMap(stateCookie.save(state)),
              ),
            ),
          Plain: (credential) =>
            Users.authenticate(credential).pipe(
              Effect.flatMap(Session.mint),
              Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
            ),
        }),
      ),
      Effect.catchTags({
        AlreadyAuthenticated: () => ServerResponse.Redirect(Routes.myAccount),
        CookieError: () => ServerResponse.ServerError(),
        GenerateUrlError: () => ServerResponse.ServerError(),
        ParseError: ServerResponse.FormError,
        CredentialsNotRecognised: ServerResponse.BadRequest,
      }),
    ),
  ),
);

export default function LoginPage() {
  const result = useActionData();

  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <LoginForm />
    </AuthContent>
  );
}
