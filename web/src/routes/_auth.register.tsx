import { Credential, Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { useActionData } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { RegisterForm } from "src/auth/register-form";
import { fromCheckboxInput, optionFromEmptyString } from "src/schemas/form";
import { Session, Users, ServerResponse } from "src/server";
import { PasswordHasher } from "src/server/Passwords";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";

const RegistrationForm = S.struct({
  email: Email.schema,
  password: Password.Strong.schema,
  firstName: optionFromEmptyString(User.FirstName.schema),
  lastName: optionFromEmptyString(User.LastName.schema),
  optInMarketing: fromCheckboxInput(User.OptInMarketing.schema),
});

export const action = Remix.action(
  ServerRequest.formData(RegistrationForm).pipe(
    Effect.flatMap(({ email, password, ...registration }) =>
      PasswordHasher.hash(password).pipe(
        Effect.map((hashed) => ({
          credentials: new Credential.EmailPassword.Secure({ email, password: hashed }),
          firstName: registration.firstName,
          lastName: registration.lastName,
          optInMarketing: registration.optInMarketing,
        })),
      ),
    ),
    Effect.flatMap(Users.register),
    Effect.flatMap(Session.mint),
    Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
    Effect.catchTags({
      FormDataError: ({ error }) => ServerResponse.ValidationError(error),
      EmailAlreadyInUse: () => ServerResponse.ValidationError({ email: ["Email already in use"] }),
    }),
  ),
);

export default function RegisterPage() {
  const result = useActionData<typeof action>();

  return (
    <AuthContent to={Routes.login} toLabel="Login" title="Create an account" description="Lets get learning!">
      <RegisterForm error={{}} />
    </AuthContent>
  );
}
