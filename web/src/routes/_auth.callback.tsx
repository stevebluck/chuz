import { Users } from "@chuz/core";
import { Effect, Match, S } from "@chuz/prelude";
import { useLoaderData } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthContent } from "src/auth/AuthContent";
import { LoginForm } from "src/auth/LoginForm";
import * as Remix from "src/server/Remix";
import * as ServerRequest from "src/server/ServerRequest";
import * as ServerResponse from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Code, Intent, OAuth, StateFromString } from "src/server/oauth/OAuth";

const SearchParams = S.Struct({
  code: Code,
  state: S.encodedSchema(StateFromString),
});

export const loader = Remix.unwrapLoader(
  Effect.gen(function* () {
    const oauth = yield* OAuth;
    const users = yield* Users;

    return Session.guest.pipe(
      Effect.mapError(() => ServerResponse.redirect(Routes.login)),
      Effect.zipRight(ServerRequest.searchParams(SearchParams)),
      Effect.flatMap((search) => oauth.getCredential(search.state, search.code)),
      Effect.flatMap(({ credential, user, state }) =>
        Match.value(state.intent).pipe(
          Match.when(Intent.Login, () => users.authenticate(credential)),
          Match.when(Intent.Register, () => users.register(credential, user)),
          Match.exhaustive,
        ),
      ),
      Effect.flatMap(Session.mint),
      Effect.zipRight(ServerResponse.returnTo(Routes.dashboard)),
    );
  }),
);

export default function AuthCallbackPage() {
  const result = useLoaderData();

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
