import { OAuth } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import { useActionData } from "src/hooks/useActionData";
import { LoginFormFields } from "src/server/Auth";
import * as Remix from "src/server/Remix";
import { Session, Http, Auth } from "src/server/prelude";

export const action = Remix.action(
  Session.guest.pipe(
    Effect.zipRight(Http.request.formData(LoginFormFields)),
    Effect.flatMap(
      Auth.matchLoginForm({
        Google: () => Auth.generateAuthUrl(OAuth.Provider.google, OAuth.Intent.login),
        Apple: () => Auth.generateAuthUrl(OAuth.Provider.apple, OAuth.Intent.login),
        Email: (credential) =>
          Auth.loginByEmail(credential).pipe(
            Effect.flatMap(Session.mint),
            Effect.zipRight(Http.response.returnTo(Routes.dashboard)),
          ),
      }),
    ),
    Effect.catchAll(Http.response.badRequest),
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
