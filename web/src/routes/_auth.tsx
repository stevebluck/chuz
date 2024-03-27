import * as S from "@effect/schema/Schema";
import { Outlet } from "@remix-run/react";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/auth-layout";
import { ServerResponse, Session } from "src/server";
import { Remix } from "src/server/Remix";
import { ServerRequest } from "src/server/ServerRequest";
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
      Effect.all([stateCookie.read, ServerRequest.searchParams(SearchParams)]).pipe(
        Effect.filterOrFail(
          ([state, search]) => Auth.stateEquals(state, search.state),
          () => new Auth.StateDoesNotMatch(),
        ),
        Effect.map(([, search]) => search),
        Effect.flatMap(SocialAuth.exchangeCodeForSession),
        Effect.flatMap(Session.mint),
        Effect.flatMap(() => ServerResponse.Redirect(Routes.myAccount)),
        Effect.catchTags({
          CookieNotPresent: ServerResponse.Unit,
          SearchParamsError: ServerResponse.Unit,
          EmailAlreadyInUse: ServerResponse.BadRequest,
          CredentialsNotRecognised: ServerResponse.BadRequest,
          ExchangeCodeError: () => ServerResponse.ServerError("Identity provider issue"),
          StateDoesNotMatch: () => ServerResponse.ServerError("State does not match"),
        }),
        Effect.flatMap(stateCookie.remove),
      ),
    ),
    Effect.catchTag("AlreadyAuthenticated", () => ServerResponse.Redirect(Routes.myAccount)),
  ),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
