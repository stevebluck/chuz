import { Passwords, Users } from "@chuz/core";
import { Credential, Email, Password, User } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { useActionData } from "@remix-run/react";
import { fromCheckboxInput, optionalTextInput } from "src/FormSchema";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { RegisterForm } from "src/auth/RegisterForm";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import * as ServerResponse from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Intent } from "src/server/internals/oauth";
import * as OAuth from "src/server/oauth/OAuth";

type RegisterFormFields = S.Schema.Type<typeof RegisterFormFields>;
const RegisterFormFields = S.Union(
  S.Struct({
    _tag: S.Literal(Credential.Tag.EmailPassword),
    password: Password.Strong,
    email: Email,
    firstName: optionalTextInput(User.FirstName),
    lastName: optionalTextInput(User.LastName),
    optInMarketing: fromCheckboxInput(User.OptInMarketing),
  }),
  S.Struct({ _tag: S.Literal(Credential.Tag.Google) }),
  S.Struct({ _tag: S.Literal(Credential.Tag.Apple) }),
);

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const oauth = yield* OAuth.OAuth;
    const passwords = yield* Passwords;

    const matchForm = Match.typeTags<RegisterFormFields>();

    return Session.guest.pipe(
      Effect.mapError(() => ServerResponse.redirect(Routes.dashboard)),
      Effect.zipRight(ServerRequest.formData(RegisterFormFields)),
      Effect.flatMap(
        matchForm({
          Google: () => oauth.generateUrl("Google", Intent.Register),
          Apple: () => oauth.generateUrl("Apple", Intent.Register),
          EmailPassword: (form) =>
            passwords.hash(form.password).pipe(
              Effect.map((password) => Credential.Secure.EmailPassword({ email: form.email, password })),
              Effect.flatMap((credential) => users.register(credential, User.Draft.make(form))),
              Effect.flatMap((session) => Session.mint(session)),
              Effect.flatMap(() => ServerResponse.returnTo(Routes.dashboard)),
            ),
        }),
      ),
      Effect.catchAll(ServerResponse.badRequest),
    );
  }),
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
