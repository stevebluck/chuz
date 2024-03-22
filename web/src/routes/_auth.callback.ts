import * as S from "@effect/schema/Schema";
import { Effect } from "effect";
import { Routes } from "src/Routes";
import { Users, App, Sessions, Redirect } from "src/server";
import { OAuth } from "src/server/OAuth";

const SearchParams = S.struct({
  code: S.string,
  provider: S.literal("google"),
});

export const loader = App.loaderSearchParams("Auth.callback", SearchParams, ({ code, provider }) =>
  Effect.gen(function* (_) {
    const credential = yield* _(OAuth.getCredential({ code, _tag: provider }));
    const session = yield* _(Users.authenticate(credential), Effect.orDie);

    yield* _(Sessions.mint(session));

    return yield* _(Redirect.make(Routes.myAccount));
  }),
);
