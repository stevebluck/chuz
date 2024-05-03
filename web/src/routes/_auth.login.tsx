import { Users } from "@chuz/core";
import { Credential, Email, Password } from "@chuz/domain";
import { Effect, Match, S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import { useActionData } from "src/hooks/useActionData";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import * as ServerResponse from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Intent } from "src/server/internals/oauth";
import { OAuth } from "src/server/oauth/OAuth";

type LoginFormFields = S.Schema.Type<typeof LoginFormFields>;
const LoginFormFields = S.Union(
  S.Struct({
    _tag: S.Literal(Credential.Tag.EmailPassword),
    email: Email,
    password: Password.Plaintext,
  }),
  S.Struct({ _tag: S.Literal(Credential.Tag.Google) }),
  S.Struct({ _tag: S.Literal(Credential.Tag.Apple) }),
);

export const action = Remix.unwrapAction(
  Effect.gen(function* () {
    const users = yield* Users;
    const oauth = yield* OAuth;

    const matchForm = Match.typeTags<LoginFormFields>();

    return Session.guest.pipe(
      Effect.mapError(() => ServerResponse.redirect(Routes.dashboard)),
      Effect.zipRight(ServerRequest.formData(LoginFormFields)),
      Effect.flatMap(
        matchForm({
          Google: () => oauth.generateUrl("Google", Intent.Register),
          Apple: () => oauth.generateUrl("Apple", Intent.Register),
          EmailPassword: (credential) =>
            users.authenticate(credential).pipe(
              Effect.flatMap((session) => Session.mint(session)),
              Effect.zipRight(ServerResponse.returnTo(Routes.dashboard)),
            ),
        }),
      ),
      Effect.catchAll(ServerResponse.badRequest),
    );
  }),
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
