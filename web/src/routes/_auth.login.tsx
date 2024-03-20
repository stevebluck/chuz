import { Credentials } from "@chuz/domain";
import { useActionData } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { LoginForm } from "src/auth/login-form";
import { Users, Sessions, App } from "src/server";

export const action = App.formDataAction("Auth.login", Credentials.Plain, (credentials) =>
  Users.authenticate(credentials).pipe(
    Effect.flatMap(Sessions.mint),
    Effect.catchTag("CredentialsNotRecognised", () => Effect.succeed({ error: "Credentials not recognised" })),
  ),
);

export default function LoginPage() {
  const result = useActionData<typeof action>();

  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      <LoginForm />
    </AuthContent>
  );
}
