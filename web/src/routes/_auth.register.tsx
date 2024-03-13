import { Capabilities, Sessions } from "@chuz/core";
import { Credentials, Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { ActionFunctionArgs } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { Passwords } from "core/auth/Passwords";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Register } from "src/auth/register";
import { Redirect } from "src/server/Redirect";
import { RemixServer } from "src/server/Remix.server";

export const action = (args: ActionFunctionArgs) => {
  const Checkbox = S.transform(
    S.orUndefined(S.literal("on")),
    S.boolean,
    (a) => a === "on",
    (a) => (a ? "on" : undefined),
  );

  const RegistrationForm = S.struct({
    email: Email.schema,
    password: Password.Strong.schema,
    firstName: User.FirstName.schema,
    lastName: User.LastName.schema,
    // optInMarketing: Checkbox.pipe(S.compose(User.OptInMarketing.schema)),
  });

  return RemixServer.formDataAction("Register", RegistrationForm, (registration) =>
    Effect.flatMap(Capabilities, ({ users }) =>
      Passwords.hash(registration.password).pipe(
        Effect.map((password) => Credentials.Secure.make({ email: registration.email, password })),
        Effect.flatMap((credentials) =>
          users.register({
            credentials,
            firstName: registration.firstName,
            lastName: registration.lastName,
            optInMarketing: false as User.OptInMarketing,
          }),
        ),
        Effect.flatMap((session) => Sessions.pipe(Effect.flatMap((sessions) => sessions.mint(session)))),
        Effect.flatMap(() => Redirect.make(Routes.myAccount)),
        Effect.catchTags({
          EmailAlreadyInUse: () => Effect.succeed({ error: "Email already in use" }),
        }),
      ),
    ),
  )(args);
};

export default function RegisterPage() {
  const result = useActionData<typeof action>();

  return <Register data={result} />;
}
