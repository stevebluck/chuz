import { Routes } from "src/Routes";
import { AuthContent } from "src/components/auth/AuthContent";
import { RegisterForm, RegisterFormSchema } from "src/components/auth/RegisterForm";
import { AppleForm, GoogleForm } from "src/components/auth/SocialButtons";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Intent } from "src/server/internals/oauth";
import * as OAuth from "src/server/oauth/OAuth";
import { Passwords, Users } from "@chuz/core";
import { Credential, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";

export default function RegisterPage() {
  return (
    <AuthContent
      to={Routes.login}
      toLabel="Login"
      title="Create an account"
      description="Lets get learning!"
      separatorText="Or register with"
      socialButtonsAction={Routes.register}
    >
      <RegisterForm />
    </AuthContent>
  );
}

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const oauth = yield* OAuth.OAuth;
    const passwords = yield* Passwords;

    const LoginFormFields = S.Union(AppleForm, GoogleForm, RegisterFormSchema);

    const matchForm = Match.typeTags<S.Schema.Type<typeof LoginFormFields>>();

    return Session.guest.pipe(
      Effect.orElse(() => ServerResponse.Redirect(Routes.dashboard)),
      Effect.flatMap(() => ServerRequest.formData(RegisterFormSchema)),
      Effect.flatMap(
        matchForm({
          Google: () => oauth.redirectToProvider("Google", Intent.Register),
          Apple: () => oauth.redirectToProvider("Apple", Intent.Register),
          RegisterForm: (form) =>
            passwords.hash(form.password).pipe(
              Effect.map((password) => Credential.Secure.EmailPassword({ email: form.email, password })),
              Effect.flatMap((credential) => users.register(credential, User.Draft.make(form))),
              Effect.tap(Session.mint),
              Effect.zipRight(ServerResponse.ReturnTo(Routes.dashboard)),
            ),
        }),
      ),
      Effect.catchTags({
        GenerateUrlFailure: ServerResponse.Unexpected,
        InvalidState: ServerResponse.Unexpected,
        CredentialAlreadyInUse: () => ServerResponse.FormRootError("Those credentials are already in use"),
      }),
    );
  }),
);
