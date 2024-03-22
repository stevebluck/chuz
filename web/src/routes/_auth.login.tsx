import { Credentials } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Effect, Match } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { LoginForm } from "src/auth/login-form";
import { Users, Sessions, App, Redirect, ValidationError } from "src/server";
import { OAuth } from "src/server/OAuth";

type Form = S.Schema.Type<typeof Form>;
const Form = S.union(Credentials.EmailPassword.Plain, S.struct({ _tag: S.literal("Google") }));

const match = Match.typeTags<Form>();

export const action = App.formDataAction(
  "Auth.login",
  Form,
  match({
    Google: () => Effect.flatMap(OAuth.generateAuthUrl({ _tag: "google" }), Redirect.make),
    Plain: (cred) =>
      Users.authenticate(cred).pipe(
        Effect.flatMap(Sessions.mint),
        Effect.catchTags({
          CredentialsNotRecognised: () => ValidationError.make({ error: ["Credentials not recognised"] }),
          EmailAlreadyInUse: () => ValidationError.make({ error: ["Email already in use"] }),
        }),
      ),
  }),
);

export default function LoginPage() {
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
