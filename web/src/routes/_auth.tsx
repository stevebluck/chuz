import { OAuth } from "@chuz/domain";
import { Effect } from "@chuz/prelude";
import { S } from "@chuz/prelude";
import { Outlet } from "@remix-run/react";
import { Users } from "core/index";
import { Routes } from "src/Routes";
import { AuthLayout } from "src/auth/AuthLayout";
import * as Remix from "src/server/Remix";
import { Cookies, Http, Session } from "src/server/prelude";

const SearchParams = S.Struct({
  code: OAuth.Code,
  state: S.encodedSchema(OAuth.StateFromString),
});

export const loader = Remix.loader(
  Effect.gen(function* () {
    yield* Session.guest.pipe(Effect.mapError(() => Http.response.redirect(Routes.login)));

    const users = yield* Users;
    const cookie = yield* Cookies.AuthState;
    const stateCookieValue = yield* cookie.read;

    const search = yield* Http.request.searchParams(SearchParams);
    const state = yield* OAuth.State.fromString(search.state);
    const validatedState = yield* OAuth.State.compare(state, stateCookieValue);

    const session = yield* users.exchangeAuthCodeForSession(search.code, validatedState);

    yield* Session.mint(session);

    return yield* Http.response.returnTo(Routes.dashboard).pipe(Effect.flatMap(cookie.remove));
  }),
);

export default function AuthPage() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}
