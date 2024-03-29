import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/AuthLayout";
import { Http, Session } from "src/server";
import * as Remix from "src/server/Remix";
import * as Auth from "src/server/auth/Auth";
import { SocialAuth } from "src/server/auth/SocialAuth";
import { AppCookies } from "src/server/cookies/AppCookies";

const SearchParams = S.struct({
  _tag: Auth.ProviderName,
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
        Effect.flatMap(() => Http.response.redirect(Routes.myAccount)),
        Effect.catchTags({
          CookieNotPresent: () => Http.response.unit,
          SearchParamsError: () => Http.response.unit,
          EmailAlreadyInUse: Http.response.badRequest,
          CredentialsNotRecognised: Http.response.badRequest,
          ExchangeCodeError: Http.response.serverError,
          StateDoesNotMatch: Http.response.serverError,
        }),
        Effect.flatMap(stateCookie.remove),
      ),
    ),
    Effect.catchTag("AlreadyAuthenticated", () => Http.response.redirect(Routes.myAccount)),
  ),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
