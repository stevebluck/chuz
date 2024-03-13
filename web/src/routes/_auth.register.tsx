import { Credentials, Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { useActionData } from "@remix-run/react";
import { Passwords } from "core/auth/Passwords";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Register } from "src/auth/register";
import { FormCheckbox } from "src/schemas/form";
import { Users } from "src/server/App";
import { Redirect } from "src/server/Redirect";
import { ValidationError } from "src/server/Remix";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";

const RegistrationForm = S.struct({
  email: Email.schema,
  password: Password.Strong.schema,
  firstName: User.FirstName.schema,
  lastName: User.LastName.schema,
  optInMarketing: S.compose(FormCheckbox, User.OptInMarketing.schema),
}).pipe(S.identifier("RegistrationForm"));

export const action = Runtime.formDataAction("Register", RegistrationForm, (registration) =>
  Passwords.hash(registration.password).pipe(
    Effect.map((password) => Credentials.Secure.make({ email: registration.email, password })),
    Effect.flatMap((credentials) =>
      Users.register({
        credentials,
        firstName: registration.firstName,
        lastName: registration.lastName,
        optInMarketing: registration.optInMarketing,
      }),
    ),
    Effect.flatMap(Sessions.mint),
    Effect.zipRight(Redirect.make(Routes.myAccount)),
    Effect.asUnit,
    Effect.catchTag("EmailAlreadyInUse", () =>
      Effect.succeed(ValidationError({ error: { email: ["Email already in use"] } })),
    ),
  ),
);

export default function RegisterPage() {
  const result = useActionData<typeof action>();

  return <Register error={result ? result.error : {}} />;
}
