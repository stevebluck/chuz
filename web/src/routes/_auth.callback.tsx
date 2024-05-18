import { Users } from "@chuz/core";
import { Effect, Match, S } from "@chuz/prelude";
import { Routes } from "src/Routes";
import { AuthContent } from "src/components/auth/AuthContent";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
import { ServerResponse } from "src/server/ServerResponse";
import { Session } from "src/server/Session";
import { Code, Intent, OAuth, StateFromString } from "src/server/oauth/OAuth";

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
      Effect.flatMap(({ credential, user, state }) =>
        Match.value(state.intent).pipe(
          // TODO: should redirect to link/
          Match.when(Intent.Login, () => users.authenticate(credential)),
          Match.when(Intent.Register, () =>
            Effect.orElse(users.register(credential, user), () => users.authenticate(credential)),
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
        SearchParamsError: () => Effect.succeed(ServerResponse.Ok("That's an inalid URL.")),
      }),
    );
  }),
);

export default function AuthCallbackPage() {
  return (
    <AuthContent
      to={Routes.register}
      toLabel="Create an account"
      separatorText="or login with"
      socialButtonsAction={Routes.login}
      title="Sign in to your account"
      description="Lets get back to learning!"
    >
      Callback page
    </AuthContent>
  );
}
