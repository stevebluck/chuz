import { Credential, Email, Password } from "@chuz/domain";
import { Effect, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, Http } from "src/server";
import * as Remix from "src/server/Remix";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.Union(
  S.Struct({
    _tag: S.Literal(Credential.ProviderId.Email),
    email: Email,
    password: Password.Plaintext,
  }),
  S.Struct({ _tag: S.Literal(Credential.ProviderId.Google) }),
);

export const action = Remix.action(
  Effect.flatMap(AppCookies.authState, (stateCookie) =>
    Session.guest.pipe(
      Effect.zipRight(Http.request.formData(LoginFormFields)),
      Effect.flatMap(
        Match.typeTags<LoginFormFields>()({
          Google: ({ _tag }) =>
            Effect.flatMap(Auth.makeState("login"), (state) =>
              SocialAuth.generateAuthUrl({ _tag, state }).pipe(
                Effect.flatMap(Http.response.redirect),
                Effect.flatMap(stateCookie.save(state)),
              ),
            ),
          Email: (credential) =>
            Users.authenticate(credential).pipe(
              Effect.flatMap(Session.mint),
              Effect.flatMap(() => Http.response.redirectToAccount),
            ),
        }),
      ),
      Effect.catchTags({
        CredentialNotRecognised: Http.response.badRequest,
        AlreadyAuthenticated: () => Http.response.redirectToAccount,
        CookieError: () => Http.response.serverError,
        GenerateUrlError: () => Http.response.serverError,
        InvalidFormData: Http.response.validationError,
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
