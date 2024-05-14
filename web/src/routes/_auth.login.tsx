import { Users } from "@chuz/core";
import { Effect, Match, S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm, LoginFormSchema } from "src/auth/LoginForm";
import { AppleForm, GoogleForm } from "src/auth/SocialButtons";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Intent } from "src/server/internals/oauth";
import { OAuth } from "src/server/oauth/OAuth";

export default function LoginPage() {
  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      title="Sign in to your account"
      description="Lets get back to learning!"
      separatorText="or login with"
      socialButtonsAction={Routes.login}
    >
      <LoginForm />
    </AuthContent>
  );
}

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const oauth = yield* OAuth;

    const LoginFormFields = S.Union(AppleForm, GoogleForm, LoginFormSchema);

    const matchForm = Match.typeTags<S.Schema.Type<typeof LoginFormFields>>();

    return ServerRequest.formData(LoginFormFields).pipe(
      Effect.flatMap(
        matchForm({
          Google: () => oauth.redirectToProvider("Google", Intent.Register),
          Apple: () => oauth.redirectToProvider("Apple", Intent.Register),
          EmailPassword: (credential) =>
            users
              .authenticate(credential)
              .pipe(Effect.flatMap(Session.mint), Effect.zipRight(ServerResponse.ReturnTo(Routes.dashboard))),
        }),
      ),
      Effect.withSpan("login action"),
      // TODO support translations
      Effect.catchTags({
        InvalidState: ServerResponse.Unexpected,
        GenerateUrlFailure: ServerResponse.Unexpected,
        CredentialNotRecognised: () => ServerResponse.FormRootError("Credentials not recognised"),
      }),
    );
  }),
);
