import { Credentials } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { Effect, Match } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { LoginForm } from "src/auth/login-form";
import { useActionData } from "src/hooks/useActionData";
import { Users, Session, Remix, ServerResponse } from "src/server";
import { OAuth } from "src/server/OAuth";
import { ServerRequest } from "src/server/ServerRequest";

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.union(
  Credentials.EmailPassword.Plain,
  S.struct({ _tag: S.literal("Provider"), provider: S.literal("google") }),
);

const match = Match.typeTags<LoginFormFields>();

// Manually set the cookie with the OAuth state im sending to google
export const action = Remix.action(
  ServerRequest.formData(LoginFormFields).pipe(
    Effect.flatMap(
      match({
        Provider: ({ provider }) => OAuth.generateAuthUrl(provider),
        Plain: (credential) =>
          Users.authenticate(credential).pipe(
            Effect.tap(Session.mint),
            Effect.map(() => Routes.myAccount),
          ),
      }),
    ),
    Effect.flatMap(ServerResponse.Redirect),
    Effect.catchTags({
      FormDataError: ({ error }) => ServerResponse.ValidationError(error),
      CredentialsNotRecognised: () => ServerResponse.ValidationError({ email: ["Invalid email or password"] }),
      EmailAlreadyInUse: () => ServerResponse.ValidationError({ email: ["Email already in use"] }),
    }),
  ),
);

export default function LoginPage() {
  const data = useActionData();

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
