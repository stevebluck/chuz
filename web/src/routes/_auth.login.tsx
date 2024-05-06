import { Users } from "@chuz/core";
import { Credential } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { useActionData } from "@remix-run/react";
import { CredentialNotRecognised } from "core/users/Errors";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import { ActionResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Intent } from "src/server/internals/oauth";
import { OAuth } from "src/server/oauth/OAuth";

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.Union(
  Credential.EmailPasswordPlain,
  S.Struct({ _tag: S.Literal(Credential.Tag.Google) }),
  S.Struct({ _tag: S.Literal(Credential.Tag.Apple) }),
);

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const oauth = yield* OAuth;

    const matchForm = Match.typeTags<LoginFormFields>();

    return ServerRequest.formData(LoginFormFields).pipe(
      Effect.flatMap(
        matchForm({
          Google: () => oauth.redirectToProvider("Google", Intent.Register),
          Apple: () => oauth.redirectToProvider("Apple", Intent.Register),
          EmailPassword: (credential) =>
            users
              .authenticate(credential)
              .pipe(Effect.flatMap(Session.mint), Effect.zipRight(ActionResponse.ReturnTo(Routes.dashboard))),
        }),
      ),
      Effect.catchTags({
        // ✅ This is taking care of the encoding of the error
        CredentialNotRecognised: ActionResponse.BadRequest(CredentialNotRecognised),
        GenerateUrlFailure: ActionResponse.Unexpected,
        InvalidState: ActionResponse.Unexpected,
      }),
    );
  }),
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
      <pre>{JSON.stringify(result, null, 2)}</pre>
      <LoginForm />
    </AuthContent>
  );
}
