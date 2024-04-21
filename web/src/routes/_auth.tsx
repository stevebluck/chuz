import { Credential } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { AuthLayout } from "src/auth/AuthLayout";
import { Http, Session } from "src/server";
import * as Remix from "src/server/Remix";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

const SearchParams = S.struct({
  _tag: Credential.SocialProvider,
  code: Auth.Code,
  state: Auth.State,
});

export const loader = Remix.loader(
  Session.guest.pipe(
    Effect.flatMap(() => AppCookies.authState),
    Effect.flatMap((stateCookie) =>
      Effect.all([stateCookie.read, Http.request.searchParams(SearchParams)]).pipe(
        Effect.filterOrFail(
          ([state, search]) => Auth.stateEquals(state, search.state),
          () => new Auth.StateDoesNotMatch(),
        ),
        Effect.map(([, search]) => search),
        Effect.flatMap(SocialAuth.exchangeCodeForSession),
        Effect.flatMap(Session.mint),
        Effect.flatMap(() => Http.response.redirectToAccount),
        Effect.catchTags({
          CookieNotPresent: () => Http.response.ok(),
          SearchParamsError: () => Http.response.ok(),
          EmailAlreadyInUse: Http.response.badRequest,
          CredentialNotRecognised: Http.response.badRequest,
          ExchangeCodeError: () => Http.response.exception,
          StateDoesNotMatch: () => Http.response.exception,
        }),
        Effect.flatMap(stateCookie.remove),
      ),
    ),
    Effect.catchTag("AlreadyAuthenticated", () => Http.response.redirectToAccount),
  ),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
