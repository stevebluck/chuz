import { useLoaderData } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthContent } from "src/components/auth/AuthContent";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Code, Intent, OAuth, StateFromString } from "src/server/oauth/OAuth";
import { Users } from "@chuz/core";
import { Effect, Match, S } from "@chuz/prelude";

export const loader = Remix.unwrapLoader(
  Effect.gen(function* () {
    const oauth = yield* OAuth;
    const users = yield* Users;

    const SearchParams = S.Struct({
      code: Code,
      state: S.encodedSchema(StateFromString),
    });

    return Session.guest.pipe(
      Effect.mapError(() => ServerResponse.Redirect(Routes.login)),
      Effect.zipRight(ServerRequest.searchParams(SearchParams)),
      Effect.flatMap((search) => oauth.getCredential(search.state, search.code)),
      Effect.flatMap((result) =>
        Match.value(result.state.intent).pipe(
          // TODO: should redirect to link/
          Match.when(Intent.Login, () => users.authenticate(result.credential)),
          Match.when(Intent.Register, () =>
            users
              .register(result.credential, result.firstName, result.lastName, result.optInMarketing)
              .pipe(Effect.orElse(() => users.authenticate(result.credential))),
          ),
          Match.exhaustive,
        ),
      ),
      Effect.flatMap(Session.mint),
      Effect.zipRight(ServerResponse.ReturnTo(Routes.dashboard)),
      Effect.catchTags({
        CredentialNotRecognised: () =>
          Effect.succeed(ServerResponse.Ok("We could not find a user with those credentials")),
        InvalidCode: () => Effect.succeed(ServerResponse.Ok("We could not verify your identity. Please try again.")),
        InvalidState: () => Effect.succeed(ServerResponse.Ok("We could not verify your identity. Please try again.")),
        SearchParamsError: () => Effect.succeed(ServerResponse.Ok("That's an invalid URL.")),
      }),
    );
  }),
);

export default function AuthCallbackPage() {
  const data = useLoaderData<typeof loader>();
  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      separatorText="or login with"
      socialButtonsAction={Routes.login}
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      <div>{data}</div>
      Callback page
    </AuthContent>
  );
}
