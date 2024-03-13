import { Credentials } from "@chuz/domain";
import { useActionData } from "@remix-run/react";
import { Effect } from "effect";
import { Users } from "src/server/App";
import { Runtime } from "src/server/Runtime.server";
import { Sessions } from "src/server/Sessions";
import { Login } from "web/auth/login";

export const action = Runtime.formDataAction("Login", Credentials.Plain, (credentials) =>
  Users.authenticate(credentials).pipe(
    Effect.flatMap(Sessions.mint),
    Effect.catchTag("CredentialsNotRecognised", () => Effect.succeed({ error: "Credentials not recognised" })),
  ),
);

export default function LoginPage() {
  const result = useActionData<typeof action>();

  return <Login data={result} />;
}
