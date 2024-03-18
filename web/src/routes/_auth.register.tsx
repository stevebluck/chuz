import { Credentials, Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { useActionData } from "@remix-run/react";
import { Effect, Option } from "effect";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/auth-layout";
import { RegisterForm } from "src/auth/register-form";
import { FormCheckbox } from "src/schemas/form";
import { Passwords, Users } from "src/server/App";
import { Redirect, ValidationError } from "src/server/Response";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

const RegistrationForm = S.struct({
  email: Email.schema,
  password: Password.Strong.schema,
  firstName: S.optional(User.FirstName.schema),
  lastName: S.optional(User.LastName.schema),
  optInMarketing: S.compose(FormCheckbox, User.OptInMarketing.schema),
});

export const action = Runtime.formDataAction("Auth.register", RegistrationForm, (registration) =>
  Passwords.hash(registration.password).pipe(
    Effect.map((password) => Credentials.Secure.make({ email: registration.email, password })),
    Effect.flatMap((credentials) =>
      Users.register({
        credentials,
        firstName: Option.fromNullable(registration.firstName),
        lastName: Option.fromNullable(registration.lastName),
        optInMarketing: registration.optInMarketing,
      }),
    ),
    Effect.flatMap(Sessions.mint),
    Effect.zipRight(Redirect.make(Routes.myAccount)),
    Effect.asUnit,
    Effect.catchTag("EmailAlreadyInUse", () => ValidationError.make({ email: ["Email already in use"] })),
  ),
);

export default function RegisterPage() {
  const result = useActionData<typeof action>();

  return (
    <AuthContent to={Routes.login} toLabel="Login" title="Create an account" description="Lets get learning!">
      <RegisterForm error={result?.error || {}} />
    </AuthContent>
  );
}
