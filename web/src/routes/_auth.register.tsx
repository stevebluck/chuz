import { OAuth } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RegisterForm } from "src/auth/RegisterForm";
import { useActionData } from "src/hooks/useActionData";
import * as Remix from "src/server/Remix";
import { Http, Auth, Session } from "src/server/prelude";

export const action = Remix.action(
  Http.request.formData(Auth.RegisterFormFields).pipe(
    Effect.flatMap(
      Auth.matchRegistrationFrom({
        Google: () => Auth.generateAuthUrl(OAuth.Provider.google, OAuth.Intent.register),
        Apple: () => Auth.generateAuthUrl(OAuth.Provider.apple, OAuth.Intent.register),
        Email: (registration) =>
          Auth.registerByEmail(registration).pipe(
            Effect.flatMap(Session.mint),
            Effect.zipRight(Http.response.returnTo(Routes.dashboard)),
          ),
      }),
    ),
    Effect.catchAll(Http.response.badRequest),
  ),
);

export default function RegisterPage() {
  const result = useActionData();

  return (
    <AuthContent to={Routes.login} toLabel="Login" title="Create an account" description="Lets get learning!">
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <RegisterForm error={{}} />
    </AuthContent>
  );
}
