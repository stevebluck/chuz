import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { App, Sessions, Redirect } from "src/server";
import { OAuth } from "src/server/OAuth";

const SearchParams = S.struct({
  code: S.string,
  provider: S.literal("google"),
});

export const loader = App.loaderSearchParams("Auth.callback", SearchParams, ({ code, provider }) =>
  OAuth.exchangeCodeForSession({ code, _tag: provider }).pipe(
    Effect.tap((session) => Sessions.mint(session)),
    Effect.andThen(Redirect.make(Routes.myAccount)),
    Effect.catchTags({
      CredentialsNotRecognised: () => Redirect.make(Routes.login),
      EmailAlreadyInUse: () => Redirect.make(Routes.login),
    }),
  ),
);
