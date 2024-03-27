import { EmailPassword, Password, User } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import * as S from "@chuz/prelude/Schema";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-content";
import { RegisterForm } from "src/auth/register-form";
import { useActionData } from "src/hooks/useActionData";
import { Session, Users, ServerResponse } from "src/server";
import { PasswordHasher } from "src/server/Passwords";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";

const RegisterFormFields = S.struct({
  email: User.Email,
  password: Password.Strong,
  firstName: S.optionalTextInput(User.FirstName),
  lastName: S.optionalTextInput(User.LastName),
  optInMarketing: S.fromCheckboxInput(User.OptInMarketing),
});

export const action = Remix.action(
  ServerRequest.formData(RegisterFormFields).pipe(
    Effect.bind("hashed", ({ password }) => PasswordHasher.hash(password)),
    Effect.flatMap(({ email, hashed, firstName, lastName, optInMarketing }) =>
      Users.register({
        credentials: new EmailPassword.Secure({ email, password: hashed }),
        firstName,
        lastName,
        optInMarketing,
      }),
    ),
    Effect.flatMap(Session.mint),
    Effect.zipRight(ServerResponse.Redirect(Routes.myAccount)),
    Effect.catchTags({
      ParseError: ServerResponse.FormError,
      EmailAlreadyInUse: ServerResponse.BadRequest,
    }),
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
