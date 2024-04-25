import { Credential, Email, Password } from "@chuz/domain";
import { Effect, Match } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Api } from "src/Api";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import { useActionData } from "src/hooks/useActionData";
import { Session, Http, Cookies } from "src/server";
import * as Remix from "src/server/Remix";

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
  Session.guest.pipe(
    Effect.zipRight(Http.request.formData(LoginFormFields)),
    Effect.flatMap(
      Match.typeTags<LoginFormFields>()({
        Google: () =>
          Effect.gen(function* (_) {
            const cookie = yield* _(Cookies.AuthState);
            const [url, state] = yield* _(Api.generateGoogleAuthUrl("register"));

            return yield* _(Http.response.redirect(url).pipe(Effect.flatMap(Http.response.setCookie(cookie, state))));
          }),
        Email: (credential) =>
          Api.authenticate(credential).pipe(
            Effect.flatMap(Session.mint),
            Effect.flatMap(() => Http.response.redirectToAccount),
          ),
      }),
    ),
    Effect.catchTags({
      CredentialNotRecognised: Http.response.badRequest,
      AlreadyAuthenticated: () => Http.response.redirectToAccount,
      GenerateUrlError: () => Http.response.serverError,
      InvalidFormData: Http.response.badRequest,
    }),
  ),
);

//Users | Cookies.ReturnTo | Cookies.AuthState | ServerRequest | FileSystem | Session | Scope | Path | Auth.Google

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
