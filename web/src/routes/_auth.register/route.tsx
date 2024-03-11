import { Capabilities, Sessions } from "@chuz/core";
import { Credentials, Email, Password, User } from "@chuz/domain";
import * as S from "@effect/schema/Schema";
import { useActionData } from "@remix-run/react";
import { Passwords } from "core/auth/Passwords";
import { Effect } from "effect";
import { Redirect } from "src/Redirect";
import { RemixServer } from "src/Remix.server";
import { Routes } from "src/Routes";
import { Register } from "src/auth/register";

const RegistrationForm = S.union(
  S.struct({
    email: Email.schema,
    password: Password.Strong.schema,
    firstName: User.FirstName.schema,
    lastName: User.LastName.schema,
    optInMarketing: S.literal("on"),
  }),
  S.struct({
    email: Email.schema,
    password: Password.Strong.schema,
    firstName: User.FirstName.schema,
    lastName: User.LastName.schema,
  }),
);

export const action = RemixServer.action(RegistrationForm, (registration) => {
  console.log("hit???");
  return Effect.flatMap(Capabilities, ({ users }) =>
    Passwords.hash(registration.password).pipe(
      Effect.map((password) => Credentials.Secure.make({ email: registration.email, password })),
      Effect.flatMap((credentials) =>
        users.register({
          credentials,
          firstName: registration.firstName,
          lastName: registration.lastName,
          optInMarketing: User.OptInMarketing.unsafeFrom("optInMarketing" in registration ? true : false),
        }),
      ),
      Effect.flatMap((session) => Sessions.pipe(Effect.flatMap((sessions) => sessions.mint(session)))),
      Effect.flatMap(() => Redirect.make(Routes.myAccount)),
      Effect.catchTags({
        EmailAlreadyInUse: () => Effect.succeed({ error: "Email already in use" }),
      }),
    ),
  );
});

export default function RegisterPage() {
  const result = useActionData<typeof action>();

  return <Register data={result} />;
}
