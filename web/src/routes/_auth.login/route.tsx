import { Capabilities, Sessions } from "@chuz/core";
import { Credentials } from "@chuz/domain";
import { useActionData } from "@remix-run/react";
import { Effect } from "effect";
import { RemixServer } from "web/Remix.server";
import { Login } from "web/auth/login";

export const action = RemixServer.action(Credentials.Plain, (credentials) =>
  Capabilities.pipe(
    Effect.flatMap(({ users }) => users.authenticate(credentials)),
    Effect.flatMap((session) => Sessions.pipe(Effect.flatMap((sessions) => sessions.mint(session)))),
    Effect.asUnit,
    Effect.catchTags({
      CredentialsNotRecognised: () => Effect.succeed({ error: "Credentials not recognised" }),
    }),
  ),
);

export default function LoginPage() {
  const result = useActionData<typeof action>();

  return <Login data={result} />;
}
