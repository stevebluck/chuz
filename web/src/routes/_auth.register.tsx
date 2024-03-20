import { Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { useActionData } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { RegisterForm } from "src/auth/register-form";
import { fromCheckboxInput, optionFromEmptyString } from "src/schemas/form";
import { Users } from "src/server/App";
import { Redirect, ValidationError } from "src/server/Response";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

const RegistrationForm = S.struct({
  email: Email.schema,
  password: Password.Strong.schema,
  firstName: optionFromEmptyString(User.FirstName.schema),
  lastName: optionFromEmptyString(User.LastName.schema),
  optInMarketing: fromCheckboxInput(User.OptInMarketing.schema),
});

export const action = Runtime.formDataAction(
  "Auth.register",
  RegistrationForm,
  ({ email, firstName, lastName, optInMarketing, password }) =>
    Users.register({ credentials: { email, password }, firstName, lastName, optInMarketing }).pipe(
      Effect.flatMap(Sessions.mint),
      Effect.zipRight(Redirect.make(Routes.myAccount)),
      Effect.catchTag("EmailAlreadyInUse", () => ValidationError.make({ email: ["Email already in use"] })),
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
